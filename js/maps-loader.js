// Dynamic Google Maps JS API loader
// How to use (local dev):
// 1) Paste your API key in the console:
//    localStorage.setItem('gmaps_api_key', 'YOUR_GOOGLE_MAPS_API_KEY')
// 2) Reload the page. The script will be injected automatically.
// Optional: pass ?gmaps_key=YOUR_KEY in the URL to test quickly.

(function () {
  const KEY_LS = 'gmaps_api_key';
  const isDevHost = (() => {
    try {
      return location.protocol === 'file:' ||
             location.hostname === 'localhost' ||
             location.hostname === '127.0.0.1' ||
             location.hostname === '0.0.0.0';
    } catch { return false; }
  })();

  // Allow setting the key from console easily
  window.setGoogleMapsKey = function setGoogleMapsKey(key) {
    if (!key || typeof key !== 'string') {
      console.warn('[MapsLoader] Llave inválida.');
      return;
    }
    localStorage.setItem(KEY_LS, key.trim());
    console.info('[MapsLoader] Clave guardada en localStorage. Recargando...');
    location.reload();
  };

  function getKeyFromUrl() {
    try {
      const p = new URLSearchParams(location.search);
      const k = p.get('gmaps_key');
      return k && k.trim();
    } catch {
      return null;
    }
  }

  function getKey() {
    // Priority: explicit global -> URL -> localStorage
    if (typeof window.GMAPS_API_KEY === 'string' && window.GMAPS_API_KEY.trim()) {
      return window.GMAPS_API_KEY.trim();
    }
    const fromUrl = getKeyFromUrl();
    if (fromUrl) {
      // Persist for next loads
      try { localStorage.setItem(KEY_LS, fromUrl); } catch {}
      return fromUrl;
    }
    try {
      const k = localStorage.getItem(KEY_LS);
      if (k && k.trim()) return k.trim();
    } catch {}
    return null;
  }

  function injectMapsScript(key) {
    if (!key) {
      console.log('ℹ️ Google Maps deshabilitado - continuando sin mapa (entrada de dirección manual disponible).');
      // Llamar directamente la inicialización sin Maps
      if (typeof window.initializeGoogleMaps === 'function') {
        try { 
          console.log('🔄 Inicializando sistema sin Google Maps...');
          window.initializeGoogleMaps(); 
        } catch (e) {
          console.warn('Error inicializando sin Maps:', e);
        }
      }
      return;
    }
    
    console.log('🗺️ Cargando Google Maps con API key autorizada...');
    
    // Prevent duplicate loads
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('[MapsLoader] Google Maps ya está disponible.');
      if (typeof window.initializeGoogleMaps === 'function') {
        try { window.initializeGoogleMaps(); } catch {}
      }
      return;
    }

    const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = function () {
      console.log('✅ Google Maps JS cargado exitosamente');
      if (typeof window.initializeGoogleMaps === 'function') {
        try { window.initializeGoogleMaps(); } catch (e) { console.warn('initializeGoogleMaps error:', e); }
      }
    };
    s.onerror = function () {
      console.error('❌ Error cargando Google Maps. Continuando sin mapa.');
      // Inicializar sin Maps en caso de error
      if (typeof window.initializeGoogleMaps === 'function') {
        try { 
          console.log('🔄 Inicializando sin Google Maps tras error...');
          window.initializeGoogleMaps(); 
        } catch (e) {
          console.warn('Error inicializando sin Maps tras error:', e);
        }
      }
    };
    document.head.appendChild(s);
  }

  // Kick off
  const key = getKey();
  injectMapsScript(key);

  // (UI de pegado de API key eliminada para no distraer al cliente)

  // Si la API devuelve error de autenticación (por ejemplo RefererNotAllowedMapError)
  // Google llama a esta función global si existe
  window.gm_authFailure = function () {
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #FF6B6B');
    console.log('%c⚠️ Google Maps - Configuración Requerida', 'color: #FF6B6B; font-weight: bold; font-size: 14px');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #FF6B6B');
    console.log('%c📍 URL actual:', 'color: #4ECDC4; font-weight: bold', window.location.href);
    console.log('%c\n🔧 Para habilitar Google Maps:', 'color: #FFE66D; font-weight: bold');
    console.log('%c   1. Abre: https://console.cloud.google.com/google/maps-apis/credentials', 'color: #95E1D3');
    console.log('%c   2. Edita tu API key', 'color: #95E1D3');
    console.log('%c   3. En "Website restrictions" agrega:', 'color: #95E1D3');
    console.log('%c      → http://192.168.100.159:8000/*', 'color: #A8E6CF; font-weight: bold');
    console.log('%c   4. Guarda y espera 5 minutos', 'color: #95E1D3');
    console.log('%c   5. Recarga esta página\n', 'color: #95E1D3');
    console.log('%c✅ BUENAS NOTICIAS: La página funciona perfectamente sin Google Maps', 'color: #66BB6A; font-weight: bold');
    console.log('%c   • Puedes escribir direcciones manualmente', 'color: #81C784');
    console.log('%c   • El cálculo de distancia sigue funcionando', 'color: #81C784');
    console.log('%c   • Todos los pedidos se procesan normalmente', 'color: #81C784');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color: #FF6B6B');
    
    // Limpiar la API key para evitar futuros intentos
    try {
      localStorage.removeItem('gmaps_api_key');
      if (window.GMAPS_API_KEY) {
        delete window.GMAPS_API_KEY;
      }
    } catch {}
    
    // Inicializar sin Maps si la función está disponible
    if (typeof window.initializeGoogleMaps === 'function') {
      try { 
        window.initializeGoogleMaps(); 
      } catch (e) {
        console.warn('Error inicializando sin Maps:', e);
      }
    }
  };
})();
