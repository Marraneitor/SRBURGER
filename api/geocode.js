// Vercel Serverless Function: simple geocoding proxy via Nominatim (OpenStreetMap)
// Used by cliente-location.js to avoid CORS issues.

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

    const q = String((req.query && req.query.q) || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'Missing q' });

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=1`;
    const r = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        // Per Nominatim policy, provide a UA string identifying the app.
        'User-Agent': 'sr-sra-burger/1.0 (+https://github.com/Marraneitor/SRBURGER)'
      }
    });
    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Upstream ${r.status}` });
    const data = await r.json();
    return res.json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : 'geocode-failed' });
  }
};
