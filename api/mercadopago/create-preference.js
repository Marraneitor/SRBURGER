// Vercel Serverless Function: Crear preferencia de pago en Mercado Pago
// Endpoint: /api/mercadopago/create-preference
// Requiere:
// - MP_ACCESS_TOKEN o MERCADOPAGO_ACCESS_TOKEN (secreto)
// Opcional:
// - PUBLIC_BASE_URL (para back_urls). Si no se define, se intenta deducir del request.

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const MP_ACCESS_TOKEN = (process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();

function generateOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `${yyyy}${mm}${dd}-${rand}`;
}

function isLocalHostLike(urlString) {
  try {
    const url = new URL(urlString);
    const host = String(url.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.startsWith('192.168.')) return true;
    if (host.startsWith('10.')) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    return false;
  } catch (_) {
    return true;
  }
}

function buildBaseUrl(req) {
  let baseUrl = (process.env.PUBLIC_BASE_URL || req.headers.origin || '').trim();

  if (!baseUrl || baseUrl === 'null') {
    const host = String(req.headers.host || '').trim();
    const protoHeader = String(req.headers['x-forwarded-proto'] || '').trim();
    const proto = protoHeader ? protoHeader.split(',')[0].trim() : 'https';
    if (host) baseUrl = `${proto}://${host}`;
  }

  if (!baseUrl || baseUrl === 'null') {
    baseUrl = `http://localhost:${DEFAULT_PORT}`;
  }
  return baseUrl.replace(/\/$/, '');
}

async function createMercadoPagoPreference(orderPayload, req) {
  if (!MP_ACCESS_TOKEN) {
    throw new Error('Mercado Pago no está configurado. Define MP_ACCESS_TOKEN o MERCADOPAGO_ACCESS_TOKEN en tus variables de entorno.');
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

  const orderNumber = String((orderPayload && (orderPayload.orderNumber || orderPayload.order_id)) || generateOrderNumber());
  const customer = orderPayload && orderPayload.customer ? orderPayload.customer : {};

  let baseUrl = buildBaseUrl(req);
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
  return { orderNumber, preference: data };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const orderNumber = payload.orderNumber || generateOrderNumber();
    const orderData = Object.assign({}, payload.orderData || {}, { orderNumber });

    const { preference } = await createMercadoPagoPreference(orderData, req);

    return res.status(200).json({
      ok: true,
      orderNumber,
      preferenceId: preference && preference.id,
      initPoint: (preference && (preference.init_point || preference.sandbox_init_point)) || null,
      raw: preference,
    });
  } catch (e) {
    console.error('Error creando preferencia de Mercado Pago (serverless):', e);
    const status = e && e.status ? Number(e.status) : 500;
    return res.status(status).json({ ok: false, error: e.message || 'mp-preference-failed' });
  }
};
