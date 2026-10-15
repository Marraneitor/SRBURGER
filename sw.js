/**
 * sw.js — Service Worker · SR & SRA BURGER
 * SKILL-10: Cache estratégica para assets estáticos (Cache-First)
 *           y navegación HTML (Network-First con fallback).
 *
 * Versiona el cache incrementando CACHE_VERSION al desplegar cambios.
 */

const CACHE_VERSION = 'sr-v10';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;

// Assets locales que se pre-cachean en el install
const PRECACHE_URLS = [
  '/paginaburger.html',
  '/codigosacc.html',
  '/codigoacc.html',
  '/Publicidad.html',
  '/js/script.js.backup',
  '/js/firebase-config.js',
  '/js/spa-router.js',
  '/js/sr-auth-modal.js',
  '/js/sr-shell.js',
  '/js/sr-image-fallback.js',
  '/styles/sr-ui.css',
  '/styles/variables.css',
];

// ── Install: pre-cachear assets estáticos ────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar caches de versiones anteriores ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('sr-') && k !== STATIC_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar solicitudes cross-origin a Firebase/Auth/APIs
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('mercadopago') ||
    url.pathname.startsWith('/api/')
  ) {
    return; // dejar que el navegador lo maneje
  }

  // Imágenes de Imgur → Cache-First con deduplicated IMAGE_CACHE
  // Fotos locales de productos (/img/...) → mismo cache de imágenes
  if (url.hostname === 'i.imgur.com' || (url.origin === self.location.origin && url.pathname.startsWith('/img/'))) {
    event.respondWith(_cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Assets estáticos locales → Cache-First
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com')
  ) {
    event.respondWith(_cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navegación HTML → Network-First con fallback a cache
  if (request.mode === 'navigate') {
    event.respondWith(_networkFirst(request, STATIC_CACHE));
    return;
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function _cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    return cached || new Response('Sin conexión', { status: 503 });
  }
}

async function _networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) || new Response('Sin conexión', { status: 503 });
  }
}
