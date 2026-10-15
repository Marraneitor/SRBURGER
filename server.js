// Simple local server for local development
// Run: npm install; npm start (serves http://localhost:3000)

const nodePath = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const firebaseAdmin = require('firebase-admin');
const { getInstance: getWAService } = require('./services/whatsapp');

// Cargar siempre el .env del directorio del proyecto (evita fallos si se ejecuta desde otra ruta)
dotenv.config({ path: nodePath.join(__dirname, '.env') });

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const MP_ACCESS_TOKEN = (process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
const MP_PUBLIC_KEY = (process.env.MP_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY || '').trim();
const MP_USER_ID = (process.env.MP_USER_ID || '').trim();
const MP_APP_ID = (process.env.MP_APP_ID || '').trim();

let _firebaseAdminApp = null;

function getFirebaseAdminApp() {
  if (_firebaseAdminApp) return _firebaseAdminApp;

  const jsonEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const pathEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();

  let credential = null;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv);
      credential = firebaseAdmin.credential.cert(parsed);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido');
    }
  } else if (pathEnv) {
    try {
      const raw = fs.readFileSync(pathEnv, 'utf8');
      const parsed = JSON.parse(raw);
      credential = firebaseAdmin.credential.cert(parsed);
    } catch (e) {
      throw new Error('No se pudo leer/parsear FIREBASE_SERVICE_ACCOUNT_PATH');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = firebaseAdmin.credential.applicationDefault();
  }

  if (!credential) return null;

  _firebaseAdminApp = firebaseAdmin.initializeApp({ credential });
  return _firebaseAdminApp;
}

function requireAdminKey(req, res, next) {
  const expected = (process.env.ADMIN_KEY || '').trim();
  if (!expected) {
    // Fail-closed: si ADMIN_KEY no está configurada, negar acceso
    res.status(503).json({ ok: false, error: 'ADMIN_KEY no configurada en el servidor.' });
    return false;
  }
  const provided = String(req.get('x-admin-key') || '').trim();
  if (provided && provided === expected) {
    if (typeof next === 'function') next();
    return true;
  }
  res.status(401).json({ ok: false, error: 'No autorizado.' });
  return false;
}

function computePointsFromOrderData(orderData) {
  const pointsEarned = Number(orderData && orderData.pointsEarned);
  if (Number.isFinite(pointsEarned) && pointsEarned >= 0) return Math.floor(pointsEarned);

  const totalCandidates = [
    orderData && orderData.total,
    orderData && orderData.totals && orderData.totals.total,
    orderData && orderData.totalAmount,
  ];
  for (const v of totalCandidates) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.floor(n / 10));
  }
  return 0;
}

// CORS — restringir a ALLOWED_ORIGIN en producción
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || '').trim();
app.use(cors(ALLOWED_ORIGIN ? { origin: ALLOWED_ORIGIN } : undefined));
app.use(express.json({ limit: '1mb' }));

// Rate limiting global (en memoria, funciona en servidor local persistente)
const _globalRateLimit = new Map();
function rateLimitMiddleware(max, windowMs) {
  return (req, res, next) => {
    const ip = String(req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const entry = _globalRateLimit.get(key);
    if (!entry || entry.resetAt < now) {
      _globalRateLimit.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ ok: false, error: 'Demasiadas solicitudes. Intenta más tarde.' });
    }
    entry.count++;
    next();
  };
}
// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _globalRateLimit) { if (v.resetAt < now) _globalRateLimit.delete(k); }
}, 5 * 60 * 1000);

// Registro por código WhatsApp (OTP en memoria)
const _authCodeStore = new Map();
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const AUTH_CODE_RESEND_MS = 20 * 1000;
const AUTH_CODE_MAX_ATTEMPTS = 5;
const AUTH_USERS_FILE = nodePath.join(__dirname, 'data', 'clientes-phone-auth.json');

function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function sanitizeName(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
}

function generateNumericCode(size = 6) {
  let code = '';
  for (let i = 0; i < size; i++) code += String(Math.floor(Math.random() * 10));
  return code;
}

