---
name: nueva-pagina
description: Plantilla y checklist para crear una nueva página HTML del proyecto (admin o pública) siguiendo el sistema de diseño de CLAUDE.md.
---

# Nueva página HTML

Toda página nueva debe incluir, en este orden dentro de `<head>`:

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="/js/sr-image-fallback.js"></script>
<title>…</title>
<script>
  (function () {
    const stored = localStorage.getItem('sr_theme');
    document.documentElement.classList.toggle('dark', stored ? stored === 'dark' : true);
  })();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="/styles/tailwind.min.css">
<link rel="stylesheet" href="/styles/variables.css">
<link rel="stylesheet" href="/styles/sr-ui.css">
```

Checklist:
- Nombre del negocio desde `config/business-config.js` (nunca hardcodear).
- Firestore solo vía `js/firebase-config.js` (`window.firebaseManager`).
- Mobile-first (375px), probar en modo oscuro y claro.
- Si es pública y estática, agregarla a `PRECACHE_URLS` en `sw.js`.
- Si necesita ruta corta, agregar rewrite en `vercel.json`.
