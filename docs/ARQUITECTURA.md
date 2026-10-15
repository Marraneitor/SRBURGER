# Arquitectura y funcionamiento — SR & SRA BURGER

Análisis del sistema en producción (`https://srsburger.com`, Vercel). Actualizado: octubre 2026.

## 1. Dos entornos de ejecución

| Entorno | Qué corre | Para qué |
|---|---|---|
| **Vercel** (srsburger.com) | HTML estático + funciones serverless en `api/*.js` | Menú público, panel admin web, pedidos, MercadoPago, chat IA, geocoding |
| **PC local** (`npm start` → `server.js`) | Express + bot de WhatsApp (Baileys) + mismos endpoints `/api/*` | Notificaciones por WhatsApp, OTP por WhatsApp, broadcast, impresión térmica |

`server.js` **no se ejecuta en Vercel**. Endpoints que solo existen en `server.js`
(p. ej. `/api/whatsapp/*`, `/api/auth/*`, `/api/admin/broadcast`) no funcionan en
producción salvo que el frontend apunte al servidor local.

## 2. Flujo del menú público (`paginaburger.html`)

1. `<head>`: dark mode síncrono → `js/sr-image-fallback.js` (respaldo de imágenes) → Tailwind compilado (`styles/tailwind.min.css`).
2. `js/firebase-config.js` (módulo) crea `window.firebaseManager` sobre Firestore del proyecto **`sr-sra-burger`**.
3. **`js/script.js.backup?v=AAAA-MM-DDx`** es el script real de producción (¡no `js/script.js`!).
   - `menuData` está hardcodeado en el script (ids numéricos, imagen vacía en la mayoría).
   - Se aplican overrides leídos del doc de settings en Firestore:
     `priceOverrides`, `imageOverrides`, `customProducts`, `hiddenProducts`, `hiddenCategories`.
4. Carrito → checkout → `POST /api/send-order` (rate limit 5/min) y/o MercadoPago (`/api/mercadopago/*`).

> Para que un cambio en el script llegue a los clientes hay que **subir el `?v=`**
> en `paginaburger.html` y `pedido-manual.html` (cache del navegador).

## 3. Imágenes de productos

| Origen | Estado (oct 2026) |
|---|---|
| Firebase Storage `manager-d860c` (URLs en `imageOverrides`) | ❌ **402: cuenta de facturación cerrada** |
| `i.imgur.com` (hero, logo, salchipapas, aros) | ✅ funciona, pero imgur no garantiza hotlinking |
| `alimentosglaciar.com.mx` (override en Firestore) | ❌ bloquea hotlinking |
| `/img/productos/*` (repo → Vercel CDN) | ✅ **recomendado** |

Las URLs se editan en el panel admin (`admin.html` → `js/admin.js`, campo URL por producto)
y se guardan en `settings.imageOverrides[productId].image`.

`js/sr-image-fallback.js` intercepta cualquier `<img>` que falle:
Storage → `/img/productos/<mismo nombre>` → placeholder de marca.

## 4. Proyectos Firebase

| Proyecto | Uso |
|---|---|
| `sr-sra-burger` | Firestore + Auth de la app (config en `js/firebase-config.js`) |
| `manager-d860c` | Solo alojaba fotos en Storage. Facturación cerrada → fotos caídas |

## 5. Páginas principales

| Página | Rol |
|---|---|
| `paginaburger.html` (`/`) | Menú y pedidos del cliente |
| `admin.html` (`/admin`) | Precios, imágenes, productos ocultos, estado del servicio |
| `controldeenvios.html` (`/pedidos`) | Pedidos en tiempo real y repartidores |
| `pedido-manual.html` | Captura manual en mostrador (usa también `script.js.backup`) |
| `Productos.html`, `inventario.html`, `ingredientes.html` | Catálogo, recetas y stock |
| `clientes*.html`, `cliente.html` | Clientes y cuenta del cliente |
| `Ganancias.html`, `itemsvendidos.html`, `insumosgastados.html`, `data.html` | Reportes |
| `configuracion.html` | Config white-label |

## 6. Problemas conocidos / deuda técnica

1. **Fotos**: las 22 fotos migradas a `img/productos/` (oct 2026). Pendiente: desplegar y, opcionalmente, actualizar `imageOverrides` en el admin a URLs `/img/productos/...`.
2. `js/script.js` (330 KB) y `js/script.js.backup` (476 KB) divergieron; solo el `.backup` se usa.
   Editar siempre el `.backup` o unificar en una tarea dedicada.
3. El Service Worker (`sw.js`) solo se registra desde `js/script.js`, que no se carga → **SW inactivo en producción**.
4. La API key de Gemini y otros secretos deben vivir solo en env vars de Vercel (ver `SECURITY.md`).
5. Archivos de respaldo en la raíz (`*-backup*.html`, `ideas-backup-old.html`) se publican en Vercel; conviene moverlos o excluirlos.
6. Hotlinks a sitios de terceros (imgur, alimentosglaciar) son frágiles.