function hashPassword(password, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  if (!password || !salt || !expectedHash) return false;
  try {
    const hash = crypto.scryptSync(String(password), String(salt), 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(String(expectedHash), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

function loadPhoneAuthUsers() {
  try {
    if (!fs.existsSync(AUTH_USERS_FILE)) return {};
    const raw = fs.readFileSync(AUTH_USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (_) {
    return {};
  }
}

function savePhoneAuthUsers(users) {
  try {
    fs.mkdirSync(nodePath.dirname(AUTH_USERS_FILE), { recursive: true });
    fs.writeFileSync(AUTH_USERS_FILE, JSON.stringify(users || {}, null, 2));
  } catch (e) {
    console.error('[auth-phone] Error guardando usuarios locales:', e.message);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of _authCodeStore.entries()) {
    if (!entry || entry.expiresAt < now) _authCodeStore.delete(phone);
  }
}, 60 * 1000);

// Serve static files from the project root
const staticRoot = __dirname;
app.use(express.static(staticRoot));

// Root route: serve paginaburger.html if present, otherwise index.html
app.get('/', (req, res) => {
  const candidate = ['paginaburger.html', 'index.html'];
  for (const file of candidate) {
    const full = nodePath.join(staticRoot, file);
    if (fs.existsSync(full)) {
      return res.sendFile(full);
    }
  }
  res.status(404).send('No se encontró paginaburger.html o index.html');
});

function formatMoney(n) {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
  } catch (_) {
    return `$${n}`;
  }
}

function generateOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${yyyy}${mm}${dd}-${rand}`;
}

function buildOwnerMessage(body) {
  const now = new Date();
  let horaMx;
  try {
    horaMx = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
    }).format(now);
  } catch (_) {
    horaMx = now.toISOString();
  }

  const customer = body.customer || {};
  const deliveryType = body.deliveryType || body.type || '';
  const paymentMethod = body.paymentMethod || body.payment || '';
  const notes = body.notes || '';
  const origin = body.origin || 'Local';
  const orderNumber = body.orderNumber || body.order_number || body.numOrden || '';
  const publicBase = process.env.PUBLIC_BASE_URL || '';

  // items puede venir como body.items (cliente) o body.cart (compat)
  let items = Array.isArray(body.items) ? body.items : [];
  if (!items.length && Array.isArray(body.cart)) {
    items = body.cart.map((c) => ({
      name: c.name || c.title,
      quantity: c.quantity || 1,
      price: c.price,
      customizations: (c.options || c.extras || []).map((o) => (o.name || o)).join(', '),
      notes: c.notes || '',
    }));
  }

  // totales
  const subtotal = Number(body.subtotal || (body.totals && body.totals.subtotal) || 0);
  const delivery = Number(body.delivery || (body.totals && body.totals.delivery) || (deliveryType === 'delivery' ? 40 : 0));
  const total = Number(body.total || (body.totals && body.totals.total) || (subtotal + delivery));

  const lines = [];
  lines.push('Nueva orden SR & SRA BURGER');
  lines.push(`Hora: ${horaMx}`);
  lines.push(`Origen: ${origin}`);
  if (orderNumber) lines.push(`Orden: ${orderNumber}`);
  if (orderNumber && publicBase) {
    const link = `${publicBase.replace(/\/$/, '')}/tuenvio.html?order=${encodeURIComponent(orderNumber)}`;
    lines.push(`Rastreo: ${link}`);
  } else if (orderNumber) {
    lines.push(`Rastreo: tuenvio.html?order=${orderNumber}`);
  }
  if (customer.name) lines.push(`Cliente: ${customer.name}`);
  if (customer.phone) lines.push(`Tel: ${customer.phone}`);
  if (customer.address) lines.push(`Dirección: ${customer.address}`);
  if (deliveryType) lines.push(`Entrega: ${deliveryType === 'delivery' ? 'A domicilio' : 'Para recoger'}`);
  if (paymentMethod) lines.push(`Pago: ${paymentMethod}`);
  lines.push('');
  lines.push('Pedido:');
  if (items.length) {
    items.forEach((item, idx) => {
      const qty = item.quantity || 1;
      const price = item.price != null ? formatMoney(item.price) : '';
      lines.push(`${idx + 1}. ${qty} x ${item.name} ${price}`);
      const details = [];
      if (item.customizations) details.push(item.customizations);
      if (item.notes) details.push(item.notes);
      if (details.length) lines.push(`   ${details.join(' | ')}`);
    });
  } else {
    lines.push('- sin items -');
  }
  lines.push('');
  if (subtotal) lines.push(`Subtotal: ${formatMoney(subtotal)}`);
  if (delivery) lines.push(`Envío: ${formatMoney(delivery)}`);
  lines.push(`TOTAL: ${formatMoney(total)}`);
  if (notes) {
    lines.push('');
    lines.push(`Notas: ${notes}`);
  }
  return lines.join('\n');
}

async function handleSendOrder(req, res) {
  try {
    const payload = req.body || {};
    // Garantizar número de orden si faltó en el payload del cliente
    if (!payload.orderNumber) {
      payload.orderNumber = generateOrderNumber();
    }
    const msg = buildOwnerMessage(payload);
    console.log('[Pedido] Recibido (sin Twilio)\n' + msg);
    res.json({ ok: true, orderNumber: payload.orderNumber });
  } catch (err) {
    console.error('Error procesando pedido:', err);
    const status = (err.status && Number(err.status)) || 500;
    res.status(status).json({ ok: false, error: err.message || 'Error interno' });
  }
}

app.post('/api/send-order', rateLimitMiddleware(5, 60000), handleSendOrder);
app.post('/api/send-orden', rateLimitMiddleware(5, 60000), handleSendOrder);

// Crear preferencia de pago en Mercado Pago para "Pago en línea"
async function createMercadoPagoPreference(orderPayload, req) {
  if (!MP_ACCESS_TOKEN) {
    throw new Error('Mercado Pago no está configurado. Define MP_ACCESS_TOKEN o MERCADOPAGO_ACCESS_TOKEN en tu .env');
  }

  const totalCandidates = [
    orderPayload && orderPayload.total,
    orderPayload && orderPayload.totals && orderPayload.totals.total,
  ];
  let total = 0;
  for (const v of totalCandidates) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && n > 0) {
      total = n;
      break;
    }
  }

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Total inválido para crear el pago en Mercado Pago');
  }

  const orderNumber = String(orderPayload && (orderPayload.orderNumber || orderPayload.order_id || '') || generateOrderNumber());
  const customer = orderPayload && orderPayload.customer ? orderPayload.customer : {};

  // Base URL para redirects. En algunos contextos el header Origin puede venir como "null".
  let baseUrl = (process.env.PUBLIC_BASE_URL || req.get('origin') || '').trim();
  if (!baseUrl || baseUrl === 'null') {
    const host = String(req.get('host') || '').trim();
    const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
    if (host) baseUrl = `${proto}://${host}`;
  }
  if (!baseUrl || baseUrl === 'null') {
    baseUrl = `http://localhost:${DEFAULT_PORT}`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');

  const isLocalHostLike = (u) => {
    try {
      const url = new URL(u);
      const host = String(url.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') return true;
      // RFC1918 + common LAN ranges
      if (host.startsWith('192.168.')) return true;
      if (host.startsWith('10.')) return true;
      if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
      return false;
    } catch (_) {
      return true;
    }
  };

  // Mercado Pago suele rechazar auto_return en entornos localhost/LAN.
  // Lo habilitamos solo cuando el back_url es HTTPS y público.
  const canUseAutoReturn = baseUrl.startsWith('https://') && !isLocalHostLike(baseUrl);

  const backUrls = {
    success: `${baseUrl}/paginaburger.html?payment=approved&order=${encodeURIComponent(orderNumber)}`,
    pending: `${baseUrl}/paginaburger.html?payment=pending&order=${encodeURIComponent(orderNumber)}`,
    failure: `${baseUrl}/paginaburger.html?payment=failure&order=${encodeURIComponent(orderNumber)}`,
  };

  const body = {
    items: [
      {
        title: `Pedido SR & SRA BURGER #${orderNumber}`,
        quantity: 1,
        currency_id: 'MXN',
        unit_price: Number(total.toFixed(2)),
      },
    ],
    external_reference: orderNumber,
    payer: {
      name: customer && customer.name ? String(customer.name) : undefined,
      email: customer && customer.email ? String(customer.email) : undefined,
    },
    back_urls: backUrls,
    // Algunos flujos/SDKs usan redirect_urls. Enviamos ambos.
    redirect_urls: backUrls,
    ...(canUseAutoReturn ? { auto_return: 'approved' } : {}),
    metadata: {
      orderNumber,
    },
  };

  const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Mercado Pago respondió con estado ${resp.status}: ${text || 'sin detalle'}`);
  }

  const data = await resp.json();
  return data;
}

app.post('/api/mercadopago/create-preference', async (req, res) => {
  try {
    const payload = req.body || {};
    const orderNumber = payload.orderNumber || generateOrderNumber();
    const orderData = Object.assign({}, payload.orderData || {}, { orderNumber });

    const preference = await createMercadoPagoPreference(orderData, req);

    return res.json({
      ok: true,
      orderNumber,
      preferenceId: preference && preference.id,
      initPoint: (preference && (preference.init_point || preference.sandbox_init_point)) || null,
      raw: preference,
    });
  } catch (e) {
    console.error('Error creando preferencia de Mercado Pago:', e);
    const status = e && e.status ? Number(e.status) : 500;
    return res.status(status).json({ ok: false, error: e.message || 'mp-preference-failed' });
  }
});

// Consultar estado de pago por orderNumber/external_reference.
// Esto permite mostrar confirmación incluso si Mercado Pago no redirige en localhost/LAN.
app.get('/api/mercadopago/payment-status', async (req, res) => {
  try {
    if (!MP_ACCESS_TOKEN) {
      return res.status(500).json({ ok: false, error: 'Mercado Pago no está configurado (MP_ACCESS_TOKEN).' });
    }

    const order = String(req.query.order || req.query.external_reference || '').trim();
    if (!order) return res.status(400).json({ ok: false, error: 'Missing order' });

    const url = new URL('https://api.mercadopago.com/v1/payments/search');
    url.searchParams.set('external_reference', order);
    url.searchParams.set('sort', 'date_created');
    url.searchParams.set('criteria', 'desc');
    url.searchParams.set('limit', '10');

    const r = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ ok: false, error: `MP search ${r.status}: ${text || 'sin detalle'}` });
    }

    const data = await r.json().catch(() => null);
    const results = data && Array.isArray(data.results) ? data.results : [];
    if (!results.length) {
      return res.json({ ok: true, order, status: 'not_found' });
    }

    const statuses = results.map((p) => String(p && p.status || '').toLowerCase()).filter(Boolean);
    const latest = results[0] || {};
    const latestId = latest && latest.id != null ? String(latest.id) : null;
    const latestStatus = latest && latest.status ? String(latest.status).toLowerCase() : null;

    let status = 'unknown';
    if (statuses.includes('approved')) status = 'approved';
    else if (statuses.some((s) => s === 'in_process' || s === 'pending')) status = 'pending';
    else if (statuses.some((s) => s === 'rejected' || s === 'cancelled')) status = 'failure';
    else status = latestStatus || 'unknown';

    return res.json({ ok: true, order, status, paymentId: latestId, latestStatus });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'mp-status-failed' });
  }
});

// Mark order as paid + credit points (server-side, instant)
app.post('/api/mark-paid', async (req, res) => {
  try {
    if (!requireAdminKey(req, res)) return;

    const { orderId } = req.body || {};
    const safeOrderId = String(orderId || '').trim();
    if (!safeOrderId) return res.status(400).json({ ok: false, error: 'Missing orderId' });

    const adminApp = getFirebaseAdminApp();
    if (!adminApp) {
      return res.status(500).json({
        ok: false,
        error: 'Firebase Admin no está configurado. Define FIREBASE_SERVICE_ACCOUNT_PATH o FIREBASE_SERVICE_ACCOUNT_JSON (o GOOGLE_APPLICATION_CREDENTIALS).'
      });
    }

    const db = firebaseAdmin.firestore();
    const orderRef = db.collection('orders').doc(safeOrderId);
    const now = new Date();
    const paidAtIso = now.toISOString();

    const result = await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
      }

      const order = orderSnap.data() || {};
      const alreadyPaid = !!order.paid;
      const alreadyCredited = !!order.pointsCredited;

      const pointsToAdd = computePointsFromOrderData(order);
      const clienteId = String(order.clienteId || '').trim();

      // Always set paid flags (idempotent)
      tx.set(orderRef, {
        paid: true,
        paidAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (!clienteId) {
        return {
          paid: true,
          pointsAdded: 0,
          pointsCredited: false,
          reason: 'missing_clienteId'
        };
      }

      if (alreadyCredited) {
        return {
          paid: true,
          pointsAdded: Number(order.pointsAdded || 0) || 0,
          pointsCredited: true,
          reason: 'already_credited'
        };
      }

      const clientRef = db.collection('clientes').doc(clienteId);
      const clientSnap = await tx.get(clientRef);
      if (!clientSnap.exists) {
        // If client doesn't exist, we still mark paid.
        return {
          paid: true,
          pointsAdded: 0,
          pointsCredited: false,
          reason: 'client_not_found'
        };
      }

      const client = clientSnap.data() || {};
      const creditedOrders = Array.isArray(client.creditedOrders) ? client.creditedOrders : [];
      if (creditedOrders.includes(safeOrderId)) {
        // Defensive idempotency: order doc may not have pointsCredited.
        tx.set(orderRef, {
          pointsCredited: true,
          pointsCreditedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          pointsAdded: Number(order.pointsAdded || 0) || 0,
        }, { merge: true });
        return {
          paid: true,
          pointsAdded: Number(order.pointsAdded || 0) || 0,
          pointsCredited: true,
          reason: 'creditedOrders_contains'
        };
      }

      const currentPoints = Number(client.puntos || 0);
      const safeCurrentPoints = Number.isFinite(currentPoints) ? currentPoints : 0;
      const safePointsToAdd = Number.isFinite(pointsToAdd) ? pointsToAdd : 0;

      tx.set(clientRef, {
        puntos: safeCurrentPoints + safePointsToAdd,
        creditedOrders: firebaseAdmin.firestore.FieldValue.arrayUnion(safeOrderId),
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(orderRef, {
        pointsEarned: Number.isFinite(Number(order.pointsEarned)) ? order.pointsEarned : safePointsToAdd,
        pointsCredited: true,
        pointsCreditedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        pointsAdded: safePointsToAdd,
      }, { merge: true });

      return {
        paid: true,
        pointsAdded: safePointsToAdd,
        pointsCredited: true,
        reason: alreadyPaid ? 'paid_was_true' : 'ok'
      };
    });

    return res.json({ ok: true, paidAt: paidAtIso, ...result });
  } catch (e) {
    const status = (e && e.status) ? Number(e.status) : 500;
    return res.status(status).json({ ok: false, error: e.message || 'mark-paid-failed' });
  }
});

// Google Distance Matrix proxy (same-origin). Prefer env var, fallback to GMAPS_API_KEY if provided.
// Por defecto, el origen es la sucursal (Coahuila 36) por coordenadas,
// para evitar fallos de geocodificación con texto en Distance Matrix.
// Referencia: Coahuila 36, 10 de Mayo, 96344 Minatitlán, Veracruz, México
// Query:
//   /api/distance-matrix?destLat=..&destLng=..
//   or /api/distance-matrix?destAddress=...
// Optional:
//   origLat/origLng (compat)
app.get('/api/distance-matrix', async (req, res) => {
  try {
    const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.GMAPS_API_KEY || '').trim();
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing GOOGLE_MAPS_API_KEY' });

    const DEFAULT_ORIGIN_LAT = 18.022398;
    const DEFAULT_ORIGIN_LNG = -94.546974;
    const origLat = req.query.origLat != null ? Number(req.query.origLat) : null;
    const origLng = req.query.origLng != null ? Number(req.query.origLng) : null;

    const destLat = req.query.destLat != null ? Number(req.query.destLat) : null;
    const destLng = req.query.destLng != null ? Number(req.query.destLng) : null;
    const destAddress = String(req.query.destAddress || '').trim();

    const hasOrigCoords = Number.isFinite(origLat) && Number.isFinite(origLng);
    const hasDestCoords = Number.isFinite(destLat) && Number.isFinite(destLng);

    let destinations;
    if (hasDestCoords) {
      destinations = `${destLat},${destLng}`;
    } else if (destAddress) {
      destinations = destAddress;
    } else {
      return res.status(400).json({ ok: false, error: 'Missing destination (destLat/destLng or destAddress)' });
    }

    const origins = hasOrigCoords
      ? `${origLat},${origLng}`
      : `${DEFAULT_ORIGIN_LAT},${DEFAULT_ORIGIN_LNG}`;
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', origins);
    url.searchParams.set('destinations', destinations);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('language', 'es');
    url.searchParams.set('region', 'mx');
    url.searchParams.set('key', apiKey);

    const r = await fetch(url.toString());
    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Upstream ${r.status}` });
    const data = await r.json();

    const row = data && data.rows && data.rows[0];
    const elem = row && row.elements && row.elements[0];
    const elemStatus = elem && elem.status;
    if (data.status !== 'OK' || elemStatus !== 'OK') {
      return res.status(200).json({
        ok: false,
        error: 'DistanceMatrix not OK',
        status: data && data.status,
        elementStatus: elemStatus,
      });
    }

    const distanceMeters = elem.distance && typeof elem.distance.value === 'number' ? elem.distance.value : null;
    const durationSeconds = elem.duration && typeof elem.duration.value === 'number' ? elem.duration.value : null;
    const distanceKm = typeof distanceMeters === 'number' ? distanceMeters / 1000 : null;
    const durationMin = typeof durationSeconds === 'number' ? Math.round(durationSeconds / 60) : null;

    res.json({ ok: true, distanceKm, durationMin });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'distance-matrix-failed' });
  }
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Config check (no expone secretos)
app.get('/api/mp-config-check', (_req, res) => {
  res.json({
    ok: true,
    has: {
      MP_ACCESS_TOKEN: !!(process.env.MP_ACCESS_TOKEN || '').trim(),
      MERCADOPAGO_ACCESS_TOKEN: !!(process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim(),
      MP_PUBLIC_KEY: !!(process.env.MP_PUBLIC_KEY || '').trim(),
      MERCADOPAGO_PUBLIC_KEY: !!(process.env.MERCADOPAGO_PUBLIC_KEY || '').trim(),
      MP_USER_ID: !!(process.env.MP_USER_ID || '').trim(),
      MP_APP_ID: !!(process.env.MP_APP_ID || '').trim(),
    },
    mpReady: !!((process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim()),
    mpPublicKeyReady: !!MP_PUBLIC_KEY,
  });
});

app.get('/api/config-check', (_req, res) => {
  res.json({
    ok: true,
    note: 'Twilio fue removido. Este endpoint queda como placeholder.'
  });
});

// Geocoding proxy to Nominatim (avoids CORS and adds proper headers)
app.get('/api/geocode', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'Missing q' });
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=1`;
    const r = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        // Provide a simple UA per Nominatim usage policy (no personal data)
        'User-Agent': 'sr-sra-burger/1.0 (+https://example.invalid)'
      }
    });
    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Upstream ${r.status}` });
    const data = await r.json();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'geocode-failed' });
  }
});

