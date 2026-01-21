// Vercel Serverless Function: Receives order payload.
// Nota: Twilio fue removido. Este endpoint se mantiene para compatibilidad con el frontend.
// Optional:
// - PUBLIC_BASE_URL (para link de rastreo)

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
  const rand = Math.floor(Math.random() * 900) + 100;
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
  const origin = body.origin || 'Web';
  const orderNumber = body.orderNumber || body.order_number || body.numOrden || '';
  const publicBase = process.env.PUBLIC_BASE_URL || '';

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
    if (!payload.orderNumber) payload.orderNumber = generateOrderNumber();
    const msg = buildOwnerMessage(payload);
    console.log('[Pedido] Recibido (sin Twilio)\n' + msg);
    return res.status(200).json({ ok: true, orderNumber: payload.orderNumber });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : 'Failed to send message' });
  }
};
