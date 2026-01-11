(function () {
  const RESTAURANT_LOCATION = { lat: 18.022398, lng: -94.546974 };
  const DELIVERY_RATE_PER_KM = 8;
  const MAX_DELIVERY_DISTANCE_KM = 12;

  let mapsReady = false;
  let geocoder = null;
  let distanceService = null;

  let map = null;
  let marker = null;

  let currentSelection = null; // { lat, lng, formattedAddress, sourceQuery }
  let currentClientUid = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg, kind) {
    const el = $('client-distance-result');
    if (!el) return;
    const base = 'text-sm mt-3 p-3 rounded-lg border';
    const styles =
      kind === 'error'
        ? ' bg-red-50 border-red-200 text-red-800'
        : kind === 'ok'
          ? ' bg-green-50 border-green-200 text-green-800'
          : ' bg-gray-50 border-gray-200 text-gray-700';
    el.className = base + styles;
    el.innerHTML = msg;
  }

  function setSaveMessage(text, kind) {
    const el = $('client-save-msg');
    if (!el) return;
    el.className =
      kind === 'error'
        ? 'text-xs text-red-700'
        : kind === 'ok'
          ? 'text-xs text-green-700'
          : 'text-xs text-gray-500';
    el.textContent = text || '';
  }

  function updateSaveButtonState() {
    const btn = $('client-save-btn');
    const addBtn = $('client-add-address-btn');
    if (!btn) return;
    const hasSelection = !!(
      currentSelection &&
      isFinite(Number(currentSelection.lat)) &&
      isFinite(Number(currentSelection.lng))
    );
    const hasAuth = !!(
      window.firebaseClientManager &&
      typeof window.firebaseClientManager.getCurrentUser === 'function' &&
      window.firebaseClientManager.getCurrentUser()
    );
    btn.disabled = !(hasSelection && hasAuth);
    if (addBtn) addBtn.disabled = !(hasSelection && hasAuth);
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function kmToFee(distanceKm) {
    if (typeof distanceKm !== 'number' || !isFinite(distanceKm)) return null;
    if (distanceKm <= 0) return 0;
    if (distanceKm > MAX_DELIVERY_DISTANCE_KM) return null;
    // Redondeo al entero más cercano: <0.5 baja, >=0.5 sube
    const kmToCharge = Math.max(1, Math.round(distanceKm));
    return kmToCharge * DELIVERY_RATE_PER_KM;
  }

  function canUseDistanceMatrix() {
    return !!(
      window.google &&
      window.google.maps &&
      window.google.maps.DistanceMatrixService &&
      distanceService
    );
  }

  function distanceMatrixRequest(originLatLng, destLatLng) {
    return new Promise((resolve, reject) => {
      try {
        distanceService.getDistanceMatrix(
          {
            origins: [originLatLng],
            destinations: [destLatLng],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false,
          },
          (response, status) => {
            if (status !== 'OK' || !response) {
              reject(new Error(`DistanceMatrix status: ${status}`));
              return;
            }
            const row = response.rows && response.rows[0];
            const elem = row && row.elements && row.elements[0];
            if (!elem || elem.status !== 'OK') {
              reject(new Error(`DistanceMatrix element status: ${elem && elem.status}`));
              return;
            }
            resolve(elem);
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  async function getDeliveryDistanceKmAndDuration(customerLat, customerLng) {
    if (canUseDistanceMatrix()) {
      try {
        const origin = new google.maps.LatLng(
          RESTAURANT_LOCATION.lat,
          RESTAURANT_LOCATION.lng
        );
        const dest = new google.maps.LatLng(customerLat, customerLng);
        const elem = await distanceMatrixRequest(origin, dest);
        const distanceKm =
          elem.distance && typeof elem.distance.value === 'number'
            ? elem.distance.value / 1000
            : null;
        const durationMin =
          elem.duration && typeof elem.duration.value === 'number'
            ? Math.round(elem.duration.value / 60)
            : null;
        if (typeof distanceKm === 'number' && isFinite(distanceKm)) {
          return { distanceKm, durationMin, source: 'driving' };
        }
      } catch (e) {
        console.warn('[cliente-location] DistanceMatrix falló, usando Haversine:', e);
      }
    }

    const distanceKm = haversineKm(
      RESTAURANT_LOCATION.lat,
      RESTAURANT_LOCATION.lng,
      customerLat,
      customerLng
    );
    return { distanceKm, durationMin: null, source: 'haversine' };
  }

  async function geocodeWithGoogle(query) {
    return new Promise((resolve, reject) => {
      if (!geocoder) return reject(new Error('Geocoder no disponible'));
      geocoder.geocode({ address: query, region: 'MX' }, (results, status) => {
        if (status !== 'OK' || !results || !results[0]) {
          reject(new Error(`Geocoder status: ${status}`));
          return;
        }
        const loc = results[0].geometry && results[0].geometry.location;
        if (!loc) {
          reject(new Error('Sin geometry.location'));
          return;
        }
        resolve({
          lat: loc.lat(),
          lng: loc.lng(),
          formattedAddress: results[0].formatted_address || query,
        });
      });
    });
  }

  async function geocodeWithServer(query) {
    const url = `/api/geocode?q=${encodeURIComponent(query)}`;
    const r = await fetch(url);
    const json = await r.json();
    if (!r.ok || !json || !json.ok) {
      throw new Error((json && json.error) || `Geocode HTTP ${r.status}`);
    }
    const first = json.data && json.data[0];
    if (!first) throw new Error('Sin resultados de geocoding');
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!isFinite(lat) || !isFinite(lng)) throw new Error('Coordenadas inválidas');
    return { lat, lng, formattedAddress: first.display_name || query };
  }

  function ensureMap() {
    const wrap = $('client-map-section');
    const mapDiv = $('client-mini-map');
    if (!wrap || !mapDiv) return null;

    wrap.classList.remove('hidden');

    if (!mapsReady || !(window.google && window.google.maps)) {
      mapDiv.innerHTML =
        '<div class="w-full h-full flex items-center justify-center text-sm text-gray-600">Google Maps no está disponible.</div>';
      return null;
    }

    if (!map) {
      map = new google.maps.Map(mapDiv, {
        center: new google.maps.LatLng(
          RESTAURANT_LOCATION.lat,
          RESTAURANT_LOCATION.lng
        ),
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      map.addListener('click', (e) => {
        if (!e || !e.latLng) return;
        setMarkerPosition(e.latLng);
      });
    }

    if (!marker) {
      marker = new google.maps.Marker({
        map,
        position: new google.maps.LatLng(
          RESTAURANT_LOCATION.lat,
          RESTAURANT_LOCATION.lng
        ),
        draggable: true,
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) setMarkerPosition(pos);
      });
    }

    return { map, marker };
  }

  async function renderDistanceAndCost(lat, lng) {
    const { distanceKm, durationMin, source } = await getDeliveryDistanceKmAndDuration(
      lat,
      lng
    );
    const fee = kmToFee(distanceKm);

    if (fee === null) {
      setStatus(
        `La distancia es de <strong>${distanceKm.toFixed(
          1
        )} km</strong>. <strong>Fuera de cobertura</strong> (máximo ${MAX_DELIVERY_DISTANCE_KM} km).`,
        'error'
      );
      return;
    }

    const etaText =
      typeof durationMin === 'number' && isFinite(durationMin) && durationMin > 0
        ? ` • Tiempo aprox: <strong>${durationMin} min</strong>`
        : '';
    const modeText = source === 'driving' ? 'ruta en carro' : 'aprox.';

    setStatus(
      `La distancia es de <strong>${distanceKm.toFixed(
        1
      )} km</strong> (${modeText}), cobra <strong>${DELIVERY_RATE_PER_KM} pesos</strong> por KM. <br/>
       Costo estimado: <strong>$${fee}</strong> (redondeo al entero más cercano)${etaText}`,
      'ok'
    );
  }

  function setMarkerPosition(latLng) {
    if (!marker || !map) return;
    marker.setPosition(latLng);
    map.panTo(latLng);
    currentSelection = {
      lat: latLng.lat(),
      lng: latLng.lng(),
      formattedAddress:
        ($('client-selected-address') && $('client-selected-address').textContent) || null,
      sourceQuery: ($('client-address-input') && $('client-address-input').value) || null,
    };
    updateSaveButtonState();
    renderDistanceAndCost(latLng.lat(), latLng.lng());
  }

  async function handleVerify() {
    const input = $('client-address-input');
    if (!input) return;

    const qRaw = String(input.value || '').trim();
    if (!qRaw) {
      setStatus('Escribe tu dirección para verificar.', 'error');
      return;
    }

    setStatus('Verificando dirección y calculando distancia…', 'info');

    ensureMap();

    const q = /minatitl[aá]n/i.test(qRaw) ? qRaw : `${qRaw}, Minatitlán, Veracruz`;

    try {
      const geo = mapsReady && geocoder ? await geocodeWithGoogle(q) : await geocodeWithServer(q);

      const mapReady = ensureMap();
      if (mapReady && map) {
        const pos = new google.maps.LatLng(geo.lat, geo.lng);
        map.setCenter(pos);
        map.setZoom(16);
        setMarkerPosition(pos);
      } else {
        // Sin maps: al menos mostrar distancia/costo con el punto geocodificado
        await renderDistanceAndCost(geo.lat, geo.lng);
      }

      const note = $('client-selected-address');
      if (note) {
        note.textContent = geo.formattedAddress || q;
      }

      currentSelection = {
        lat: geo.lat,
        lng: geo.lng,
        formattedAddress: geo.formattedAddress || q,
        sourceQuery: qRaw,
      };
      setSaveMessage('', 'info');
      updateSaveButtonState();
    } catch (e) {
      console.error('[cliente-location] verify error:', e);
      setStatus('No se pudo verificar esa dirección. Intenta con más detalles (calle, número y colonia).', 'error');
      setSaveMessage('', 'info');
    }
  }

  async function handleSaveLocation() {
    const btn = $('client-save-btn');
    if (!btn) return;
    if (!currentSelection) {
      setSaveMessage('Primero verifica tu dirección y ajusta el pin.', 'error');
      return;
    }
    if (!window.firebaseClientManager || typeof window.firebaseClientManager.saveClientLocation !== 'function') {
      setSaveMessage('No se pudo conectar con tu cuenta (Firebase). Recarga la página.', 'error');
      return;
    }

    btn.disabled = true;
    btn.classList.add('opacity-60', 'cursor-wait');
    setSaveMessage('Guardando ubicación…', 'info');

    try {
      // Calcular distancia y costo antes de guardar
      let calc = null;
      let fee = null;
      let durationMin = null;
      try {
        calc = await getDeliveryDistanceKmAndDuration(currentSelection.lat, currentSelection.lng);
        const distanceKm = calc && typeof calc.distanceKm === 'number' ? calc.distanceKm : null;
        durationMin = calc && typeof calc.durationMin === 'number' ? calc.durationMin : null;
        fee = kmToFee(distanceKm);
      } catch (_) {}

      await window.firebaseClientManager.saveClientLocation({
        formattedAddress: currentSelection.formattedAddress,
        lat: currentSelection.lat,
        lng: currentSelection.lng,
        sourceQuery: currentSelection.sourceQuery,
        distanceKm: calc && calc.distanceKm != null ? calc.distanceKm : null,
        deliveryPrice: fee != null ? fee : null,
        durationMin: durationMin != null ? durationMin : null,
      });
      setSaveMessage('Ubicación guardada en tu cuenta.', 'ok');

      // Persistir también en localStorage para uso en checkout sin sesión
      try {
        if (fee != null && calc && typeof calc.distanceKm === 'number') {
          const payload = {
            formatted_address: currentSelection.formattedAddress,
            lat: currentSelection.lat,
            lng: currentSelection.lng,
            distance: calc.distanceKm,
            deliveryPrice: fee,
            savedAt: Date.now()
          };
          localStorage.setItem('clientDeliveryInfo', JSON.stringify(payload));
        }
      } catch (_) {}

      try {
        document.dispatchEvent(new CustomEvent('sr:clientLocationSaved'));
      } catch (_) {}
    } catch (e) {
      console.error('[cliente-location] save location error:', e);
      setSaveMessage(e && e.message ? e.message : 'No se pudo guardar. Intenta de nuevo.', 'error');
    } finally {
      btn.classList.remove('cursor-wait');
      updateSaveButtonState();
    }
  }

  async function handleAddAddress() {
    const btn = $('client-add-address-btn');
    if (!btn) return;
    if (!currentSelection) {
      setSaveMessage('Primero verifica tu dirección y ajusta el pin.', 'error');
      return;
    }
    if (!window.firebaseClientManager || typeof window.firebaseClientManager.addClientLocation !== 'function') {
      setSaveMessage('No se pudo conectar con tu cuenta (Firebase). Recarga la página.', 'error');
      return;
    }

    btn.disabled = true;
    btn.classList.add('opacity-60', 'cursor-wait');
    setSaveMessage('Agregando dirección…', 'info');

    try {
      // Calcular distancia y costo antes de agregar
      let calc = null;
      let fee = null;
      let durationMin = null;
      try {
        calc = await getDeliveryDistanceKmAndDuration(currentSelection.lat, currentSelection.lng);
        const distanceKm = calc && typeof calc.distanceKm === 'number' ? calc.distanceKm : null;
        durationMin = calc && typeof calc.durationMin === 'number' ? calc.durationMin : null;
        fee = kmToFee(distanceKm);
      } catch (_) {}

      await window.firebaseClientManager.addClientLocation({
        formattedAddress: currentSelection.formattedAddress,
        lat: currentSelection.lat,
        lng: currentSelection.lng,
        sourceQuery: currentSelection.sourceQuery,
        distanceKm: calc && calc.distanceKm != null ? calc.distanceKm : null,
        deliveryPrice: fee != null ? fee : null,
        durationMin: durationMin != null ? durationMin : null,
      });
      setSaveMessage('Dirección agregada.', 'ok');
      // Persistir también en localStorage
      try {
        if (fee != null && calc && typeof calc.distanceKm === 'number') {
          const payload = {
            formatted_address: currentSelection.formattedAddress,
            lat: currentSelection.lat,
            lng: currentSelection.lng,
            distance: calc.distanceKm,
            deliveryPrice: fee,
            savedAt: Date.now()
          };
          localStorage.setItem('clientDeliveryInfo', JSON.stringify(payload));
        }
      } catch (_) {}
      try {
        document.dispatchEvent(new CustomEvent('sr:clientLocationSaved'));
      } catch (_) {}
    } catch (e) {
      console.error('[cliente-location] add address error:', e);
      setSaveMessage(e && e.message ? e.message : 'No se pudo agregar. Intenta de nuevo.', 'error');
    } finally {
      btn.classList.remove('cursor-wait');
      updateSaveButtonState();
    }
  }

  function wireUi() {
    const btn = $('client-verify-btn');
    const input = $('client-address-input');
    const saveBtn = $('client-save-btn');
    const addBtn = $('client-add-address-btn');
    if (btn) btn.addEventListener('click', handleVerify);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveLocation);
    if (addBtn) addBtn.addEventListener('click', handleAddAddress);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleVerify();
        }
      });
    }

    updateSaveButtonState();
  }

  document.addEventListener('sr:clientLoaded', (e) => {
    try {
      const detail = e && e.detail ? e.detail : {};
      currentClientUid = detail.uid || null;
      const d = detail.direccion || {};
      const lat = d.lat != null ? Number(d.lat) : null;
      const lng = d.lng != null ? Number(d.lng) : null;

      const formatted = (d.formatted || '').trim();
      const fallbackText = [d.calle, d.numero, d.colonia].filter(Boolean).join(' ');
      const text = formatted || fallbackText;

      // Si ya hay ubicación guardada, precargarla
      if (isFinite(lat) && isFinite(lng)) {
        const input = $('client-address-input');
        if (input && !input.value && text) input.value = text;
        const note = $('client-selected-address');
        if (note && text) note.textContent = text;

        ensureMap();
        if (mapsReady && map && marker) {
          const pos = new google.maps.LatLng(lat, lng);
          map.setCenter(pos);
          map.setZoom(16);
          setMarkerPosition(pos);
        } else {
          currentSelection = { lat, lng, formattedAddress: text || null, sourceQuery: null };
          updateSaveButtonState();
          renderDistanceAndCost(lat, lng);
        }
      }
    } catch (_) {
      // ignore
    } finally {
      updateSaveButtonState();
    }
  });

  // Called by maps-loader.js
  window.initializeGoogleMaps = function initializeGoogleMaps() {
    mapsReady = !!(window.google && window.google.maps);
    if (mapsReady) {
      try {
        geocoder = new google.maps.Geocoder();
        distanceService = new google.maps.DistanceMatrixService();
      } catch (e) {
        console.warn('[cliente-location] no se pudo inicializar servicios de Google Maps:', e);
      }
    }
    wireUi();
    updateSaveButtonState();
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Wire immediately; if Maps loads later, initializeGoogleMaps will re-wire safely.
    wireUi();
    updateSaveButtonState();
  });
})();