function printAddresses(port) {
  try {
    const os = require('os');
    const nets = os.networkInterfaces();
    let lan = '';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) { lan = net.address; break; }
      }
      if (lan) break;
    }
    console.log(`Servidor corriendo en: http://localhost:${port}`);
    if (lan) console.log(`Tu LAN: http://${lan}:${port}`);
  } catch (_) {
    console.log(`Servidor corriendo en: http://localhost:${port}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP — Notificaciones de pedidos via Baileys
// ═══════════════════════════════════════════════════════════════════════════
// CHATBOT IA — Asistente virtual "Burgy" · SR & SRA BURGER
// Requiere: GEMINI_API_KEY en .env
// ═══════════════════════════════════════════════════════════════════════════
const _chatRateLimit = new Map(); // ip → { count, resetAt }
const CHAT_RATE = { window: 60_000, max: 15 }; // 15 msgs/min por IP

let _menuCache = { items: [], expiresAt: 0 };
const MENU_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

async function getChatMenuItems() {
  if (Date.now() < _menuCache.expiresAt && _menuCache.items.length) return _menuCache.items;
  try {
    const admin = getFirebaseAdminApp();
    if (!admin) return _menuCache.items;
    const db = admin.firestore();
    const snap = await db.collection('productos')
      .where('disponible', '==', true)
      .limit(80)
      .get();
    const items = snap.docs.map(doc => {
      const d = doc.data();
      return {
        name:        String(d.nombre || d.name || '').trim(),
        category:    String(d.categoria || d.category || 'Menú').trim(),
        price:       Number(d.precio || d.price || 0),
        description: String(d.descripcion || d.description || '').slice(0, 100),
      };
    }).filter(i => i.name);
    _menuCache = { items, expiresAt: Date.now() + MENU_CACHE_TTL };
    return items;
  } catch (e) {
    console.error('[Chat] Error cargando menú desde Firestore:', e.message);
    return _menuCache.items; // devolver caché antigua si hay
  }
}
// ── Prompt del chatbot (Burgy — guía de paginaburger.html) ───────────────────

// Calcula solo la sección dinámica de estado del local (abierto/cerrado)
function buildStatusSection() {
  const nowMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const dayOfWeek = nowMX.getDay();
  const hour = nowMX.getHours();
  const timeDecimal = hour + nowMX.getMinutes() / 60;
  let isOpen = false;
  if (dayOfWeek === 1) { isOpen = false; }
  else if (dayOfWeek >= 2 && dayOfWeek <= 5) { isOpen = timeDecimal >= 18 && timeDecimal < 22; }
  else { isOpen = timeDecimal >= 16 && timeDecimal < 22; }
  const statusNote = isOpen
    ? '✅ El local está ABIERTO ahora mismo.'
    : '🌙 El local está CERRADO en este momento. Informa el horario si te preguntan.';
  return `━━━━ ESTADO DEL LOCAL ━━━━\n${statusNote}\nHorario: Lunes CERRADO | Mar–Vie 18:00–22:00 | Sáb–Dom 16:00–22:00`;
}

// Cuerpo base (fallback si aún no hay prompt guardado en Firestore)
const CHATBOT_PROMPT_DEFAULT = `Eres Burgy 🍔, el asistente guía de **Sr. y Sra. Burger** — dark kitchen de hamburguesas artesanales en Minatitlán, Veracruz, México.
Tu función: orientar y resolver dudas sobre la página y el restaurante. NO tomas pedidos — los pedidos se hacen usando el carrito de la web. Sé amable y directo. Responde SIEMPRE en español. Usa emojis con moderación. Sé breve (máx. 4-5 líneas salvo que el tema requiera más).
━━━━ 1. CÓMO HACER UN PEDIDO ━━━━
Cuando alguien quiera pedir, explica estos pasos:
1. Pulsa "Mostrar menú" para ver el catálogo.
2. Abre la categoría deseada (Hamburguesas, Hot Dogs, Combos, Complementos).
3. Pulsa el producto:
   • "Personalizar" → elige toppings, tipo de papas (Francesas o Gajo), salsas Boneless (Natural, BBQ Dulce, BBQ Picante, Parmesano Ranch) o extras, luego confirma.
   • "Agregar" → lo añade directo al carrito.
4. Abre el carrito (ícono arriba a la derecha o barra flotante en móvil → "Tu Pedido").
5. Revisa los productos y pulsa "Ordenar ahora".
6. Completa el checkout en 3 pasos:
   • Datos: tu nombre y teléfono.
   • Entrega: elige "Recoger en local" (gratis) o "Envío a domicilio" (el costo se calcula automáticamente según tu colonia a $8/km).
   • Confirmar: elige método de pago (Efectivo, Tarjeta, Pago en línea o Transferencia) y pulsa "Confirmar por WhatsApp".
7. ¡Listo! Tiempo estimado: 25–35 min 🎉
━━━━ 2. CÓMO REGISTRARSE / INICIAR SESIÓN ━━━━
No necesitas cuenta para pedir, pero con una cuenta puedes:
✅ Guardar tu dirección (el checkout se llena solo)
✅ Acumular puntos (~1 punto por cada $10 gastado)
✅ Obtener 10% de descuento en tu primera compra 🎁
Pasos para registrarse:
1. Pulsa el ícono de persona 🧑 en la barra superior → "Mi cuenta" (o ve directamente a cliente.html).
2. Selecciona "Registrarse" e ingresa tu nombre, teléfono y contraseña.
3. ¡Ya puedes pedir con tu dirección guardada y acumular puntos!
━━━━ 3. MENÚ Y PRECIOS ━━━━
🍔 HAMBURGUESAS
• Sencilla $90 | Premium $105 | BBQ Beacon $115
• Alohawai $120 | Chistorraburger $125 | Salchiburger $125
• Choriargentina $125 | Guacamole $140 | Boneless Burger $150
  (Boneless: elige salsa — Natural, BBQ Dulce, BBQ Picante o Parmesano Ranch)
🌭 HOT DOGS
• Hot Dog Jumbo $65
🎁 COMBOS (incluyen la Premium; otra burger aplica diferencial de precio)
• Combo Duo $190 | Triple Dog $215 | Combo Boneless $215
• Combo Amigos $380 | Combo Familiar $680
🍟 COMPLEMENTOS
• Papas Francesas / Gajo: M $65 / XL $130
• Salchipapas Parmesanas: M $90 / XL $140
• Aros de Cebolla: M $50 / XL $95
• Papas Complemento (extra a tu burger): $25
━━━━ 4. ENVÍO Y ZONAS ━━━━
📍 Recoger en local: SIN costo — Calle Coahuila #36, Col. Emiliano Zapata, Minatitlán, Ver.
Envío a domicilio (la página calcula automáticamente a $8/km, máx. 12 km):
• ~$40: Azteca, G. Díaz Ordaz, Congreso Constituyentes, Unver, Las Fuentes, Salinas de Gortari, Soto Innes, Reyes Azteca, Los Maestros, Infonavit Paquital, El Guayabal, Costa de Marfil (Entrada).
• ~$50: Rosalinda, Infonavit Justo Sierra, Salubridad, Nueva Primero de Mayo, El Palmar, Santa Clara, Buena Vista Norte/Sur, Petrolera, 18 de Marzo, Reforma, Villas del Sol, Valle Alto, La Fuente, Framboyanes, Arboledas, Las Lomas, Nueva Mina, Insurgentes (Norte/Sur).
• ~$55: Hidalgo, Niños Héroes, 20 de Noviembre, Cuauhtémoc, Obrera, Chapala, Ruiz Cortines, La Bomba, Miguel Hidalgo, Centro, Playón (Norte/Sur), Jagüey, Gravera, Praderas del Jagüey, El Mangal, Benito Juárez, Bohemia, Delicias, Esperanza, 16 de Septiembre, Tlapancalco, Patria Libre, San Antonio, San Pedro, Santa Isabel, Tierra y Libertad, Zaragoza, Vicente Guerrero, Vista Hermosa y Ampliaciones.
• Colonia no listada: el sistema la calcula igual usando la distancia.
━━━━ 5. CONTACTO ━━━━
📞 Tel/WhatsApp: 922 159 3688
📱 Instagram: @srysraburger | TikTok: @srsra.burger
━━━━ 6. RESTRICCIONES ━━━━
— Solo responde temas relacionados con el restaurante o el uso de la página.
— NUNCA inventes productos, precios ni zonas de entrega.
— NUNCA intentes tomar un pedido directamente — siempre redirige al carrito de la web.
— Si no sabes algo, sugiere llamar al 922 159 3688.`;

// Caché del prompt personalizado (cargado desde Firestore o archivo local)
let _chatbotPromptCache = { text: null, expiresAt: 0 };
const CHATBOT_PROMPT_CACHE_TTL = 5 * 60 * 1000; // 5 min

// Ruta del archivo local de fallback (cuando Firebase Admin no está disponible)
const BOTCONF_LOCAL_PATH = nodePath.join(__dirname, 'data', 'botconf.json');

function loadBotconfLocal() {
  try {
    if (!fs.existsSync(BOTCONF_LOCAL_PATH)) return null;
    const raw = fs.readFileSync(BOTCONF_LOCAL_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.systemPrompt ? String(parsed.systemPrompt).trim() : null;
  } catch (_) { return null; }
}

async function saveBotconfLocal(text) {
  const dir = nodePath.dirname(BOTCONF_LOCAL_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BOTCONF_LOCAL_PATH, JSON.stringify({ systemPrompt: text, updatedAt: new Date().toISOString() }), 'utf8');
}

async function loadCustomPromptFromFirestore() {
  try {
    const admin = getFirebaseAdminApp();
    if (admin) {
      const db = admin.firestore();
      const snap = await db.collection('settings').doc('chatbot_config').get();
      if (snap.exists && snap.data()?.systemPrompt) {
        return String(snap.data().systemPrompt).trim();
      }
    }
  } catch (e) {
    console.error('[Chat] Firebase no disponible, usando archivo local:', e.message);
  }
  // Fallback: archivo local
  return loadBotconfLocal();
}

async function getCachedCustomPrompt(forceReload = false) {
  if (!forceReload && Date.now() < _chatbotPromptCache.expiresAt) {
    return _chatbotPromptCache.text; // null = usar default
  }
  const text = await loadCustomPromptFromFirestore();
  _chatbotPromptCache = { text, expiresAt: Date.now() + CHATBOT_PROMPT_CACHE_TTL };
  return text;
}

// Construye el prompt final: sección dinámica + cuerpo (custom o default)
async function buildChatSystemPrompt() {
  const statusSection = buildStatusSection();
  const customBody = await getCachedCustomPrompt();
  const body = customBody || CHATBOT_PROMPT_DEFAULT;
  return `${statusSection}\n\n${body}`;
}

function checkChatRateLimit(ip) {
  const now = Date.now();
  const entry = _chatRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    _chatRateLimit.set(ip, { count: 1, resetAt: now + CHAT_RATE.window });
    return true;
  }
  if (entry.count >= CHAT_RATE.max) return false;
  entry.count++;
  return true;
}

// Limpiar entradas expiradas del rate limiter cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of _chatRateLimit) {
    if (entry.resetAt < now) _chatRateLimit.delete(ip);
  }
}, 5 * 60 * 1000);

app.post('/api/chat', async (req, res) => {
  // Rate limit por IP
  const ip = String(req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  if (!checkChatRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'Demasiadas solicitudes. Espera un momento.' });
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'Asistente no configurado en el servidor.' });
  }

  // Validar y sanitizar mensaje actual
  const rawMessage = String(req.body?.message || '').replace(/<[^>]*>/g, '').trim();
  if (!rawMessage) return res.status(400).json({ ok: false, error: 'Mensaje vacío.' });
  if (rawMessage.length > 500) return res.status(400).json({ ok: false, error: 'Mensaje demasiado largo (máx. 500 caracteres).' });

  // Validar y sanitizar historial (máx 10 turnos anteriores)
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const history = rawHistory.slice(-10).map(m => ({
    role: String(m.role || '') === 'model' ? 'model' : 'user',
    text: String(m.content || '').replace(/<[^>]*>/g, '').slice(0, 500),
  })).filter(m => m.text);

  try {
    const systemPrompt = await buildChatSystemPrompt();

    // Construir array de turnos para Gemini (debe alternar user/model)
    const contents = [];
    for (const turn of history) {
      contents.push({ role: turn.role, parts: [{ text: turn.text }] });
    }
    // Añadir mensaje actual del usuario al final
    contents.push({ role: 'user', parts: [{ text: rawMessage }] });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.75, maxOutputTokens: 1024, topP: 0.95 },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      console.error('[Chat] Gemini error', geminiRes.status, JSON.stringify(errBody).slice(0, 200));
      return res.status(502).json({ ok: false, error: 'Error al conectar con el asistente de IA.' });
    }

    const data  = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error('[Chat] Gemini sin respuesta:', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ ok: false, error: 'El asistente no pudo responder.' });
    }

    res.json({ ok: true, reply: reply.trim() });
  } catch (e) {
    console.error('[Chat] Error interno:', e.message);
    res.status(500).json({ ok: false, error: 'Error interno del asistente.' });
  }
});

// ── API: generar texto de promoción con IA ──────────────────────────────────
// Protegido por ADMIN_KEY. Usa Gemini para devolver { tipo, texto } JSON.
app.post('/api/generate-promo', async (req, res) => {
  if (!requireAdminKey(req, res)) return;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'GEMINI_API_KEY no configurada.' });
  }

  const idea = String(req.body?.idea || '').replace(/<[^>]*>/g, '').trim().slice(0, 500);
  const tipoActual = String(req.body?.tipo || '').replace(/<[^>]*>/g, '').trim().slice(0, 120);
  const textoActual = String(req.body?.texto || '').replace(/<[^>]*>/g, '').trim().slice(0, 800);

  const SYS = `Eres un copywriter experto de **Sr. y Sra. Burger**, dark kitchen de hamburguesas artesanales en Minatitlán, Veracruz.
Tu tarea: redactar mensajes BREVES de promoción para enviar por WhatsApp a clientes registrados.

REGLAS ESTRICTAS:
- Responde SIEMPRE en JSON válido con esta forma exacta:
  {"tipo":"TÍTULO CORTO EN MAYÚSCULAS","texto":"Cuerpo del mensaje"}
- "tipo": 3 a 6 palabras, mayúsculas, atractivo (ej. "PROMO DOBLE BURGER HOY", "MARTES DE LOCURA").
- "texto": 2 a 4 líneas. Tono cercano, mexicano, energético. Puedes usar 1-3 emojis (🍔🔥🎉🥤🍟). Incluye un llamado a la acción claro.
- NO incluyas saludo (Hola...) ni firma (SR & SRA BURGER) — eso lo agrega el sistema.
- NO inventes precios ni productos si no se proporcionan en el "Brief". Si no hay precios, escribe sin números específicos.
- NO uses markdown, ni \`\`\`json, solo el objeto JSON puro.

CATÁLOGO DE REFERENCIA:
🍔 Sencilla $90 · Premium $105 · BBQ Beacon $115 · Alohawai $120 · Chistorraburger $125 · Salchiburger $125 · Choriargentina $125 · Guacamole $140 · Boneless Burger $150
🌭 Hot Dog Jumbo $65
🎁 Combo Duo $190 · Triple Dog $215 · Combo Boneless $215 · Combo Amigos $380 · Combo Familiar $680
🍟 Papas M $65/XL $130 · Salchipapas Parmesanas M $90/XL $140 · Aros M $50/XL $95
📍 Coahuila #36, Col. Emiliano Zapata, Minatitlán · Envío $8/km`;

  const briefParts = [];
  if (idea) briefParts.push(`Idea / objetivo: ${idea}`);
  if (tipoActual) briefParts.push(`Título actual (mejóralo si conviene): ${tipoActual}`);
  if (textoActual) briefParts.push(`Texto actual (úsalo como base, hazlo más persuasivo): ${textoActual}`);
  if (!briefParts.length) briefParts.push('Genera una promoción atractiva del día para llenar el local. Elige libremente entre el catálogo.');
  const userMessage = `Brief:\n${briefParts.join('\n')}\n\nResponde solo con el JSON solicitado.`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYS }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.95,
          maxOutputTokens: 512,
          topP: 0.95,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      console.error('[generate-promo] Gemini error', geminiRes.status, JSON.stringify(errBody).slice(0, 200));
      return res.status(502).json({ ok: false, error: 'Error al conectar con la IA.' });
    }

    const data = await geminiRes.json();
    let raw = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

    let parsed = null;
    try { parsed = JSON.parse(raw); }
    catch (_) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (_) {} }
    }
    if (!parsed) {
      console.error('[generate-promo] Respuesta no parseable:', raw.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'La IA no devolvió un JSON válido.' });
    }

    return res.json({
      ok: true,
      tipo: String(parsed.tipo || '').trim().slice(0, 120),
      texto: String(parsed.texto || '').trim().slice(0, 1500),
    });
  } catch (e) {
    console.error('[generate-promo] Error interno:', e.message);
    return res.status(500).json({ ok: false, error: 'Error interno del generador.' });
  }
});

