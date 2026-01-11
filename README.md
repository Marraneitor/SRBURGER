# 🍔 SR & SRA BURGER - Sistema de Pedidos Online

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Marraneitor/SRBURGER)

## 🌟 Características

- 🍕 **Menú interactivo** con hamburguesas, hot dogs, combos y bebidas
- 📱 **Diseño responsive** optimizado para móviles
- 🔥 **Base de datos Firebase** para sincronización en tiempo real
- 👨‍💼 **Panel de administración** con control total
- 📊 **Gestión de pedidos** en tiempo real
- 🎛️ **Control de servicio** (activar/desactivar)
- 👁️ **Gestión de productos** (mostrar/ocultar)
- 🔄 **Sincronización multi-dispositivo**

## 🚀 Demo en vivo

- **Página principal:** [Ver sitio](https://tu-dominio.vercel.app)
- **Panel de administración:** [Ver admin](https://tu-dominio.vercel.app/admin)
- **Control de pedidos:** [Ver pedidos](https://tu-dominio.vercel.app/pedidos)

## 📂 Estructura del proyecto

```
├── paginaburger.html     # Página principal del restaurante
├── admin.html            # Panel de administración
├── controldeenvios.html  # Gestión de pedidos
├── js/
│   ├── script.js         # Lógica principal
│   ├── admin.js          # Lógica del admin
│   └── firebase-config.js # Configuración Firebase
├── test-*.html           # Páginas de prueba
└── vercel.json           # Configuración de Vercel
```

## ⚙️ Tecnologías utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Tailwind CSS
- **Backend:** Firebase Firestore
- **Hosting:** Vercel
- **Version Control:** Git + GitHub

## 🔧 Configuración local

1. Clona el repositorio:
```bash
git clone https://github.com/Marraneitor/SRBURGER.git
cd SRBURGER
```

2. Instala dependencias y levanta el server local (recomendado para endpoints `/api`):
```bash
npm install
npm start
```

3. Abre `http://localhost:3000`.

> Nota: si abres el HTML con `file://`, el frontend intentará usar `http://localhost:3000` para la API.

## ☁️ Deploy en Vercel

- El frontend se sirve como estático.
- Las funciones serverless viven en `api/` (Vercel las detecta automáticamente).

### Variables de entorno (Vercel)

**Twilio (enviar pedido por WhatsApp/SMS)**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM`
- `OWNER_PHONE`
- `TWILIO_CHANNEL` (opcional: `whatsapp` o `sms`; default `whatsapp`)
- `TWILIO_MOCK` (opcional: `true` para no enviar y solo loggear)

**Admin / puntos (marcar pagado y acreditar puntos)**
- `ADMIN_KEY` (opcional: si se define, requiere header `x-admin-key`)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (recomendado: JSON completo de la Service Account)

**Opcional**
- `PUBLIC_BASE_URL` (ej: `https://tu-proyecto.vercel.app` para link de rastreo)

## 🔥 Firebase Features

- ✅ Autenticación de admin
- ✅ Base de datos en tiempo real
- ✅ Sincronización multi-dispositivo
- ✅ Gestión de estados
- ✅ Backup automático

## 📱 Responsive Design

El sitio está completamente optimizado para:
- 📱 Móviles (320px+)
- 📱 Tablets (768px+)
- 💻 Desktop (1024px+)

## 🎯 Funcionalidades del Admin

- **Control de servicio:** Activar/desactivar pedidos
- **Gestión de productos:** Mostrar/ocultar items del menú
- **Monitor de pedidos:** Ver todos los pedidos en tiempo real
- **Configuración:** Ajustes generales del sistema

## 🚀 Deploy automático

Este proyecto se despliega automáticamente con cada push a la rama `master`.

---

**Desarrollado con ❤️ para SR & SRA BURGER**
