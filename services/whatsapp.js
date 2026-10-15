/**
 * services/whatsapp.js
 * Servicio singleton de WhatsApp usando Baileys.
 * Se importa como CJS pero usa dynamic import() internamente para cargar Baileys (ESM).
 */

const path = require('path');
const fs   = require('fs');
const { EventEmitter } = require('events');
const QRCode = require('qrcode');

const AUTH_DIR        = path.join(__dirname, '..', 'data', 'wa-auth');
const CONFIG_FILE     = path.join(__dirname, '..', 'data', 'whatsapp-config.json');
const CHATS_FILE      = path.join(__dirname, '..', 'data', 'wa-chats.json');
const MENU_IMAGES_DIR = path.join(__dirname, '..', 'data', 'menu-images');
const MAX_MSGS_PER_CHAT = 200;
const BOT_COOLDOWN_MS   = 10 * 60 * 1000; // No repetir auto-respuestas a la misma persona en <10 min

// ─── Logger silencioso para Baileys ─────────────────────────────────────────
const baileysLogger = {
  level : 'silent',
  trace : () => {},
  debug : () => {},
  info  : () => {},
  warn  : (obj) => { if (obj && obj.err) console.warn('[WA warn]', obj.err?.message || obj); },
  error : (obj) => { console.error('[WA error]', obj?.err?.message || obj); },
  fatal : (obj) => { console.error('[WA fatal]', obj?.err?.message || obj); },
  child : function()  { return this; },
};