// ── API de configuración del chatbot ────────────────────────────────────────

// GET — devuelve el prompt actual (custom de Firestore o el default hardcodeado)
app.get('/api/admin/botconf', async (req, res) => {
  try {
    const custom = await getCachedCustomPrompt();
    res.json({
      ok: true,
      systemPrompt: custom !== null ? custom : CHATBOT_PROMPT_DEFAULT,
      isDefault: custom === null,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST — guarda el prompt (requiere ADMIN_KEY)
app.post('/api/admin/botconf', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const text = String(req.body?.systemPrompt || '').trim();
    if (!text) return res.status(400).json({ ok: false, error: 'systemPrompt no puede estar vacío' });

    let savedTo = 'local';
    try {
      const admin = getFirebaseAdminApp();
      if (admin) {
        const db = admin.firestore();
        await db.collection('settings').doc('chatbot_config').set({
          systemPrompt: text,
          updatedAt: new Date(),
          updatedBy: 'botconf-api',
        }, { merge: true });
        savedTo = 'firestore';
      }
    } catch (fbErr) {
      console.warn('[BotConf] Firebase no disponible, guardando en archivo local:', fbErr.message);
    }

    // Siempre guardar en archivo local como respaldo
    await saveBotconfLocal(text);
    // Actualizar caché en memoria al instante
    _chatbotPromptCache = { text, expiresAt: Date.now() + CHATBOT_PROMPT_CACHE_TTL };
    res.json({ ok: true, savedTo });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST — fuerza recarga del caché (requiere ADMIN_KEY)
app.post('/api/admin/botconf/reload', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const text = await getCachedCustomPrompt(true);
    res.json({ ok: true, reloaded: true, hasCustom: text !== null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// RUTAS API — WhatsApp (Baileys)
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/auth/send-code — envía código de verificación al teléfono por WhatsApp
app.post('/api/auth/send-code', rateLimitMiddleware(5, 60 * 1000), async (req, res) => {
  try {
    const nombre = sanitizeName(req.body && req.body.nombre);
    const telefono = normalizePhoneDigits(req.body && req.body.telefono);
    const password = String(req.body && req.body.password || '');
    console.log(`[send-code] Petición recibida → nombre="${nombre}" teléfono="${telefono}" (${telefono.length} dígitos)`);

    if (!nombre || nombre.length < 2) {
      return res.status(400).json({ ok: false, error: 'Nombre inválido.' });
    }
    if (!telefono || telefono.length < 10 || telefono.length > 13) {
      return res.status(400).json({ ok: false, error: 'Teléfono inválido. Usa lada y 10 dígitos.' });
    }

    const wa = getWAService();
    if (!wa.connected) {
      return res.status(503).json({ ok: false, error: 'WhatsApp no está conectado. Abre notifi.html y escanea el QR.' });
    }

    const now = Date.now();
    const prev = _authCodeStore.get(telefono);
    const users = loadPhoneAuthUsers();
    const alreadyRegistered = !!users[telefono];
    const hasActivePending = !!(prev && prev.expiresAt > now);

    if (alreadyRegistered && !hasActivePending) {
      return res.status(409).json({ ok: false, error: 'Este número ya está registrado. Inicia sesión con tu contraseña.' });
    }

    if (prev && prev.lastSentAt && (now - prev.lastSentAt) < AUTH_CODE_RESEND_MS) {
      const waitSec = Math.ceil((AUTH_CODE_RESEND_MS - (now - prev.lastSentAt)) / 1000);
      return res.status(429).json({ ok: false, error: `Espera ${waitSec}s para pedir otro código.` });
    }

    let passwordSalt = null;
    let passwordHash = null;
    let passwordPlain = null;
    if (hasActivePending && prev.passwordSalt && prev.passwordHash && !password) {
      passwordSalt = prev.passwordSalt;
      passwordHash = prev.passwordHash;
      passwordPlain = prev.passwordPlain || null;
    } else {
      if (!password || password.length < 6) {
        return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
      }
      const hashed = hashPassword(password);
      passwordSalt = hashed.salt;
      passwordHash = hashed.hash;
      passwordPlain = password;
    }

    const code = generateNumericCode(6);
    const entry = {
      code,
      name: nombre,
      phone: telefono,
      passwordSalt,
      passwordHash,
      passwordPlain,
      attempts: 0,
      lastSentAt: now,
      expiresAt: now + AUTH_CODE_TTL_MS,
    };

    const mensaje = [
      '🍔 *SR & SRA BURGER*',
      '',
      `Bienvenido, ${nombre}.`,
      `Tu código de confirmación es: *${code}*`,
      '',
      'Este código vence en 10 minutos.',
      'Si no solicitaste este código, ignora este mensaje.'
    ].join('\n');

    await wa.sendToPhone(telefono, mensaje);
    _authCodeStore.set(telefono, entry);
    console.log(`[send-code] Código ${code} guardado para ${telefono}. Vence en 10 min.`);

    return res.json({ ok: true, expiresInSec: Math.floor(AUTH_CODE_TTL_MS / 1000) });
  } catch (e) {
    console.error('[send-code] Error:', e && e.message, e && e.stack);
    return res.status(500).json({ ok: false, error: e.message || 'No se pudo enviar el código.' });
  }
});

// POST /api/auth/verify-code — verifica código y devuelve sesión local por teléfono
app.post('/api/auth/verify-code', rateLimitMiddleware(20, 60 * 1000), async (req, res) => {
  try {
    const telefono = normalizePhoneDigits(req.body && req.body.telefono);
    const codigo = normalizePhoneDigits(req.body && req.body.codigo);
    const nombreInput = sanitizeName(req.body && req.body.nombre);

    if (!telefono || telefono.length < 10 || telefono.length > 13) {
      return res.status(400).json({ ok: false, error: 'Teléfono inválido.' });
    }
    if (!codigo || codigo.length < 4 || codigo.length > 8) {
      return res.status(400).json({ ok: false, error: 'Código inválido.' });
    }

    const entry = _authCodeStore.get(telefono);
    if (!entry) {
      return res.status(400).json({ ok: false, error: 'No hay código activo para este número. Solicita uno nuevo.' });
    }

    if (Date.now() > entry.expiresAt) {
      _authCodeStore.delete(telefono);
      return res.status(400).json({ ok: false, error: 'El código expiró. Solicita uno nuevo.' });
    }

    if (entry.attempts >= AUTH_CODE_MAX_ATTEMPTS) {
      _authCodeStore.delete(telefono);
      return res.status(429).json({ ok: false, error: 'Demasiados intentos. Solicita un código nuevo.' });
    }

    if (String(entry.code) !== String(codigo)) {
      entry.attempts += 1;
      _authCodeStore.set(telefono, entry);
      return res.status(400).json({ ok: false, error: 'Código incorrecto.' });
    }

    _authCodeStore.delete(telefono);

    const nombre = entry.name || nombreInput || `Cliente ${telefono.slice(-4)}`;
    const uid = `wa_${telefono}`;
    const nowIso = new Date().toISOString();

    const users = loadPhoneAuthUsers();
    users[telefono] = {
      uid,
      nombre,
      telefono,
      passwordSalt: entry.passwordSalt,
      passwordHash: entry.passwordHash,
      passwordPlain: entry.passwordPlain || (users[telefono] && users[telefono].passwordPlain) || null,
      authType: 'phone_password',
      updatedAt: nowIso,
      createdAt: (users[telefono] && users[telefono].createdAt) || nowIso,
    };
    savePhoneAuthUsers(users);

    const session = {
      uid,
      nombre,
      telefono,
      authType: 'phone_password',
      verifiedAt: new Date().toISOString(),
    };

    // Si Firebase Admin está configurado, guardar/actualizar cliente para panel y puntos.
    try {
      const adminApp = getFirebaseAdminApp();
      if (adminApp) {
        const db = firebaseAdmin.firestore(adminApp);
        const nowTs = firebaseAdmin.firestore.FieldValue.serverTimestamp();
        await db.collection('clientes').doc(uid).set({
          nombre,
          telefono,
          telefonoDigits: telefono,
          authType: 'phone_password',
          updatedAt: nowTs,
          createdAt: nowTs,
          puntos: 0,
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[auth-code] No se pudo actualizar Firestore:', err.message);
    }

    return res.json({ ok: true, session });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'No se pudo verificar el código.' });
  }
});

// POST /api/auth/login-phone — login con número y contraseña
app.post('/api/auth/login-phone', rateLimitMiddleware(10, 60 * 1000), async (req, res) => {
  try {
    const telefono = normalizePhoneDigits(req.body && req.body.telefono);
    const password = String(req.body && req.body.password || '');

    if (!telefono || telefono.length < 10 || telefono.length > 13) {
      return res.status(400).json({ ok: false, error: 'Teléfono inválido.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ ok: false, error: 'Contraseña inválida.' });
    }

    const users = loadPhoneAuthUsers();
    const user = users[telefono];
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Este número no está registrado.' });
    }

    const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: 'Número o contraseña incorrectos.' });
    }

    return res.json({
      ok: true,
      session: {
        uid: user.uid || `wa_${telefono}`,
        nombre: user.nombre || `Cliente ${telefono.slice(-4)}`,
        telefono,
        authType: 'phone_password',
        verifiedAt: new Date().toISOString(),
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'No se pudo iniciar sesión.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Recuperación de contraseña por WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/recover-send-code — envía código a un número YA registrado
app.post('/api/auth/recover-send-code', rateLimitMiddleware(5, 60 * 1000), async (req, res) => {
  try {
    const telefono = normalizePhoneDigits(req.body && req.body.telefono);
    if (!telefono || telefono.length < 10 || telefono.length > 13) {
      return res.status(400).json({ ok: false, error: 'Teléfono inválido. Usa lada y 10 dígitos.' });
    }

    const users = loadPhoneAuthUsers();
    const user = users[telefono];
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Este número no está registrado.' });
    }
    if (!user.passwordPlain) {
      return res.status(409).json({ ok: false, error: 'Este número fue registrado antes de habilitar la recuperación. Por favor inicia sesión y vuelve a registrarte para crear una nueva contraseña.' });
    }

    const wa = getWAService();
    if (!wa.connected) {
      return res.status(503).json({ ok: false, error: 'WhatsApp no está conectado.' });
    }

    const now = Date.now();
    const prevKey = `recover:${telefono}`;
    const prev = _authCodeStore.get(prevKey);
    if (prev && prev.lastSentAt && (now - prev.lastSentAt) < AUTH_CODE_RESEND_MS) {
      const waitSec = Math.ceil((AUTH_CODE_RESEND_MS - (now - prev.lastSentAt)) / 1000);
      return res.status(429).json({ ok: false, error: `Espera ${waitSec}s para pedir otro código.` });
    }

    const code = generateNumericCode(6);
    const entry = {
      type: 'recover',
      code,
      phone: telefono,
      attempts: 0,
      lastSentAt: now,
      expiresAt: now + AUTH_CODE_TTL_MS,
    };

    const mensaje = [
      '🍔 *SR & SRA BURGER*',
      '',
      `Hola ${user.nombre || ''}.`,
      `Tu código para recuperar tu contraseña es: *${code}*`,
      '',
      'Este código vence en 10 minutos.',
      'Si no solicitaste recuperar tu contraseña, ignora este mensaje.'
    ].join('\n');

    await wa.sendToPhone(telefono, mensaje);
    _authCodeStore.set(prevKey, entry);
    console.log(`[recover-send-code] Código ${code} enviado a ${telefono}.`);

    return res.json({ ok: true, expiresInSec: Math.floor(AUTH_CODE_TTL_MS / 1000) });
  } catch (e) {
    console.error('[recover-send-code] Error:', e && e.message);
    return res.status(500).json({ ok: false, error: e.message || 'No se pudo enviar el código.' });
  }
});

// POST /api/auth/recover-verify-code — devuelve la contraseña en claro si el código coincide
app.post('/api/auth/recover-verify-code', rateLimitMiddleware(20, 60 * 1000), async (req, res) => {
  try {
    const telefono = normalizePhoneDigits(req.body && req.body.telefono);
    const codigo = normalizePhoneDigits(req.body && req.body.codigo);
    if (!telefono || telefono.length < 10 || telefono.length > 13) {
      return res.status(400).json({ ok: false, error: 'Teléfono inválido.' });
    }
    if (!codigo || codigo.length < 4 || codigo.length > 8) {
      return res.status(400).json({ ok: false, error: 'Código inválido.' });
    }

    const key = `recover:${telefono}`;
    const entry = _authCodeStore.get(key);
    if (!entry) {
      return res.status(400).json({ ok: false, error: 'No hay código activo para este número. Solicita uno nuevo.' });
    }
    if (Date.now() > entry.expiresAt) {
      _authCodeStore.delete(key);
      return res.status(400).json({ ok: false, error: 'El código expiró. Solicita uno nuevo.' });
    }
    if (entry.attempts >= AUTH_CODE_MAX_ATTEMPTS) {
      _authCodeStore.delete(key);
      return res.status(429).json({ ok: false, error: 'Demasiados intentos. Solicita un código nuevo.' });
    }
    if (String(entry.code) !== String(codigo)) {
      entry.attempts += 1;
      _authCodeStore.set(key, entry);
      return res.status(400).json({ ok: false, error: 'Código incorrecto.' });
    }

    _authCodeStore.delete(key);
    const users = loadPhoneAuthUsers();
    const user = users[telefono];
    if (!user || !user.passwordPlain) {
      return res.status(404).json({ ok: false, error: 'No se encontró la contraseña almacenada para este número.' });
    }

    return res.json({ ok: true, password: user.passwordPlain, nombre: user.nombre || '' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'No se pudo verificar el código.' });
  }
});

// GET /api/admin/phone-users — lista usuarios con contraseña (panel ADMIN)
app.get('/api/admin/phone-users', (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const users = loadPhoneAuthUsers();
    const list = Object.values(users).map((u) => ({
      uid: u.uid,
      telefono: u.telefono,
      nombre: u.nombre,
      password: u.passwordPlain || null,
      createdAt: u.createdAt || null,
      updatedAt: u.updatedAt || null,
    }));
    return res.json({ ok: true, users: list });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/admin/phone-users — borra una entrada de auth por teléfono (panel ADMIN)
app.delete('/api/admin/phone-users', (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const tel = String((req.body && req.body.telefono) || req.query.telefono || '').replace(/\D/g, '');
    if (!tel) return res.status(400).json({ ok: false, error: 'telefono requerido' });
    const users = loadPhoneAuthUsers();
    // Buscar por clave directa o por campo telefono dentro del registro
    let removed = false;
    if (users[tel]) {
      delete users[tel];
      removed = true;
    } else {
      for (const key of Object.keys(users)) {
        const u = users[key];
        if (u && String(u.telefono || '').replace(/\D/g, '') === tel) {
          delete users[key];
          removed = true;
        }
      }
    }
    if (removed) savePhoneAuthUsers(users);
    // Limpiar cualquier código pendiente
    try { _authCodeStore.delete(tel); } catch (_) {}
    try { _authCodeStore.delete('recover:' + tel); } catch (_) {}
    return res.json({ ok: true, removed });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/admin/broadcast — envía un mensaje promocional por WhatsApp a una
// lista de teléfonos. Protegido por ADMIN_KEY. Espera entre envíos para evitar
// que WhatsApp marque la cuenta como spam.
app.post('/api/admin/broadcast', async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const message = String((req.body && req.body.message) || '').trim();
    const telsRaw = (req.body && Array.isArray(req.body.telefonos)) ? req.body.telefonos : [];

    if (!message) return res.status(400).json({ ok: false, error: 'El mensaje está vacío.' });
    if (message.length > 4000) return res.status(400).json({ ok: false, error: 'El mensaje es demasiado largo (máx. 4000 caracteres).' });

    // Normalizar y deduplicar teléfonos (mínimo 10 dígitos)
    const seen = new Set();
    const telefonos = [];
    for (const t of telsRaw) {
      const d = String(t || '').replace(/\D/g, '');
      if (d.length < 10) continue;
      // Tomar últimos 10 para dedupe (por si llegan con/ sin lada)
      const key = d.slice(-10);
      if (seen.has(key)) continue;
      seen.add(key);
      telefonos.push(d);
    }

    if (!telefonos.length) return res.status(400).json({ ok: false, error: 'No hay teléfonos válidos en la lista.' });
    if (telefonos.length > 500) return res.status(400).json({ ok: false, error: 'Demasiados destinatarios (máx. 500 por envío).' });

    const wa = getWAService();
    if (!wa.connected) {
      return res.status(503).json({ ok: false, error: 'WhatsApp no está conectado. Abre notifi.html y escanea el QR.' });
    }

    const results = [];
    let sent = 0;
    let failed = 0;
    const delayMs = Math.max(400, Math.min(5000, Number(req.body && req.body.delayMs) || 900));

    for (let i = 0; i < telefonos.length; i++) {
      const tel = telefonos[i];
      try {
        await wa.sendToPhone(tel, message);
        sent++;
        results.push({ telefono: tel, ok: true });
      } catch (err) {
        failed++;
        results.push({ telefono: tel, ok: false, error: (err && err.message) || 'Error al enviar' });
      }
      if (i < telefonos.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return res.json({ ok: true, total: telefonos.length, sent, failed, results });
  } catch (e) {
    console.error('[broadcast] error:', e && e.message);
    return res.status(500).json({ ok: false, error: e.message || 'No se pudo enviar el broadcast.' });
  }
});

/**
 * Extrae datos comunes del objeto order de Firestore.
 * Soporta los distintos nombres de campo que usa el frontend.
 */
function parseOrderFields(order) {
  const customer     = order.customer || order.cliente || {};
  const orderNumber  = String(order.orderNumber || order.order_number || order.id || '').trim();
  const deliveryType = String(order.deliveryType || order.type || order.tipoEntrega || '').toLowerCase();
  const isDelivery   = deliveryType === 'delivery' || deliveryType === 'domicilio';
  const payment      = String(order.paymentMethod || order.payment || order.metodoPago || 'Efectivo').trim();
  const notesRaw     = String(order.notes || order.notas || '');
  const items        = Array.isArray(order.items) ? order.items : [];
  const total        = Number(order.total || 0);
  const subtotal     = Number(order.subtotal || 0);
  const deliveryCost = Number(order.deliveryCost || order.costoEnvio || order.delivery || 0);

  // Extraer cambio desde campo notes (ej: "Pago: $100 | Cambio: $10")
  let pagoCon = 0;
  let cambio  = 0;
  const pagoMatch   = notesRaw.match(/Pago(?:\s+con)?\s*:\s*\$?([\d.,]+)/i);
  const cambioMatch = notesRaw.match(/Cambio\s*:\s*\$?([\d.,]+)/i);
  if (pagoMatch)   pagoCon = parseFloat(pagoMatch[1].replace(',', '.'))   || 0;
  if (cambioMatch) cambio  = parseFloat(cambioMatch[1].replace(',', '.')) || 0;
  if (!cambio && pagoCon > 0 && total > 0 && /efectivo/i.test(payment)) {
    cambio = Math.max(0, pagoCon - total);
  }

  // Nota limpia (sin la parte de cambio/pago que ya se extrae arriba)
  const notasClean = notesRaw
    .replace(/Pago(?:\s+con)?\s*:\s*\$?[\d.,]+/gi, '')
    .replace(/Cambio\s*:\s*\$?[\d.,]+/gi, '')
    .replace(/\|\s*\|/g, '|')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim();

  // Link de Maps
  const coords = customer.coordinates || null;
  let mapsUrl = '';
  const RESTAURANT_LAT = 17.9919;
  const RESTAURANT_LNG = -94.3529;
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    // Ruta desde restaurante hasta cliente
    mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${RESTAURANT_LAT},${RESTAURANT_LNG}&destination=${coords.lat},${coords.lng}&travelmode=driving`;
  } else if (customer.address || customer.direccion) {
    const addr = encodeURIComponent(customer.address || customer.direccion || '');
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${addr}`;
  }

  return {
    orderNumber, deliveryType, isDelivery, payment,
    customer, items, total, subtotal, deliveryCost,
    pagoCon, cambio, notasClean, mapsUrl,
  };
}

/**
 * Mensaje para el grupo de COCINA — enfocado en los productos del pedido.
 */
function buildKitchenMessage(order) {
  const { orderNumber, deliveryType, payment, customer, items, total, subtotal, deliveryCost, cambio, pagoCon, notasClean } = parseOrderFields(order);

  let horaMx;
  try {
    horaMx = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short', hour12: false }).format(new Date());
  } catch (_) { horaMx = new Date().toISOString(); }

  const isDelivery  = deliveryType === 'delivery' || deliveryType === 'domicilio';
  const entregaLabel = isDelivery ? '🛵 A domicilio' : '🏠 Para recoger';
  const short = orderNumber ? `#${orderNumber.slice(-6).toUpperCase()}` : '';

  const lines = [];
  lines.push(`🍔 *NUEVO PEDIDO ${short}* — SR & SRA BURGER`);
  lines.push(`🕐 ${horaMx}`);
  lines.push(`📦 Entrega: ${entregaLabel}`);
  if (customer.name || customer.nombre) lines.push(`👤 Cliente: ${customer.name || customer.nombre}`);
  lines.push('─────────────────');
  lines.push('*PRODUCTOS:*');

  if (items.length) {
    items.forEach((item) => {
      const qty  = Number(item.quantity || 1) || 1;
      const name = String(item.name || 'Producto').trim();
      lines.push(`▪ ${qty}x ${name}`);
      const custom = String(item.customizations || item.specifications || '').trim();
      if (custom) {
        custom.split('|').map(s => s.trim()).filter(Boolean).forEach(s => lines.push(`   • ${s}`));
      }
      if (item.notes) lines.push(`   📝 ${item.notes}`);
    });
  } else {
    lines.push('(sin items)');
  }

  lines.push('─────────────────');
  if (subtotal && deliveryCost) {
    lines.push(`Subtotal: ${formatMoney(subtotal)}`);
    lines.push(`Envío: ${formatMoney(deliveryCost)}`);
  }
  lines.push(`💰 *TOTAL: ${formatMoney(total)}*`);
  lines.push(`💳 Pago: ${payment}`);
  if (/efectivo/i.test(payment)) {
    if (pagoCon > 0) lines.push(`   Paga con: ${formatMoney(pagoCon)}`);
    if (cambio  > 0) lines.push(`   🔄 Cambio: ${formatMoney(cambio)}`);
  }
  if (notasClean) lines.push(`📝 Nota: ${notasClean}`);

  return lines.join('\n');
}

/**
 * Mensaje para el grupo de REPARTIDORES — enfocado en datos de entrega + Maps.
 */
function buildDeliveryMessage(order) {
  const { orderNumber, payment, customer, total, cambio, pagoCon, notasClean, mapsUrl } = parseOrderFields(order);

  let horaMx;
  try {
    horaMx = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', timeStyle: 'short', hour12: false }).format(new Date());
  } catch (_) { horaMx = new Date().toISOString(); }

  const short = orderNumber ? `#${orderNumber.slice(-6).toUpperCase()}` : '';

  const lines = [];
  lines.push(`🛵 *ENVÍO ${short}* — SR & SRA BURGER`);
  lines.push(`🕐 ${horaMx}`);
  lines.push('─────────────────');
  lines.push('*DATOS DEL CLIENTE:*');
  if (customer.name || customer.nombre)   lines.push(`👤 ${customer.name || customer.nombre}`);
  if (customer.phone || customer.telefono) lines.push(`📞 ${customer.phone || customer.telefono}`);
  if (customer.address || customer.direccion) lines.push(`📍 ${customer.address || customer.direccion}`);
  if (mapsUrl) {
    lines.push('');
    lines.push(`🗺️ *Ruta Maps:*`);
    lines.push(mapsUrl);
  }
  lines.push('─────────────────');
  lines.push(`💰 *TOTAL A COBRAR: ${formatMoney(total)}*`);
  lines.push(`💳 Método de pago: ${payment}`);
  if (/efectivo/i.test(payment)) {
    if (pagoCon > 0) lines.push(`   Paga con: ${formatMoney(pagoCon)}`);
    if (cambio  > 0) lines.push(`   🔄 *Llevar cambio de: ${formatMoney(cambio)}*`);
    else              lines.push(`   ⚠️ Sin info de cambio (confirmar con cliente)`);
  }
  if (notasClean) lines.push(`📝 Nota: ${notasClean}`);

  return lines.join('\n');
}

// Clientes SSE suscritos a eventos de WhatsApp
const _waSSEClients = new Set();

// GET /api/whatsapp/config — estado actual + config guardada
app.get('/api/whatsapp/config', (_req, res) => {
  try {
    const wa = getWAService();
    res.json({ ok: true, ...wa.getStatus() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/whatsapp/events — SSE en tiempo real (qr, connected, disconnected, reconnecting)
app.get('/api/whatsapp/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Enviar estado inicial
  try {
    const wa = getWAService();
    const status = wa.getStatus();
    if (status.connected) {
      send('connected', { phoneNumber: status.phoneNumber });
    } else if (status.hasQr) {
      send('qr', { qrDataUrl: status.qrDataUrl });
    } else {
      send('reconnecting', {});
    }

    const onQr          = (qrDataUrl) => send('qr', { qrDataUrl });
    const onConnected   = (d) => send('connected', d);
    const onDisconnected = (d) => send('disconnected', d);
    const onReconnecting = (d) => send('reconnecting', d);

    wa.on('qr',           onQr);
    wa.on('connected',    onConnected);
    wa.on('disconnected', onDisconnected);
    wa.on('reconnecting', onReconnecting);

    _waSSEClients.add(res);

    req.on('close', () => {
      wa.off('qr',           onQr);
      wa.off('connected',    onConnected);
      wa.off('disconnected', onDisconnected);
      wa.off('reconnecting', onReconnecting);
      _waSSEClients.delete(res);
    });
  } catch (e) {
    send('disconnected', { error: e.message });
    res.end();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ─── Chat WhatsApp tipo WhatsApp Web (panel del operador) ─────────────────
// ═══════════════════════════════════════════════════════════════════════════
const _waChatJsonParser = express.json({ limit: '8mb' });
const _waChatSSEClients = new Set();

function _broadcastChatUpdate(payload) {
  for (const res of _waChatSSEClients) {
    try { res.write(`event: chat-update\ndata: ${JSON.stringify(payload)}\n\n`); } catch (_) {}
  }
}
try {
  const wa0 = getWAService();
  wa0.on('chat-update', (p) => _broadcastChatUpdate(p));
} catch (_) {}

// SSE: notificación de nuevos mensajes
app.get('/api/whatsapp/chat/events', requireAdminKey, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: hello\ndata: {}\n\n`);
  _waChatSSEClients.add(res);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch(_){} }, 25000);
  req.on('close', () => { clearInterval(ping); _waChatSSEClients.delete(res); });
});

// Lista de chats (resumen)
app.get('/api/whatsapp/chat/list', requireAdminKey, (_req, res) => {
  try {
    const wa = getWAService();
    res.json({ ok: true, chats: wa.listChats() });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Mensajes de un chat
app.get('/api/whatsapp/chat/:jid/messages', requireAdminKey, (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    const wa = getWAService();
    const data = wa.getChatMessages(jid);
    if (!data) return res.status(404).json({ ok: false, error: 'Chat no encontrado.' });
    wa.markChatRead(jid);
    res.json({ ok: true, ...data });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Marcar como leído
app.post('/api/whatsapp/chat/:jid/read', requireAdminKey, (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    const wa = getWAService();
    wa.markChatRead(jid);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Pausar / reanudar bot por chat
app.post('/api/whatsapp/chat/:jid/bot', requireAdminKey, _waChatJsonParser, (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    const paused = !!req.body?.paused;
    const wa = getWAService();
    wa.setBotPaused(jid, paused);
    res.json({ ok: true, paused });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Enviar texto
app.post('/api/whatsapp/chat/:jid/send', requireAdminKey, _waChatJsonParser, async (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    const text = String(req.body?.text || '').slice(0, 4000);
    const wa = getWAService();
    await wa.sendChatText(jid, text);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Enviar imagen (base64 dataURL en body.image)
app.post('/api/whatsapp/chat/:jid/send-image', requireAdminKey, _waChatJsonParser, async (req, res) => {
  try {
    const jid = decodeURIComponent(req.params.jid);
    const dataUrl = String(req.body?.image || '');
    const caption = String(req.body?.caption || '').slice(0, 1000);
    const m = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!m) return res.status(400).json({ ok: false, error: 'image debe ser dataURL base64.' });
    const mime = m[1] || 'image/jpeg';
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length) return res.status(400).json({ ok: false, error: 'Imagen vacía.' });
    if (buf.length > 6 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Imagen demasiado grande (máx 6MB).' });
    const wa = getWAService();
    await wa.sendChatImage(jid, buf, mime, caption);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Imágenes del menú (banco para el bot) ──────────────────────────────────
app.get('/api/whatsapp/menu-images', requireAdminKey, (_req, res) => {
  try {
    const wa = getWAService();
    const list = wa.listMenuImages().map(i => ({ filename: i.filename, caption: i.caption, mimetype: i.mimetype }));
    res.json({ ok: true, images: list });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/whatsapp/menu-images/:filename', (req, res) => {
  try {
    const wa = getWAService();
    const p = wa.getMenuImagePath(req.params.filename);
    if (!p) return res.status(404).end();
    res.sendFile(p);
  } catch (e) { res.status(500).end(); }
});

app.post('/api/whatsapp/menu-images', requireAdminKey, _waChatJsonParser, (req, res) => {
  try {
    const dataUrl = String(req.body?.image || '');
    const filename = String(req.body?.filename || '').trim();
    const caption  = String(req.body?.caption || '').slice(0, 500);
    const m = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!m) return res.status(400).json({ ok: false, error: 'image debe ser dataURL base64.' });
    const ext = m[1].includes('png') ? '.png' : m[1].includes('webp') ? '.webp' : '.jpg';
    const safeName = (filename || `menu_${Date.now()}${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length) return res.status(400).json({ ok: false, error: 'Imagen vacía.' });
    if (buf.length > 6 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Imagen demasiado grande (máx 6MB).' });
    const wa = getWAService();
    const saved = wa.saveMenuImage(safeName, buf, caption);
    res.json({ ok: true, filename: saved });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.delete('/api/whatsapp/menu-images/:filename', requireAdminKey, (req, res) => {
  try {
    const wa = getWAService();
    wa.deleteMenuImage(req.params.filename);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/whatsapp/groups — lista de grupos (solo si está conectado)
app.get('/api/whatsapp/groups', async (_req, res) => {
  try {
    const wa = getWAService();
    const groups = await wa.getGroups();
    res.json({ ok: true, groups });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/whatsapp/set-group — guarda grupo de cocina o repartidores
app.post('/api/whatsapp/set-group', (req, res) => {
  try {
    const { groupId, groupName, type } = req.body || {};
    if (!groupId || !groupName) return res.status(400).json({ ok: false, error: 'groupId y groupName requeridos' });
    const roleType = (type === 'delivery') ? 'delivery' : 'orders';
    getWAService().saveConfig(String(groupId), String(groupName).slice(0, 200), roleType);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/whatsapp/send-test — mensaje de prueba al grupo cocina
app.post('/api/whatsapp/send-test', async (_req, res) => {
  try {
    await getWAService().sendToGroup('🧪 Mensaje de prueba desde el panel — SR & SRA BURGER');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/whatsapp/send-test-delivery — mensaje de prueba al grupo repartidores
app.post('/api/whatsapp/send-test-delivery', async (_req, res) => {
  try {
    await getWAService().sendToDeliveryGroup('🛵 Mensaje de prueba (repartidores) desde el panel — SR & SRA BURGER');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/whatsapp/logout — cierra sesión de WhatsApp
app.delete('/api/whatsapp/logout', async (_req, res) => {
  try {
    await getWAService().logout();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/whatsapp/notify-order — envía un pedido ya guardado a los grupos configurados
// Acepta param `target`: 'kitchen' | 'delivery' | undefined (ambos)
app.post('/api/whatsapp/notify-order', async (req, res) => {
  try {
    const { order, forceAll, target } = req.body || {};
    if (!order) return res.status(400).json({ ok: false, error: 'order requerido' });

    const wa = getWAService();
    if (!wa.connected) return res.status(503).json({ ok: false, error: 'WhatsApp no conectado' });

    const deliveryType = String(order.deliveryType || order.type || order.tipoEntrega || '').toLowerCase();
    const isDelivery   = deliveryType === 'delivery' || deliveryType === 'domicilio';

    const sendKitchen  = !target || target === 'kitchen';
    const sendDelivery = target === 'delivery' || (!target && (isDelivery || forceAll));

    // ── Cocina ────────────────────────────────────────────────────────────
    if (sendKitchen) {
      const kitchenMsg = buildKitchenMessage(order);
      await wa.sendToGroup(kitchenMsg);
      // También enviar a contactos individuales de cocina
      try { await wa.sendToContacts(kitchenMsg, 'kitchen'); } catch (_) {}
    }

    // ── Repartidores ──────────────────────────────────────────────────────
    let deliveryOk    = false;
    let deliveryError = null;
    if (sendDelivery) {
      const deliveryMsg = buildDeliveryMessage(order);
      try {
        await wa.sendToDeliveryGroup(deliveryMsg);
        deliveryOk = true;
      } catch (e) {
        deliveryError = e.message;
      }
      // También enviar a contactos individuales de repartidores
      try { await wa.sendToContacts(deliveryMsg, 'delivery'); } catch (_) {}
    }

    res.json({ ok: true, delivery: deliveryOk, deliveryError });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/whatsapp/add-contact — agrega un contacto individual
app.post('/api/whatsapp/add-contact', (req, res) => {
  try {
    const { phone, name, role } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' });
    getWAService().addContact({ phone: String(phone), name: String(name || phone).slice(0, 100), role: role || 'kitchen' });
    res.json({ ok: true, contacts: getWAService().getContacts() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/whatsapp/remove-contact — elimina un contacto
app.delete('/api/whatsapp/remove-contact', (req, res) => {
  try {
    const { phone, role } = req.body || {};
    if (!phone || !role) return res.status(400).json({ ok: false, error: 'phone y role requeridos' });
    getWAService().removeContact(String(phone), role);
    res.json({ ok: true, contacts: getWAService().getContacts() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/whatsapp/contacts — lista de contactos configurados
app.get('/api/whatsapp/contacts', (_req, res) => {
  try {
    res.json({ ok: true, contacts: getWAService().getContacts() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/whatsapp/send-test-contact — mensaje de prueba a un contacto individual
app.post('/api/whatsapp/send-test-contact', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' });
    await getWAService().sendToPhone(phone, '🧪 Mensaje de prueba desde el panel — SR & SRA BURGER');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Arranque del servidor ────────────────────────────────────────────────────
const PORT = DEFAULT_PORT;
app.listen(PORT, '0.0.0.0', () => {
  printAddresses(PORT);
  // Iniciar servicio de WhatsApp al arrancar
  try { getWAService().init(); } catch (e) { console.error('WhatsApp init error:', e.message); }
});

