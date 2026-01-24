// Vercel Serverless Function: Consultar estado de pago en Mercado Pago
// Endpoint: /api/mercadopago/payment-status
// Requiere:
// - MP_ACCESS_TOKEN o MERCADOPAGO_ACCESS_TOKEN (secreto)

const MP_ACCESS_TOKEN = (process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();

module.exports = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    if (!MP_ACCESS_TOKEN) {
      return res.status(500).json({ ok: false, error: 'Mercado Pago no está configurado (MP_ACCESS_TOKEN).' });
    }

    const q = (req.query || {});
    const order = String(q.order || q.external_reference || '').trim();
    if (!order) {
      return res.status(400).json({ ok: false, error: 'Missing order' });
    }

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
      return res.status(200).json({ ok: true, order, status: 'not_found' });
    }

    const statuses = results
      .map((p) => String((p && p.status) || '').toLowerCase())
      .filter(Boolean);
    const latest = results[0] || {};
    const latestId = latest && latest.id != null ? String(latest.id) : null;
    const latestStatus = latest && latest.status ? String(latest.status).toLowerCase() : null;

    let status = 'unknown';
    if (statuses.includes('approved')) status = 'approved';
    else if (statuses.some((s) => s === 'in_process' || s === 'pending')) status = 'pending';
    else if (statuses.some((s) => s === 'rejected' || s === 'cancelled')) status = 'failure';
    else status = latestStatus || 'unknown';

    return res.status(200).json({ ok: true, order, status, paymentId: latestId, latestStatus });
  } catch (e) {
    console.error('Error consultando estado de pago en Mercado Pago (serverless):', e);
    return res.status(500).json({ ok: false, error: e.message || 'mp-status-failed' });
  }
};