// ─── Clase principal ────────────────────────────────────────────────────────
class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.sock          = null;
    this.qrRaw         = null;
    this.qrDataUrl     = null;
    this.connected     = false;
    this.phoneNumber   = '';
    this._reconnTimer  = null;
    this._initialized  = false;
    this._connecting   = false;
    this._config       = this._loadConfig();
    this._chats        = this._loadChats();      // { jid: { phone, name, messages:[], unread, lastTs, botPaused, lastBotAt:{intent:ts} } }
    this._chatsDirty   = false;
    this._chatsSaveTimer = null;
  }

  // ── Config (grupos seleccionados) ────────────────────────────────────────
  _loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        if (!Array.isArray(cfg.contacts)) cfg.contacts = [];
        return cfg;
      }
    } catch (_) {}
    return { groupId: null, groupName: null, deliveryGroupId: null, deliveryGroupName: null, contacts: [] };
  }

  /**
   * @param {string} groupId
   * @param {string} groupName
   * @param {'orders'|'delivery'} [type='orders'] — 'orders' = cocina, 'delivery' = repartidores
   */
  saveConfig(groupId, groupName, type = 'orders') {
    if (type === 'delivery') {
      this._config = { ...this._config, deliveryGroupId: groupId, deliveryGroupName: groupName };
    } else {
      this._config = { ...this._config, groupId, groupName };
    }
    this._saveConfigFile();
  }

  getConfig()   { return this._config; }
  getStatus() {
    return {
      connected   : this.connected,
      hasQr       : !!this.qrDataUrl,
      qrDataUrl   : this.qrDataUrl,
      phoneNumber : this.phoneNumber,
      config      : this._config,
    };
  }

  // ── Inicializar (llamar una sola vez al arrancar el server) ─────────────
  async init() {
    if (this._initialized) return;
    this._initialized = true;
    await this._connect();
  }

  // ── Destruir socket activo ──────────────────────────────────────────────
  _destroySock() {
    if (!this.sock) return;
    try { this.sock.ws?.close(); } catch (_) {}
    try { this.sock.ev?.removeAllListeners(); } catch (_) {}
    this.sock = null;
  }

  // ── Conexión / reconexión ───────────────────────────────────────────────
  async _connect() {
    // Evitar solapamiento de llamadas concurrentes
    if (this._connecting) return;
    this._connecting = true;

    if (this._reconnTimer) { clearTimeout(this._reconnTimer); this._reconnTimer = null; }
    this._destroySock();

    try {
      const {
        makeWASocket,
        useMultiFileAuthState,
        fetchLatestBaileysVersion,
        DisconnectReason,
        Browsers,
      } = await import('@whiskeysockets/baileys');

      fs.mkdirSync(AUTH_DIR, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version }          = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth                     : state,
        browser                  : Browsers.ubuntu('Desktop'),
        logger                   : baileysLogger,
        syncFullHistory          : true,
        markOnlineOnConnect      : false,
        connectTimeoutMs         : 60_000,
        keepAliveIntervalMs      : 30_000,
        retryRequestDelayMs      : 500,
        defaultQueryTimeoutMs    : 60_000,
        generateHighQualityLinkPreview: false,
        getMessage               : async () => undefined,
      });

      this._connecting = false;

      // Guardar credenciales cuando cambian
      this.sock.ev.on('creds.update', saveCreds);

      // Mensajes entrantes (chats individuales) — ignora grupos y status
      this.sock.ev.on('messages.upsert', async (upsert) => {
        try {
          if (!upsert || !Array.isArray(upsert.messages)) return;
          console.log(`[WA chat] messages.upsert type=${upsert.type} count=${upsert.messages.length}`);
          for (const m of upsert.messages) {
            const jid = m.key?.remoteJid || '';
            const isInd = typeof jid === 'string' && jid.endsWith('@s.whatsapp.net');
            console.log(`[WA chat] msg from=${jid} fromMe=${m.key?.fromMe} ind=${isInd} hasMsg=${!!m.message}`);
            this._handleIncomingMessage(m).catch(err => {
              console.error('[WA] Error procesando mensaje:', err.message);
            });
          }
        } catch (e) {
          console.error('[WA] messages.upsert error:', e.message);
        }
      });

      // Historial de chats sincronizado al conectar (últimas conversaciones del teléfono)
      this.sock.ev.on('messaging-history.set', ({ chats, messages, contacts, isLatest }) => {
        try {
          // Contactos: aplicar nombres a los chats existentes
          if (Array.isArray(contacts) && contacts.length) {
            this._applyContacts(contacts);
            console.log(`[WA chat] history contacts: ${contacts.length} contactos sincronizados`);
          }
          const indMsgs = Array.isArray(messages) ? messages.filter(m => this._isIndividualJid(m.key?.remoteJid) && m.message) : [];
          console.log(`[WA chat] messaging-history.set chats=${chats?.length || 0} msgs=${messages?.length || 0} (ind=${indMsgs.length}) latest=${isLatest}`);
          // Procesar solo chats individuales y limitar a 200 mensajes por sync para no atragantar
          const slice = indMsgs.slice(0, 200);
          for (const m of slice) this._ingestHistoryMessage(m);
          if (Array.isArray(chats)) {
            for (const c of chats) {
              if (!this._isIndividualJid(c.id)) continue;
              const chat = this._ensureChat(c.id, c.name || '');
              if (c.name && this._isBetterName(chat.name, chat.phone, c.name)) chat.name = c.name;
              if (c.conversationTimestamp) {
                const ts = Number(c.conversationTimestamp) * 1000;
                if (ts > (chat.lastTs || 0)) chat.lastTs = ts;
              }
            }
            this._scheduleChatsSave();
            this.emit('chat-update', { jid: '*' });
          }
        } catch (e) { console.error('[WA] history.set error:', e.message); }
      });

      // Eventos de contactos (libreta del teléfono)
      this.sock.ev.on('contacts.set',    ({ contacts }) => this._applyContacts(contacts));
      this.sock.ev.on('contacts.upsert', (contacts)    => this._applyContacts(contacts));
      this.sock.ev.on('contacts.update', (contacts)    => this._applyContacts(contacts));

      // Lista inicial de chats (más liviano que history)
      const ingestChatsList = (chats) => {
        if (!Array.isArray(chats)) return;
        let added = 0;
        for (const c of chats) {
          const id = c?.id || c?.jid;
          if (!this._isIndividualJid(id)) continue;
          const chat = this._ensureChat(id, c.name || c.subject || '');
          const cand = c.name || c.subject || '';
          if (cand && this._isBetterName(chat.name, chat.phone, cand)) chat.name = cand;
          if (c.conversationTimestamp) {
            const ts = Number(c.conversationTimestamp) * 1000;
            if (ts > (chat.lastTs || 0)) chat.lastTs = ts;
          }
          added++;
        }
        if (added) {
          console.log(`[WA chat] chats sync: ${added} chats individuales agregados a la lista`);
          this._scheduleChatsSave();
          this.emit('chat-update', { jid: '*' });
        }
      };
      this.sock.ev.on('chats.set',    ({ chats }) => ingestChatsList(chats));
      this.sock.ev.on('chats.upsert', (chats)    => ingestChatsList(chats));

      // Eventos de conexión
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrRaw     = qr;
          this.connected = false;
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
          } catch (_) {
            this.qrDataUrl = null;
          }
          this.emit('qr', this.qrDataUrl);
          console.log('📱 [WhatsApp] Escanea el QR en /notifi.html');
        }

        if (connection === 'open') {
          this.connected = true;
          this.qrRaw     = null;
          this.qrDataUrl = null;
          try {
            const jid = this.sock.user?.id || '';
            this.phoneNumber = jid.split(':')[0].split('@')[0];
          } catch (_) {}
          // Limpiar nombres de chat que quedaron como el propio operador
          try { this._cleanupSelfNamedChats(this.sock.user?.name || ''); } catch (_) {}
          this.emit('connected', { phoneNumber: this.phoneNumber });
          console.log(`✅ [WhatsApp] Conectado como +${this.phoneNumber}`);
        }

        if (connection === 'close') {
          const code      = lastDisconnect?.error?.output?.statusCode;
          const loggedOut = code === DisconnectReason.loggedOut;
          const replaced  = code === DisconnectReason.connectionReplaced;

          this.connected   = false;
          this.phoneNumber = '';
          console.log(`🔌 [WhatsApp] Desconectado. código=${code} loggedOut=${loggedOut} replaced=${replaced}`);

          this._destroySock();

          if (loggedOut) {
            this._clearAuth();
            this.emit('disconnected', { loggedOut: true });
            this._scheduleReconnect(2000);
          } else if (replaced) {
            // Sesión reemplazada por otra instancia — esperar más antes de reconectar
            console.log('⚠️  [WhatsApp] Sesión reemplazada por otro cliente. Reintentando en 15s…');
            this.emit('reconnecting', {});
            this._scheduleReconnect(15_000);
          } else {
            this.emit('reconnecting', {});
            this._scheduleReconnect(5000);
          }
        }
      });

    } catch (err) {
      this._connecting = false;
      console.error('❌ [WhatsApp] Error iniciando servicio:', err.message);
      this._initialized = false;
      this._scheduleReconnect(8000);
    }
  }

  _scheduleReconnect(delay) {
    if (this._reconnTimer) clearTimeout(this._reconnTimer);
    this._reconnTimer = setTimeout(() => {
      this._initialized = true;
      this._connecting  = false;
      this._connect();
    }, delay);
  }

  // ── Cerrar sesión manualmente ───────────────────────────────────────────
  async logout() {
    if (this._reconnTimer) { clearTimeout(this._reconnTimer); this._reconnTimer = null; }
    try { await this.sock?.logout(); } catch (_) {}
    this._destroySock();
    this._clearAuth();
    this.connected    = false;
    this.phoneNumber  = '';
    this.qrRaw        = null;
    this.qrDataUrl    = null;
    this._initialized = false;
    this._connecting  = false;
    this.emit('disconnected', { loggedOut: true });
    console.log('🚪 [WhatsApp] Sesión cerrada. Generando nuevo QR...');
    this._scheduleReconnect(1500);
  }

  _clearAuth() {
    try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
  }

  // ── Obtener grupos del usuario ──────────────────────────────────────────
  async getGroups() {
    if (!this.connected || !this.sock) return [];
    try {
      const all = await this.sock.groupFetchAllParticipating();
      return Object.values(all)
        .map(g => ({
          id    : g.id,
          name  : g.subject || '(sin nombre)',
          count : g.participants?.length || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } catch (e) {
      console.error('[WhatsApp] Error obteniendo grupos:', e.message);
      return [];
    }
  }

  // ── Enviar mensaje al grupo de cocina/pedidos ─────────────────────────
  async sendToGroup(text) {
    if (!this.connected || !this.sock) {
      throw new Error('WhatsApp no está conectado');
    }
    const { groupId, groupName } = this._config;
    if (!groupId)  throw new Error('No hay grupo de cocina configurado. Ve a /notifi.html');
    console.log(`[WA] ► Enviando a Cocina — ${groupName} (${groupId})`);
    try {
      await this.sock.sendMessage(groupId, { text });
      console.log(`[WA] ✅ Mensaje enviado a Cocina — ${groupName}`);
    } catch (err) {
      console.error(`[WA] ❌ Error enviando a Cocina (${groupId}):`, err.message);
      throw err;
    }
  }

  // ── Enviar mensaje al grupo de repartidores ─────────────────────────────
  async sendToDeliveryGroup(text) {
    if (!this.connected || !this.sock) {
      throw new Error('WhatsApp no está conectado');
    }
    const { deliveryGroupId, deliveryGroupName } = this._config;
    if (!deliveryGroupId) throw new Error('No hay grupo de repartidores configurado. Ve a /notifi.html');
    console.log(`[WA] ► Enviando a Repartidores — ${deliveryGroupName} (${deliveryGroupId})`);
    try {
      await this.sock.sendMessage(deliveryGroupId, { text });
      console.log(`[WA] ✅ Mensaje enviado a Repartidores — ${deliveryGroupName}`);
    } catch (err) {
      console.error(`[WA] ❌ Error enviando a Repartidores (${deliveryGroupId}):`, err.message);
      throw err;
    }
  }

  // ── Enviar a un JID arbitrario (para pruebas) ──────────────────────────
  async sendRaw(jid, text) {
    if (!this.connected || !this.sock) throw new Error('WhatsApp no conectado');
    await this.sock.sendMessage(jid, { text });
  }

  // ── Gestión de contactos individuales ─────────────────────────────────
  /**
   * Agrega o actualiza un contacto en la config.
   * @param {{ phone: string, name: string, role: 'kitchen'|'delivery' }} contact
   */
  addContact(contact) {
    const phone = String(contact.phone).replace(/\D/g, '');
    const name  = String(contact.name || phone).slice(0, 100);
    const role  = contact.role === 'delivery' ? 'delivery' : 'kitchen';
    if (!phone) throw new Error('Teléfono requerido');

    const contacts = Array.isArray(this._config.contacts) ? [...this._config.contacts] : [];
    // Evitar duplicados por phone+role
    const idx = contacts.findIndex(c => c.phone === phone && c.role === role);
    if (idx >= 0) {
      contacts[idx] = { phone, name, role };
    } else {
      contacts.push({ phone, name, role });
    }
    this._config = { ...this._config, contacts };
    this._saveConfigFile();
  }

  /**
   * Elimina un contacto de la config.
   * @param {string} phone
   * @param {'kitchen'|'delivery'} role
   */
  removeContact(phone, role) {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const contacts = Array.isArray(this._config.contacts) ? this._config.contacts : [];
    this._config = {
      ...this._config,
      contacts: contacts.filter(c => !(c.phone === cleanPhone && c.role === role)),
    };
    this._saveConfigFile();
  }

  /** Devuelve los contactos configurados, opcionalmente filtrados por role */
  getContacts(role) {
    const contacts = Array.isArray(this._config.contacts) ? this._config.contacts : [];
    return role ? contacts.filter(c => c.role === role) : contacts;
  }

  /** Enviar mensaje a todos los contactos con un rol dado */
  async sendToContacts(text, role) {
    if (!this.connected || !this.sock) throw new Error('WhatsApp no está conectado');
    const contacts = this.getContacts(role);
    if (!contacts.length) return [];

    const results = [];
    for (const c of contacts) {
      const jid = `${c.phone}@s.whatsapp.net`;
      try {
        await this.sock.sendMessage(jid, { text });
        console.log(`[WA] ✅ Mensaje enviado a contacto ${c.name} (${c.phone})`);
        results.push({ phone: c.phone, name: c.name, ok: true });
      } catch (err) {
        console.error(`[WA] ❌ Error enviando a contacto ${c.name} (${c.phone}):`, err.message);
        results.push({ phone: c.phone, name: c.name, ok: false, error: err.message });
      }
    }
    return results;
  }

  /** Enviar mensaje directo a un teléfono */
  async sendToPhone(phone, text) {
    if (!this.connected || !this.sock) throw new Error('WhatsApp no conectado');
    let digits = String(phone || '').replace(/\D/g, '');
    // Normalizar para México: si son 10 dígitos, anteponer 52.
    if (digits.length === 10) {
      digits = '52' + digits;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      digits = '52' + digits.slice(1);
    }

    // Probar varios formatos posibles de WhatsApp MX:
    //   - 52 + 10 dígitos (formato actual)
    //   - 521 + 10 dígitos (formato viejo, aún usado por cuentas antiguas)
    const base10 = digits.startsWith('521') ? digits.slice(3)
                  : digits.startsWith('52')  ? digits.slice(2)
                  : digits;
    const candidates = Array.from(new Set([
      '52' + base10,
      '521' + base10,
      digits,
    ]));

    let resolvedJid = null;
    if (typeof this.sock.onWhatsApp === 'function') {
      for (const candidate of candidates) {
        try {
          const result = await this.sock.onWhatsApp(candidate);
          if (Array.isArray(result) && result.length && result[0] && result[0].exists) {
            resolvedJid = result[0].jid || `${candidate}@s.whatsapp.net`;
            console.log(`📡 [WhatsApp] Número ${candidate} existe → JID ${resolvedJid}`);
            break;
          }
        } catch (_) { /* probar siguiente */ }
      }
    }

    const jid = resolvedJid || `${digits}@s.whatsapp.net`;
    console.log(`📤 [WhatsApp] Enviando a ${jid}`);
    try {
      await this.sock.sendMessage(jid, { text });
      console.log(`✅ [WhatsApp] Mensaje enviado a ${jid}`);
    } catch (err) {
      console.error(`❌ [WhatsApp] Error enviando a ${jid}:`, err && err.message);
      throw err;
    }
  }

  _saveConfigFile() {
    try {
      fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this._config, null, 2));
    } catch (e) { console.error('Error guardando config WA:', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ─── CHAT (mensajería individual con UI tipo WhatsApp Web) ─────────────
  // ═══════════════════════════════════════════════════════════════════════

  _loadChats() {
    try {
      if (fs.existsSync(CHATS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
        if (raw && typeof raw === 'object') return raw;
      }
    } catch (e) { console.warn('[WA chats] No se pudo cargar historial:', e.message); }
    return {};
  }

  _scheduleChatsSave() {
    this._chatsDirty = true;
    if (this._chatsSaveTimer) return;
    this._chatsSaveTimer = setTimeout(() => {
      this._chatsSaveTimer = null;
      if (!this._chatsDirty) return;
      this._chatsDirty = false;
      try {
        fs.mkdirSync(path.dirname(CHATS_FILE), { recursive: true });
        fs.writeFileSync(CHATS_FILE, JSON.stringify(this._chats));
      } catch (e) { console.error('[WA chats] Error guardando:', e.message); }
    }, 1500);
  }

  _isIndividualJid(jid) {
    return typeof jid === 'string' && jid.endsWith('@s.whatsapp.net');
  }

  _ensureChat(jid, fallbackName) {
    if (!this._chats[jid]) {
      const phone = jid.split('@')[0].replace(/[^0-9]/g, '');
      this._chats[jid] = {
        jid,
        phone,
        name: fallbackName || phone,
        messages: [],
        unread: 0,
        lastTs: 0,
        botPaused: false,
        lastBotAt: {},
      };
    }
    return this._chats[jid];
  }

  // Si el nombre del chat coincide con el del propio operador (porque se
  // tomó por error del pushName de un mensaje fromMe), reseteamos al teléfono
  // para que se actualice con el nombre real del contacto cuando llegue uno.
  _cleanupSelfNamedChats(selfName) {
    const self = String(selfName || '').trim().toLowerCase();
    if (!self) return;
    let changed = 0;
    for (const c of Object.values(this._chats)) {
      if (c && typeof c.name === 'string' && c.name.trim().toLowerCase() === self) {
        c.name = c.phone;
        changed++;
      }
    }
    if (changed) {
      console.log(`[WA chat] limpieza: ${changed} chats reseteados (nombre era el del operador "${selfName}")`);
      this._scheduleChatsSave();
      this.emit('chat-update', { jid: '*' });
    }
  }

  // ¿El nombre nuevo es mejor que el actual?
  // Mejor = el actual está vacío o es solo el teléfono, y el nuevo es un nombre real.
  _isBetterName(currentName, phone, candidate) {
    const cand = String(candidate || '').trim();
    if (!cand) return false;
    // si el candidato es solo dígitos / igual al teléfono, no es mejor
    const onlyDigits = cand.replace(/[^0-9]/g, '');
    if (onlyDigits && onlyDigits === cand) return false;
    if (cand === phone) return false;
    const curr = String(currentName || '').trim();
    if (!curr) return true;
    if (curr === phone) return true;
    const currOnlyDigits = curr.replace(/[^0-9]/g, '');
    if (currOnlyDigits === curr) return true; // actual es solo números
    return false;
  }

  // Aplica una lista de contactos (de la libreta del teléfono) a los chats
  _applyContacts(contacts) {
    if (!Array.isArray(contacts) || !contacts.length) return;
    let updated = 0;
    for (const c of contacts) {
      const jid = c?.id || c?.jid || '';
      if (!this._isIndividualJid(jid)) continue;
      // Prioridad: name (libreta) > verifiedName (business) > notify (pushName)
      const candidate = c.name || c.verifiedName || c.notify || '';
      if (!candidate) continue;
      const chat = this._ensureChat(jid, '');
      if (this._isBetterName(chat.name, chat.phone, candidate)) {
        chat.name = String(candidate).trim();
        updated++;
      }
    }
    if (updated) {
      console.log(`[WA chat] contactos: ${updated} nombres actualizados desde la libreta`);
      this._scheduleChatsSave();
      this.emit('chat-update', { jid: '*' });
    }
  }

  _pushMessage(chat, msg) {
    // Evitar duplicados por id
    if (msg.id && chat.messages.some(x => x.id === msg.id)) return;
    chat.messages.push(msg);
    chat.messages.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (chat.messages.length > MAX_MSGS_PER_CHAT) {
      chat.messages.splice(0, chat.messages.length - MAX_MSGS_PER_CHAT);
    }
    chat.lastTs = Math.max(chat.lastTs || 0, msg.ts || 0);
    if (!msg.fromMe && !msg._silent) chat.unread = (chat.unread || 0) + 1;
    this._scheduleChatsSave();
    this.emit('chat-update', { jid: chat.jid });
  }

  // Ingesta del historial sincronizado (no dispara bot ni incrementa unread)
  _ingestHistoryMessage(m) {
    const jid = m.key?.remoteJid || '';
    if (!this._isIndividualJid(jid)) return;
    // Saltar mensajes sin contenido útil (protocolo, claves de sync, vacíos)
    const msgObj = m.message || {};
    const isProtocol = !!(msgObj.protocolMessage || msgObj.senderKeyDistributionMessage || msgObj.messageContextInfo && Object.keys(msgObj).length === 1);
    if (isProtocol) return;
    const ts = m.messageTimestamp ? Number(m.messageTimestamp) * 1000 : Date.now();
    const text = this._extractText(msgObj);
    if (!text) return; // sin nada que mostrar, no contaminar la lista
    const isFromMe = !!m.key?.fromMe;
    const pushName = m.pushName || '';
    const chat = this._ensureChat(jid, '');
    // Solo actualizar nombre si viene de un mensaje del CONTACTO (no nuestro)
    if (!isFromMe && pushName && this._isBetterName(chat.name, chat.phone, pushName)) {
      chat.name = pushName;
    }
    const msg = {
      id: m.key?.id || `hist_${ts}_${Math.random().toString(36).slice(2,8)}`,
      ts,
      fromMe: isFromMe,
      type: msgObj.imageMessage ? 'image' : 'text',
      text,
      imageUrl: null, // no descargamos imágenes del historial para evitar bloat
      _silent: true,  // no incrementar unread
    };
    this._pushMessage(chat, msg);
  }

  async _handleIncomingMessage(m) {
    if (!m || !m.message) return;
    const remoteJid = m.key?.remoteJid || '';
    if (!this._isIndividualJid(remoteJid)) return; // solo chats 1-a-1
    const isFromMe = !!m.key.fromMe;

    const ts = (m.messageTimestamp ? Number(m.messageTimestamp) * 1000 : Date.now());
    const pushName = m.pushName || '';
    const text = this._extractText(m.message);
    const imageInfo = isFromMe ? null : await this._maybeDownloadIncomingImage(m);

    const chat = this._ensureChat(remoteJid, pushName);
    // Solo actualizar el nombre desde pushName cuando el mensaje viene del CONTACTO
    if (!isFromMe && pushName && this._isBetterName(chat.name, chat.phone, pushName)) {
      chat.name = pushName;
    }

    const msg = {
      id: m.key?.id || `in_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      ts,
      fromMe: isFromMe,
      type: imageInfo ? 'image' : 'text',
      text: text || '',
      imageUrl: imageInfo?.dataUrl || null,
    };
    this._pushMessage(chat, msg);

    // Auto-bot (solo para mensajes entrantes, no propios)
    if (!isFromMe) {
      try { await this._maybeAutoReply(chat, text); }
      catch (e) { console.error('[WA bot] Error auto-respuesta:', e.message); }
    }
  }

  _extractText(message) {
    if (!message) return '';
    // Texto plano / extendido / captions
    const direct = (
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      message.documentMessage?.caption ||
      message.buttonsResponseMessage?.selectedDisplayText ||
      message.listResponseMessage?.title ||
      message.templateButtonReplyMessage?.selectedDisplayText ||
      ''
    );
    if (direct) return String(direct);
    // Placeholders para mensajes multimedia / especiales (para que la burbuja no quede vacía)
    if (message.imageMessage)        return '📷 Imagen';
    if (message.videoMessage)        return '🎬 Video';
    if (message.audioMessage)        return message.audioMessage.ptt ? '🎤 Nota de voz' : '🎵 Audio';
    if (message.stickerMessage)      return '🏷️ Sticker';
    if (message.documentMessage)     return `📄 ${message.documentMessage.fileName || 'Documento'}`;
    if (message.locationMessage)     return '📍 Ubicación';
    if (message.liveLocationMessage) return '📍 Ubicación en tiempo real';
    if (message.contactMessage)      return `👤 Contacto: ${message.contactMessage.displayName || ''}`.trim();
    if (message.contactsArrayMessage) return '👥 Contactos';
    if (message.reactionMessage)     return `↩️ Reacción ${message.reactionMessage.text || ''}`.trim();
    if (message.pollCreationMessage || message.pollCreationMessageV3) return '📊 Encuesta';
    return '';
  }

  async _maybeDownloadIncomingImage(m) {
    try {
      const img = m.message?.imageMessage;
      if (!img) return null;
      const baileys = await import('@whiskeysockets/baileys');
      const downloadMediaMessage = baileys.downloadMediaMessage;
      if (typeof downloadMediaMessage !== 'function') return null;
      const buf = await downloadMediaMessage(m, 'buffer', {});
      if (!buf) return null;
      const mime = img.mimetype || 'image/jpeg';
      // Limitar tamaño (no guardar fotos enormes en memoria/disco)
      if (buf.length > 1.5 * 1024 * 1024) return { dataUrl: null };
      return { dataUrl: `data:${mime};base64,${buf.toString('base64')}` };
    } catch (e) {
      console.warn('[WA] No se pudo descargar imagen:', e.message);
      return null;
    }
  }

  // ── Auto-bot por palabras clave ────────────────────────────────────────
  _detectIntent(text) {
    const t = String(text || '').toLowerCase();
    if (!t.trim()) return null;

    // Saludo / bienvenida
    if (/\b(hola|buen[oa]s|qué onda|que onda|holi|buenos dias|buenas tardes|buenas noches)\b/i.test(t)) {
      return 'welcome';
    }
    // Menú
    if (/\b(menu|menú|carta|que venden|qué venden|que tienen|qué tienen|hamburguesa|burger|combo|hot ?dog|salchipapa|aros|papas)\b/i.test(t)) {
      return 'menu';
    }
    // Horarios
    if (/\b(horario|horarios|abren|cierran|cierra|abre|cuando abren|hora|abierto|cerrado|atención|atencion|servicio)\b/i.test(t)) {
      return 'hours';
    }
    // Ubicación / dirección
    if (/\b(direccion|dirección|donde están|dónde están|ubicación|ubicacion|donde se ubican|local|sucursal|maps)\b/i.test(t)) {
      return 'location';
    }
    // Página web
    if (/\b(pagina|página|web|online|sitio|link|enlace|pedir en línea|ordenar online|ordenar en linea)\b/i.test(t)) {
      return 'website';
    }
    // Pedido / como ordenar
    if (/\b(pedido|pedir|ordenar|comprar|cómo pido|como pido|domicilio|envio|envío|delivery)\b/i.test(t)) {
      return 'order';
    }
    return null;
  }

  _intentReply(intent) {
    switch (intent) {
      case 'welcome':
        return '¡Hola! 👋 Bienvenid@ a *SR & SRA BURGER* 🍔\n\n¿En qué te puedo ayudar?\n• *Menú* — para ver lo que ofrecemos\n• *Horarios* — horario de atención\n• *Pedir online* — link a nuestra web\n\nUn asesor te responderá en breve.';
      case 'menu':
        return '🍔 *Menú SR & SRA BURGER*\n\nTe comparto las imágenes de nuestro menú 👇\nTambién puedes ver y pedir directo en: *srsburger.com*';
      case 'hours':
        return '🕐 *Horarios de atención*\n\n• Mar–Vie: 6:00 PM – 10:00 PM\n• Sáb–Dom: 4:00 PM – 10:00 PM\n• Lunes: descansamos 🚫\n\nMinatitlán, Veracruz · Coahuila #36, Col. Emiliano Zapata.';
      case 'location':
        return '📍 *Ubicación*\nCoahuila #36, Col. Emiliano Zapata, Minatitlán, Ver.\n\nMaps: https://maps.app.goo.gl/';
      case 'website':
        return '🌐 *Pide online en nuestra web:*\nsrsburger.com\n\nElige tus burgers, paga en línea o efectivo y te lo llevamos a casa 🍔🚚';
      case 'order':
        return '🛵 *Cómo pedir*\n\n1️⃣ Entra a *srsburger.com*\n2️⃣ Elige tus productos y agrégalos al carrito\n3️⃣ Llena tus datos y método de pago\n4️⃣ Confirma el pedido\n\n¡Lo recibes en 25–35 min! 🍔';
      default:
        return null;
    }
  }

  async _maybeAutoReply(chat, text) {
    if (chat.botPaused) return;
    const intent = this._detectIntent(text);
    if (!intent) return;

    // Cooldown por intent (no repetir la misma respuesta dentro de BOT_COOLDOWN_MS)
    const lastAt = (chat.lastBotAt && chat.lastBotAt[intent]) || 0;
    if (Date.now() - lastAt < BOT_COOLDOWN_MS) return;

    const reply = this._intentReply(intent);
    if (!reply) return;

    try {
      await this.sock.sendMessage(chat.jid, { text: reply });
      this._pushMessage(chat, {
        id: `bot_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        ts: Date.now(),
        fromMe: true,
        bot: true,
        type: 'text',
        text: reply,
      });
      chat.lastBotAt = chat.lastBotAt || {};
      chat.lastBotAt[intent] = Date.now();
      this._scheduleChatsSave();

      // Si pidió menú, enviar imágenes del menú
      if (intent === 'menu') {
        const images = this.listMenuImages();
        for (const img of images) {
          try {
            const buf = fs.readFileSync(img.absPath);
            await this.sock.sendMessage(chat.jid, {
              image: buf,
              caption: img.caption || '',
              mimetype: img.mimetype || 'image/jpeg',
            });
            this._pushMessage(chat, {
              id: `bot_img_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
              ts: Date.now(),
              fromMe: true,
              bot: true,
              type: 'image',
              text: img.caption || '',
              imageUrl: `/api/whatsapp/menu-images/${encodeURIComponent(img.filename)}`,
            });
          } catch (e) {
            console.error('[WA bot] Error enviando imagen menú:', e.message);
          }
        }
      }
    } catch (e) {
      console.error('[WA bot] sendMessage error:', e.message);
    }
  }

  // ── API pública para el panel del operador ─────────────────────────────
  listChats(limit = 20) {
    const all = Object.values(this._chats);
    all.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
    return all.slice(0, limit).map(c => {
      const last = c.messages.length ? c.messages[c.messages.length - 1] : null;
      return {
        jid: c.jid,
        phone: c.phone,
        name: c.name,
        unread: c.unread || 0,
        lastTs: c.lastTs || 0,
        botPaused: !!c.botPaused,
        preview: last ? (last.type === 'image' ? '📷 Foto' : (last.text || '')).slice(0, 80) : '',
        lastFromMe: last ? !!last.fromMe : false,
      };
    });
  }

  getChatMessages(jid) {
    const c = this._chats[jid];
    if (!c) return null;
    return {
      jid: c.jid,
      phone: c.phone,
      name: c.name,
      botPaused: !!c.botPaused,
      messages: c.messages.slice(),
    };
  }

  markChatRead(jid) {
    const c = this._chats[jid];
    if (!c) return false;
    c.unread = 0;
    this._scheduleChatsSave();
    this.emit('chat-update', { jid });
    return true;
  }

  setBotPaused(jid, paused) {
    const c = this._chats[jid];
    if (!c) return false;
    c.botPaused = !!paused;
    this._scheduleChatsSave();
    this.emit('chat-update', { jid });
    return true;
  }

  async sendChatText(jid, text) {
    if (!this.connected || !this.sock) throw new Error('WhatsApp no conectado');
    if (!this._isIndividualJid(jid)) throw new Error('JID inválido');
    const trimmed = String(text || '').slice(0, 4000);
    if (!trimmed) throw new Error('Texto vacío');
    await this.sock.sendMessage(jid, { text: trimmed });
    const chat = this._ensureChat(jid);
    this._pushMessage(chat, {
      id: `out_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      ts: Date.now(),
      fromMe: true,
      type: 'text',
      text: trimmed,
    });
    return true;
  }

  async sendChatImage(jid, buffer, mimetype = 'image/jpeg', caption = '') {
    if (!this.connected || !this.sock) throw new Error('WhatsApp no conectado');
    if (!this._isIndividualJid(jid)) throw new Error('JID inválido');
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('Imagen vacía');
    await this.sock.sendMessage(jid, { image: buffer, caption: String(caption || '').slice(0, 1000), mimetype });
    const chat = this._ensureChat(jid);
    const dataUrl = buffer.length < 1.5 * 1024 * 1024
      ? `data:${mimetype};base64,${buffer.toString('base64')}`
      : null;
    this._pushMessage(chat, {
      id: `out_img_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      ts: Date.now(),
      fromMe: true,
      type: 'image',
      text: caption || '',
      imageUrl: dataUrl,
    });
    return true;
  }

  // ── Imágenes del menú (almacenadas en data/menu-images) ────────────────
  listMenuImages() {
    try {
      fs.mkdirSync(MENU_IMAGES_DIR, { recursive: true });
      const meta = this._loadMenuMeta();
      const files = fs.readdirSync(MENU_IMAGES_DIR)
        .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
        .sort();
      return files.map(f => {
        const ext = path.extname(f).toLowerCase();
        const mimetype = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return {
          filename: f,
          absPath: path.join(MENU_IMAGES_DIR, f),
          caption: meta[f]?.caption || '',
          mimetype,
        };
      });
    } catch (_) { return []; }
  }

  _loadMenuMeta() {
    const file = path.join(MENU_IMAGES_DIR, '_meta.json');
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) {}
    return {};
  }

  _saveMenuMeta(meta) {
    const file = path.join(MENU_IMAGES_DIR, '_meta.json');
    try {
      fs.mkdirSync(MENU_IMAGES_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(meta, null, 2));
    } catch (e) { console.error('[WA menu] meta save:', e.message); }
  }

  saveMenuImage(filename, buffer, caption = '') {
    fs.mkdirSync(MENU_IMAGES_DIR, { recursive: true });
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || `menu_${Date.now()}.jpg`;
    const finalPath = path.join(MENU_IMAGES_DIR, safe);
    fs.writeFileSync(finalPath, buffer);
    if (caption) {
      const meta = this._loadMenuMeta();
      meta[safe] = { caption: String(caption).slice(0, 500) };
      this._saveMenuMeta(meta);
    }
    return safe;
  }

  deleteMenuImage(filename) {
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const p = path.join(MENU_IMAGES_DIR, safe);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    const meta = this._loadMenuMeta();
    if (meta[safe]) { delete meta[safe]; this._saveMenuMeta(meta); }
    return true;
  }

  getMenuImagePath(filename) {
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const p = path.join(MENU_IMAGES_DIR, safe);
    return fs.existsSync(p) ? p : null;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────
let _instance = null;
function getInstance() {
  if (!_instance) _instance = new WhatsAppService();
  return _instance;
}

module.exports = { getInstance };
