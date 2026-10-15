---
name: diagnosticar-imagenes
description: Diagnostica y arregla fotos que no cargan en srsburger.com (productos, hero, logo). Usar cuando el usuario diga que las imágenes/fotos no se ven, salen en gris, o muestran el placeholder 🍔.
---

# Diagnosticar imágenes rotas

1. Abrir `https://srsburger.com` en el navegador integrado y ejecutar en la página:
   ```js
   [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src)
   ```
   y además `performance.getEntriesByType('resource').filter(e => e.responseStatus >= 400)`.
2. Probar una URL rota con `fetch(url).then(r => r.text())` para leer el error real:
   - `402 billing account ... closed` → Firebase Storage `manager-d860c` sin facturación.
   - `403` / 0 bytes → el sitio de terceros bloquea hotlinking.
   - `404` en `/img/productos/...` → falta el archivo en el repo.
3. Arreglo preferido: guardar la foto en `img/productos/` y registrarla en `LOCAL_FILES` de `js/sr-image-fallback.js`
   (pendientes en `img/productos/README.md`). `applyImageOverrides` en `js/script.js.backup` ya la usa sin pasar por Storage.
4. Para fotos nuevas: subir a `img/productos/` y en el panel admin poner la URL `/img/productos/<archivo>`.
5. Nunca volver a depender de hotlinks externos (imgur, sitios de proveedores).

Origen de las URLs: `settings.imageOverrides` en Firestore (editado desde `admin.html` / `js/admin.js`)
o `menuData` hardcodeado en `js/script.js.backup`. Ver `docs/ARQUITECTURA.md` §3.
