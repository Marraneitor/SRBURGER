---
name: deploy-vercel
description: Checklist para publicar cambios del frontend o de api/*.js en Vercel (srsburger.com) sin romper caché ni seguridad. Usar antes de decir que un cambio "ya está en producción".
---

# Desplegar en Vercel

1. **Script de producción**: el menú carga `js/script.js.backup?v=...`, no `js/script.js`.
   Si se editó, subir el sufijo `?v=AAAA-MM-DDx` en `paginaburger.html` y `pedido-manual.html`.
2. **Assets nuevos**: añadirlos a `PRECACHE_URLS` en `sw.js` y subir `CACHE_VERSION`.
3. **CSS**: si se agregaron clases Tailwind nuevas, correr `npm run build:css` (genera `styles/tailwind.min.css`).
4. **API**: toda función en `api/` usa `api/_security.js` (`applyCors`, `checkRateLimit`, `requireAdminKey`).
   Recordar que `server.js` NO corre en Vercel; endpoints solo-locales no existen en producción.
5. Rutas: `vercel.json` (`/` → `paginaburger.html`, `/admin`, `/pedidos`).
6. Verificación post-deploy en el navegador integrado:
   - consola sin errores nuevos,
   - `[...document.images].filter(i=>i.complete&&!i.naturalWidth).length === 0`,
   - agregar un producto al carrito y abrir el checkout (sin enviar el pedido).
7. El deploy lo hace el usuario (push al repo conectado o `vercel --prod`); pedir confirmación antes.
