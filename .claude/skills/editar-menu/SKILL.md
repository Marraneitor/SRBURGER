---
name: editar-menu
description: Cómo cambiar productos, precios, fotos o visibilidad del menú público. Usar cuando el usuario pida agregar/quitar/editar un producto, precio, combo o imagen del menú.
---

# Editar el menú

El menú se arma en dos capas:

1. **Base hardcodeada**: `menuData` en `js/script.js.backup` (ids numéricos por categoría:
   hamburguesas, hotdogs, combos, complementos, bebidas). Combos usan `burgerChoices`,
   `availableBurgers`, `hotdogChoices`, `availableHotdogs`.
2. **Overrides en Firestore** (doc de settings, editables desde `admin.html` sin desplegar):
   `priceOverrides`, `imageOverrides`, `customProducts`, `hiddenProducts`, `hiddenCategories`.

Reglas:
- Cambios de precio/foto/visibilidad del día a día → panel admin (no tocar código).
- Producto nuevo permanente → agregarlo a `menuData` con un id nuevo que no choque con los existentes
  ni con `customProducts`; subir el `?v=` del script (ver skill `deploy-vercel`).
- Fotos → `img/productos/` + URL relativa `/img/productos/<archivo>` (ver skill `diagnosticar-imagenes`).
- Mantener textos en español y el formato de precio en MXN.
