# Fotos de productos (servidas por Vercel)

Las fotos originales estaban en Firebase Storage del proyecto `manager-d860c`,
que responde **402 – cuenta de facturación cerrada**. Ahora viven aquí.

`js/sr-image-fallback.js` traduce cada URL vieja de Storage a su archivo local
mediante la tabla `LOCAL_FILES`. Si un producto no tiene foto local, se muestra
un placeholder de marca.

## Estado

Las 22 fotos del menú están migradas (octubre 2026).

## Agregar o cambiar una foto

1. Guardar el archivo aquí (PNG o WebP, idealmente < 200 KB y ~800 px de ancho).
2. Registrarlo en `LOCAL_FILES` dentro de `js/sr-image-fallback.js`
   (`'NombreEnStorage.png': 'ArchivoLocal.webp'`), **o** en el panel admin poner
   directamente la URL `/img/productos/<archivo>`.
3. Desplegar en Vercel.
