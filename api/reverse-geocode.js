// Vercel Serverless Function: reverse geocoding proxy via Nominatim (OpenStreetMap)
// Used by cliente-location.js when the user moves the pin.

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

    const lat = Number((req.query && (req.query.lat ?? req.query.latitude)) || NaN);
    const lng = Number((req.query && (req.query.lng ?? req.query.lon ?? req.query.longitude)) || NaN);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: 'Missing lat/lng' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const r = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'sr-sra-burger/1.0 (+https://github.com/Marraneitor/SRBURGER)'
      }
    });

    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Upstream ${r.status}` });
    const data = await r.json();
    return res.json({ ok: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: e && e.message ? e.message : 'reverse-geocode-failed' });
  }
};
