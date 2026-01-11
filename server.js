// Simple local server with Twilio order endpoint for local development
// Usage: put your .env in project root with TWILIO_* and OWNER_PHONE
// Run: npm install; npm start (serves http://localhost:3000)

const nodePath = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const firebaseAdmin = require('firebase-admin');

dotenv.config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const TWILIO_MOCK = String(process.env.TWILIO_MOCK || '').toLowerCase() === '1' || String(process.env.TWILIO_MOCK || '').toLowerCase() === 'true';

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

function requireAdminKey(req, res) {
  const expected = (process.env.ADMIN_KEY || '').trim();
  if (!expected) return true; // no auth configured
  const provided = String(req.get('x-admin-key') || '').trim();
  if (provided && provided === expected) return true;
  res.status(401).json({ ok: false, error: 'Unauthorized' });
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

// Basic CORS for local dev (same-origin will also work)
app.use(cors());
app.use(express.json({ limit: '1mb' }));

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

// Twilio client setup (lazily required only when needed)
function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (TWILIO_MOCK) return null;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  const twilio = require('twilio');
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

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

async function sendOwnerMessage(message) {
  const client = getTwilioClient();
  const channel = (process.env.TWILIO_CHANNEL || 'whatsapp').toLowerCase();
  const contentSid = (process.env.TWILIO_CONTENT_SID || '').trim();
  // Aceptar múltiples nombres de variables y normalizar (sin prefijo whatsapp:)
  const normalize = (num) => {
    if (!num) return '';
    let n = String(num).trim().replace(/^whatsapp:/i, '');
    // eliminar espacios, guiones, paréntesis y caracteres no numéricos salvo '+'
    n = n.replace(/[^\d+]/g, '');
    if (n.startsWith('00')) n = '+' + n.slice(2);
    if (!n.startsWith('+') && /^\d+$/.test(n)) n = '+' + n; // forzar E.164
    return n;
  };
  const from = normalize(process.env.TWILIO_FROM || process.env.TWILIO_WHATSAPP_FROM || process.env.SMS_FROM);
  const to = normalize(process.env.OWNER_PHONE || process.env.STORE_WHATSAPP_TO || process.env.SMS_TO);

  // Modo mock si falta algo o se forzó con TWILIO_MOCK
  if (TWILIO_MOCK || !client || !from || !to) {
    console.warn('[MOCK] Envío Twilio simulado. Configura .env para envío real.');
    console.warn('Faltan:', { hasFrom: !!from, hasTo: !!to, hasClient: !!client });
    console.warn('Mensaje al dueño:\n' + message);
    return { sid: `mock-${Date.now()}`, mock: true };
  }

  const wrap = (num) => (channel === 'whatsapp' ? `whatsapp:${num}` : num);
  try {
    const payload = contentSid && channel === 'whatsapp'
      ? { from: wrap(from), to: wrap(to), contentSid }
      : { from: wrap(from), to: wrap(to), body: message };
    console.log('[Twilio] Enviando mensaje', { channel, from: payload.from, to: payload.to, usingTemplate: !!payload.contentSid });
    const res = await client.messages.create(payload);
    console.log('[Twilio] Enviado OK', { sid: res.sid, status: res.status });
    return res;
  } catch (e) {
    // Adjuntar detalles comunes de Twilio
    const errInfo = {
      message: e.message,
      code: e.code,
      status: e.status,
      moreInfo: e.moreInfo,
    };
    console.error('[Twilio] Error al enviar', errInfo);
    const wrapped = new Error(`Twilio error${e.code ? ' ' + e.code : ''}: ${e.message}${e.moreInfo ? ' (' + e.moreInfo + ')' : ''}`);
    wrapped.status = e.status || 502;
    throw wrapped;
  }
}

async function handleSendOrder(req, res) {
  try {
    const payload = req.body || {};
    // Garantizar número de orden si faltó en el payload del cliente
    if (!payload.orderNumber) {
      payload.orderNumber = generateOrderNumber();
    }
    const msg = buildOwnerMessage(payload);
    const twilioRes = await sendOwnerMessage(msg);
    res.json({ ok: true, sid: twilioRes.sid, orderNumber: payload.orderNumber });
  } catch (err) {
    console.error('Error enviando mensaje Twilio:', err);
    const status = (err.status && Number(err.status)) || 500;
    res.status(status).json({ ok: false, error: err.message || 'Error interno' });
  }
}

app.post('/api/send-order', handleSendOrder);
app.post('/api/send-orden', handleSendOrder);

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
app.get('/api/config-check', (_req, res) => {
  const channel = (process.env.TWILIO_CHANNEL || 'whatsapp').toLowerCase();
  const normalize = (num) => {
    if (!num) return '';
    let n = String(num).trim().replace(/^whatsapp:/i, '');
    n = n.replace(/[^\d+]/g, '');
    if (n.startsWith('00')) n = '+' + n.slice(2);
    if (!n.startsWith('+') && /^\d+$/.test(n)) n = '+' + n;
    return n;
  };
  const normFrom = normalize(process.env.TWILIO_FROM || process.env.TWILIO_WHATSAPP_FROM || process.env.SMS_FROM);
  const normTo = normalize(process.env.OWNER_PHONE || process.env.STORE_WHATSAPP_TO || process.env.SMS_TO);
  res.json({
    ok: true,
    mock: TWILIO_MOCK,
    has: {
      TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_FROM: !!process.env.TWILIO_FROM,
      OWNER_PHONE: !!process.env.OWNER_PHONE,
      TWILIO_CHANNEL: process.env.TWILIO_CHANNEL || 'whatsapp'
    },
    channel,
    from: normFrom,
    to: normTo,
    twilioReady: !TWILIO_MOCK && !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!normFrom && !!normTo
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

function startServer(port, retries = 3) {
  const server = app.listen(port, '0.0.0.0', () => printAddresses(port));
  server.on('error', (err) => {
    if ((err && err.code) === 'EADDRINUSE' && retries > 0) {
      const next = port + 1;
      console.warn(`Puerto ${port} en uso, intentando ${next}...`);
      startServer(next, retries - 1);
    } else {
      console.error('No se pudo iniciar el servidor:', err);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT);
