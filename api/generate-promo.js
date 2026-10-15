// Vercel Serverless Function: /api/generate-promo
// Genera texto persuasivo de promoción para WhatsApp usando Gemini.
// Requiere: GEMINI_API_KEY  +  ADMIN_KEY (header x-admin-key)

const { applyCors, checkRateLimit, requireAdminKey, getClientIp } = require('./_security');

const SYSTEM_PROMPT = `Eres un copywriter experto de **Sr. y Sra. Burger**, dark kitchen de hamburguesas artesanales en Minatitlán, Veracruz.
Tu tarea: redactar mensajes BREVES de promoción para enviar por WhatsApp a clientes registrados.

REGLAS ESTRICTAS:
- Responde SIEMPRE en JSON válido con esta forma exacta:
  {"tipo":"TÍTULO CORTO EN MAYÚSCULAS","texto":"Cuerpo del mensaje"}
- "tipo": 3 a 6 palabras, mayúsculas, atractivo (ej. "PROMO DOBLE BURGER HOY", "MARTES DE LOCURA").
- "texto": 2 a 4 líneas. Tono cercano, mexicano, energético. Puedes usar 1-3 emojis relevantes (🍔🔥🎉🥤🍟). Incluye un llamado a la acción claro (pide ya, ordena ahora, aprovecha hoy).
- NO incluyas saludo (Hola...) ni firma (SR & SRA BURGER) — eso lo agrega el sistema automáticamente.
- NO inventes precios ni productos si no se proporcionan en el "Brief". Si no hay precios, escribe sin números específicos.
- NO uses comillas dobles dentro de los valores JSON; reemplaza por comillas simples si las necesitas.
- NO añadas markdown, ni \`\`\`json, solo el objeto JSON puro.

CATÁLOGO DE REFERENCIA (úsalo si el brief lo permite):
🍔 Sencilla $90 · Premium $105 · BBQ Beacon $115 · Alohawai $120 · Chistorraburger $125 · Salchiburger $125 · Choriargentina $125 · Guacamole $140 · Boneless Burger $150
🌭 Hot Dog Jumbo $65
🎁 Combo Duo $190 · Triple Dog $215 · Combo Boneless $215 · Combo Amigos $380 · Combo Familiar $680
🍟 Papas Francesas/Gajo M $65/XL $130 · Salchipapas Parmesanas M $90/XL $140 · Aros M $50/XL $95
📍 Coahuila #36, Col. Emiliano Zapata, Minatitlán · Envío $8/km`;

module.exports = async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  // Rate limit moderado por IP
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, 'generate-promo', { max: 20, windowMs: 60_000 })) {
    return res.status(429).json({ ok: false, error: 'Demasiadas solicitudes. Espera un momento.' });
  }

  // Auth admin
  if (!requireAdminKey(req, res)) return;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'GEMINI_API_KEY no configurada.' });
  }

  const idea = String(req.body?.idea || '').replace(/<[^>]*>/g, '').trim().slice(0, 500);
  const tipoActual = String(req.body?.tipo || '').replace(/<[^>]*>/g, '').trim().slice(0, 120);
  const textoActual = String(req.body?.texto || '').replace(/<[^>]*>/g, '').trim().slice(0, 800);

  // Construir el "brief" enviado al modelo
  const briefParts = [];
  if (idea) briefParts.push(`Idea / objetivo: ${idea}`);
  if (tipoActual) briefParts.push(`Título actual (mejóralo si conviene): ${tipoActual}`);
  if (textoActual) briefParts.push(`Texto actual (úsalo como base, hazlo más persuasivo): ${textoActual}`);
  if (!briefParts.length) {
    briefParts.push('Genera una promoción atractiva del día para llenar el local. Elige libremente entre el catálogo.');
  }
  const userMessage = `Brief:\n${briefParts.join('\n')}\n\nResponde solo con el JSON solicitado.`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parsePromoJson(raw);
    if (!parsed) {
      console.error('[generate-promo] Respuesta no parseable:', raw.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'La IA no devolvió un JSON válido.' });
    }

    return res.json({ ok: true, ...parsed });
  } catch (e) {
    console.error('[generate-promo] Error interno:', e.message);
    return res.status(500).json({ ok: false, error: 'Error interno del generador.' });
  }
};

function parsePromoJson(raw) {
  if (!raw) return null;
  let txt = String(raw).trim();
  // Quitar fences de markdown si vinieran
  txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    const obj = JSON.parse(txt);
    const tipo = String(obj.tipo || '').trim();
    const texto = String(obj.texto || '').trim();
    if (!tipo && !texto) return null;
    return { tipo: tipo.slice(0, 120), texto: texto.slice(0, 1500) };
  } catch (_) {
    // Intentar extraer JSON entre llaves
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const obj = JSON.parse(m[0]);
        return {
          tipo: String(obj.tipo || '').trim().slice(0, 120),
          texto: String(obj.texto || '').trim().slice(0, 1500),
        };
      } catch (_) {}
    }
    return null;
  }
}
