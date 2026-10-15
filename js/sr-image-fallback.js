/**
 * sr-image-fallback.js — Respaldo global para imágenes rotas.
 *
 * Contexto: las fotos de productos estaban en Firebase Storage del proyecto
 * "manager-d860c", que responde 402 (cuenta de facturación cerrada).
 *
 * Estrategia al fallar una <img>:
 *   1. Si la URL es de Firebase Storage → intentar la copia local en
 *      /img/productos/<nombre-del-archivo> (servida por Vercel).
 *   2. Si eso también falla (o no aplica) → mostrar un placeholder de marca
 *      en lugar de dejar un hueco gris.
 *
 * Script clásico (no módulo) a propósito: debe cargarse síncrono en <head>
 * para registrar el listener antes de que se pidan las primeras imágenes.
 */
(function () {
  'use strict';

  const LOCAL_DIR = '/img/productos/';

  // Nombre en Firebase Storage → archivo real en /img/productos/.
  // Al agregar una foto nueva a la carpeta, registrarla aquí.
  const LOCAL_FILES = {
    'BBQ.png': 'BBQ.webp',
    'Boneles.png': 'Boneles.webp',
    'BonelesBurger.png': 'BonelesBurger.webp',
    'Chistorra.png': 'Chistorra.webp',
    'ChoriArgentina.png': 'ChoriArgentina.webp',
    'Cocacola 1.75.png': 'Cocacola 1.75.webp',
    'Cocacola 3L.png': 'Cocacola 3L.webp',
    'Cocacola 600.png': 'Cocacola 600.webp',
    'Cocacola SIN AZUCAR 2 L.png': 'Cocacola SIN AZUCAR 2 L.webp',
    'Combo Duop.png': 'Combo Duop.webp',
    'Combo Familiar.png': 'Combo Familiar.webp',
    'ComboAmigos.png': 'ComboAmigos.webp',
    'ComboBoneles.png': 'ComboBoneles.webp',
    'ComboTripledog.png': 'ComboTripledog.webp',
    'Francesas.png': 'Francesas.webp',
    'Gajo.png': 'Gajo.webp',
    'Guacamole.png': 'Guacamole.webp',
    'Hawaiana.png': 'Hawaiana.webp',
    'Hotdog.png': 'Hotdog.webp',
    'Premium.png': 'Premium.webp',
    'Salchi.png': 'Salchi.webp',
    'Sencilla.png': 'Sencilla.webp'
  };

  const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#16A34A"/><stop offset="1" stop-color="#0B1220"/>' +
      '</linearGradient></defs>' +
      '<rect width="400" height="300" fill="url(#g)"/>' +
      '<text x="200" y="175" font-size="110" text-anchor="middle">🍔</text>' +
    '</svg>'
  );

  // Firebase Storage: .../v0/b/<bucket>/o/<archivo>?alt=media&token=...
  function toLocalUrl(src) {
    try {
      const url = new URL(src, location.href);
      if (url.hostname !== 'firebasestorage.googleapis.com') return null;
      const match = url.pathname.match(/\/o\/(.+)$/);
      if (!match) return null;
      const fileName = decodeURIComponent(match[1]).split('/').pop();
      const localFile = LOCAL_FILES[fileName];
      return localFile ? LOCAL_DIR + encodeURIComponent(localFile) : null;
    } catch (_) {
      return null;
    }
  }

  function handleImageError(event) {
    const img = event.target;
    if (!img || img.tagName !== 'IMG') return;

    const step = img.dataset.srFallback || '';
    if (step === 'done') return;

    // Evita que el onerror inline (que oculta la imagen) se ejecute
    event.stopImmediatePropagation();

    if (!step) {
      const local = toLocalUrl(img.currentSrc || img.src);
      if (local) {
        img.dataset.srFallback = 'local';
        img.removeAttribute('srcset');
        img.src = local;
        return;
      }
    }

    img.dataset.srFallback = 'done';
    img.removeAttribute('srcset');
    img.style.removeProperty('display');
    img.src = PLACEHOLDER;
  }

  // Los eventos "error" de <img> no burbujean: escuchar en fase de captura
  window.addEventListener('error', handleImageError, true);

  window.srResolveLocalImage = toLocalUrl;
})();
