// Admin panel JavaScript with Firebase integration
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM cargado, esperando Firebase...');
    
    // Wait for Firebase to be available
    const waitForFirebase = () => {
        if (window.firebaseManager) {
            console.log('✅ Firebase Manager encontrado, inicializando admin...');
            initAdmin();
        } else {
            console.log('⏳ Esperando Firebase Manager...');
            setTimeout(waitForFirebase, 50);
        }
    };
    waitForFirebase();
    // Menu data (same as main site)
    const menuData = {
        "Hamburguesas": [
            { id: 1, name: "Clásica PREMIUM", price: 100, description: "Pan XL, carne 80/20 arrachera, queso Gouda, queso americano, cebolla caramelizada, lechuga, tomate y tocino.", image: "", customizable: true },
            { id: 2, name: "BBQ BEACON CRUNCH", price: 110, description: "Pan XL, carne 80/20 arrachera, queso americano, cebolla caramelizada, aros de cebolla, tocino y BBQ.", image: "", customizable: true },
            { id: 11, name: "Alohawai Burger", price: 120, description: "Pan XL, carne 80/20 arrachera, queso Gouda, queso americano, cebolla caramelizada, lechuga, tomate, tocino y piña.", image: "", customizable: true },
            { id: 12, name: "Chistorraburger", price: 120, description: "Pan XL, carne 80/20 arrachera, queso Gouda, cebolla caramelizada, chistorra y tocino.", image: "", customizable: true },
            { id: 13, name: "Choriargentina Burger", price: 120, description: "Pan XL, carne 80/20 arrachera, queso Gouda, cebolla caramelizada, chorizo argentino y tocino.", image: "", customizable: true },
            { id: 30, name: "Salchiburger", price: 120, description: "Pan XL, carne 80/20 arrachera, queso Gouda, queso americano, cebolla caramelizada, lechuga, tomate, tocino y salchicha.", image: "", customizable: true }
        ],
        "Hot Dogs": [
            { id: 5, name: "Hotdog Jumbo", price: 60, description: "🌭 Salchicha jumbo jugosa en pan artesanal tostado, tocino crujiente, tomate fresco, cebolla y nuestros aderezos especiales. ¡Preparado al momento para ti!", image: "", customizable: true },
            { id: 27, name: "Jalapeño Dog", price: 60, description: "🌶️ Salchicha roja premium con queso manchego derretido, tocino crujiente, cebolla caramelizada y jalapeños frescos.", image: "", customizable: true }
        ],
        "Combos": [
            { id: 26, name: "DOBLES DOBLES", price: 220, originalPrice: 300, description: "🔥 2 hamburguesas a tu elección a precio especial. La Doble Doble cuesta $300, aquí en combo te la llevas por $220. ¡Ahorras $80!", image: "", isCombo: true, burgerChoices: 2, availableBurgers: [1, 2, 11, 12, 13, 30] },
            { id: 6, name: "Combo Pareja", price: 250, originalPrice: 305, description: "💕 Perfecto para compartir: 2 hamburguesas deliciosas a tu elección, papas medianas doradas y 7 aros de cebolla crujientes. ¡Ideal para una cita perfecta!", image: "", isCombo: true, burgerChoices: 2, availableBurgers: [1, 2, 11, 12, 13, 30] },
            { id: 15, name: "Combo Dúo", price: 180, originalPrice: 220, description: "🤝 Lo mejor de dos mundos: 1 hamburguesa jugosa, 1 hotdog delicioso y papas medianas. ¡Para los que no pueden decidirse y quieren probarlo todo!", image: "", isCombo: true, burgerChoices: 1, availableBurgers: [1, 2, 11, 12, 13, 30], hotdogChoices: 1, availableHotdogs: [5, 27] },
            { id: 7, name: "Combo Amigos", price: 360, originalPrice: 400, description: "👥 Para compartir con tus mejores amigos: 3 hamburguesas espectaculares y papas medianas. ¡Momento perfecto para crear recuerdos!", image: "", isCombo: true, burgerChoices: 3, availableBurgers: [1, 2, 11, 12, 13, 30] },
            { id: 14, name: "Combo Familiar", price: 650, originalPrice: 730, description: "👨‍👩‍👧‍👦 La experiencia familiar completa: 5 hamburguesas increíbles, papas XL (a elegir: gajo o francesas), aros de cebolla medianos y Coca-Cola 3L + ENVÍO GRATIS. ¡Todos felices en casa!", image: "", isCombo: true, burgerChoices: 5, availableBurgers: [1, 2, 11, 12, 13, 30] }
        ],
        "Extras": [
            { id: 8, name: "Papas Gajo Medianas", price: 60, description: "🍟 Papas gajo doradas y crujientes por fuera, suaves por dentro, sazonadas con nuestra mezcla especial de especias.", image: "" },
            { id: 28, name: "Papas Francesas Medianas", price: 60, description: "🍟 Papas francesas clásicas, doradas y crujientes, cortadas en bastones perfectos. ¡El acompañamiento tradicional que nunca pasa de moda!", image: "" },
            { id: 17, name: "Salchipapas Medianas", price: 80, description: "🌭🍟 La combinación perfecta: papas doradas con trozos jugosos de salchicha premium. ¡Un clásico que nunca falla!", image: "https://i.imgur.com/YgEDfx3_d.jpeg?maxwidth=520&shape=thumb&fidelity=high" },
            { id: 19, name: "Aros de Cebolla (8 pz)", price: 45, description: "🧅 Aros de cebolla empanizados y fritos hasta la perfección, crujientes por fuera y tiernos por dentro.", image: "https://i.imgur.com/rK8wjox_d.jpeg?maxwidth=520&shape=thumb&fidelity=high" }
        ],
       "Bebidas": [
           { id: 21, name: "Coca-Cola 600ml", price: 30, description: "🥤 Coca-Cola helada y refrescante, el acompañante perfecto para tu comida. ¡Nada como la chispa de la vida!", image: "" },
           { id: 22, name: "Coca-Cola 1.75L", price: 40, description: "🥤 Coca-Cola familiar perfecta para compartir, siempre fría y burbujeante. ¡Momentos especiales merecen la Coca-Cola!", image: "" },
           { id: 23, name: "Coca-Cola 3L", price: 60, description: "🥤 La Coca-Cola grande para toda la familia, helada y con esa burbuja inconfundible que todos amamos. ¡Alegría para todos!", image: "" },
           { id: 24, name: "Agua Natural 600ml", price: 20, description: "💧 Agua natural pura y refrescante para hidratarte mientras disfrutas de tu comida favorita.", image: "" }
       ]
    };

    const DEFAULT_CATEGORIES = Object.keys(menuData);

    let currentCategory = 'Hamburguesas';
    let adminSettings = {
        serviceActive: true,
        hiddenProducts: [],
        priceOverrides: {},
        imageOverrides: {},
        customProducts: {},
        // Orden/visibilidad de secciones
        categories: [...DEFAULT_CATEGORIES],
        // Orden de productos por categoría (array de IDs). Si no existe, se usa el orden base.
        productOrder: {},
        // Overrides for base products (name/description). Price/image already have their own maps.
        productInfoOverrides: {},
        // Overrides para mostrar/ocultar el botón "Personalizar" por producto
        customizeButtonOverrides: {},
        // Overrides para permitir o no campo de "Especificaciones" por producto
        specificationsOverrides: {}
    };

    const normalizeCategories = (list) => {
        const arr = Array.isArray(list) ? list : [];
        const seen = new Set();
        const out = [];
        for (const raw of arr) {
            const name = String(raw || '').trim();
            if (!name) continue;
            const key = name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(name);
        }
        return out;
    };

    const getAllCategories = () => {
        const fromSettings = normalizeCategories(adminSettings.categories);
        const out = fromSettings.length ? [...fromSettings] : [...DEFAULT_CATEGORIES];

        // Mantener siempre las categorías base
        for (const base of DEFAULT_CATEGORIES) {
            if (!out.some((c) => c.toLowerCase() === String(base).toLowerCase())) out.push(base);
        }
        // Incluir categorías con productos custom aunque no estén en la lista
        for (const cat of Object.keys(adminSettings.customProducts || {})) {
            if (!out.some((c) => c.toLowerCase() === String(cat).toLowerCase())) out.push(cat);
        }
        return out;
    };

    const getPersistedCategories = () => {
        const base = normalizeCategories(adminSettings.categories);
        const out = base.length ? [...base] : [...DEFAULT_CATEGORIES];
        for (const baseCat of DEFAULT_CATEGORIES) {
            if (!out.some((c) => c.toLowerCase() === String(baseCat).toLowerCase())) out.push(baseCat);
        }
        return out;
    };

    const ensureCurrentCategoryValid = () => {
        const cats = getAllCategories();
        if (!cats.length) {
            currentCategory = DEFAULT_CATEGORIES[0] || 'Hamburguesas';
            return;
        }
        if (!cats.includes(currentCategory)) currentCategory = cats[0];
    };

    const renderCategoryTabs = () => {
        const tabsEl = document.getElementById('category-tabs');
        if (!tabsEl) return;
        ensureCurrentCategoryValid();
        const cats = getAllCategories();

        const iconByCategory = {
            'Hamburguesas': 'fa-hamburger',
            'Hot Dogs': 'fa-hotdog',
            'Combos': 'fa-utensils',
            'Extras': 'fa-plus-circle',
            'Bebidas': 'fa-glass'
        };

        tabsEl.innerHTML = '';
        cats.forEach((category) => {
            const btn = document.createElement('button');
            const isActive = category === currentCategory;
            btn.className = isActive
                ? 'category-tab active bg-white shadow-md text-gray-800 px-6 py-3 rounded-lg font-semibold transition-all'
                : 'category-tab text-gray-600 hover:text-gray-800 px-6 py-3 rounded-lg font-semibold transition-all';
            btn.dataset.category = category;
            const iconClass = iconByCategory[category] || 'fa-layer-group';
            btn.innerHTML = `<i class="fas ${iconClass} mr-2"></i>${category}`;
            tabsEl.appendChild(btn);
        });
    };

    const populateCategorySelect = () => {
        const sel = document.getElementById('new-product-category');
        if (!sel) return;
        const cats = getAllCategories();
        sel.innerHTML = cats.map((c) => `<option>${c}</option>`).join('');
        if (cats.includes(currentCategory)) sel.value = currentCategory;
    };

    const setCurrentCategory = (category) => {
        if (!category) return;
        currentCategory = category;
        renderCategoryTabs();
        populateCategorySelect();
        renderProducts(currentCategory);
    };

    // Helpers to keep IDs consistent and avoid type issues
    const normalizeHiddenProducts = (list) => {
        const arr = Array.isArray(list) ? list.map((id) => Number(id)).filter((n) => !Number.isNaN(n)) : [];
        // de-duplicate while preserving order
        const seen = new Set();
        const out = [];
        for (const n of arr) { if (!seen.has(n)) { seen.add(n); out.push(n); } }
        return out;
    };
    const isProductHidden = (id) => {
        const n = Number(id);
        return adminSettings.hiddenProducts.some((h) => Number(h) === n);
    };
    const mapPriceOverrides = (obj) => {
        const res = {};
        Object.entries(obj || {}).forEach(([k, v]) => { res[Number(k)] = v; });
        return res;
    };
    const mapImageOverrides = (obj) => {
        const res = {};
        Object.entries(obj || {}).forEach(([k, v]) => {
            const id = Number(k);
            if (!Number.isNaN(id) && v && typeof v.image === 'string') {
                res[id] = { image: v.image };
            }
        });
        return res;
    };
    const mapCustomProducts = (obj) => {
        const out = {};
        Object.entries(obj || {}).forEach(([cat, items]) => {
            if (!Array.isArray(items)) return;
            out[cat] = items
                .map(p => ({
                    id: Number(p.id),
                    name: String(p.name || '').trim(),
                    price: Number(p.price),
                    description: String(p.description || '').trim(),
                    image: String(p.image || '').trim(),
                    customizable: !!p.customizable,
                    isCombo: !!p.isCombo,
                    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : undefined
                }))
                .filter(p => !Number.isNaN(p.id) && p.name && !Number.isNaN(p.price));
        });
        return out;
    };

    const mapProductInfoOverrides = (obj) => {
        const res = {};
        Object.entries(obj || {}).forEach(([k, v]) => {
            const id = Number(k);
            if (Number.isNaN(id) || !v || typeof v !== 'object') return;
            const name = v.name != null ? String(v.name).trim() : '';
            const description = v.description != null ? String(v.description).trim() : '';
            const clean = {};
            if (name) clean.name = name;
            if (description) clean.description = description;
            if (Object.keys(clean).length > 0) res[id] = clean;
        });
        return res;
    };

    const mapCustomizeButtonOverrides = (obj) => {
        const res = {};
        Object.entries(obj || {}).forEach(([k, v]) => {
            const id = Number(k);
            if (Number.isNaN(id)) return;
            if (typeof v === 'boolean') {
                res[id] = v;
            } else if (v && typeof v === 'object' && typeof v.enabled === 'boolean') {
                res[id] = v.enabled;
            }
        });
        return res;
    };

    const mapSpecificationsOverrides = (obj) => {
        const res = {};
        Object.entries(obj || {}).forEach(([k, v]) => {
            const id = Number(k);
            if (Number.isNaN(id)) return;
            if (typeof v === 'boolean') {
                res[id] = v;
            } else if (v && typeof v === 'object' && typeof v.enabled === 'boolean') {
                res[id] = v.enabled;
            }
        });
        return res;
    };

    const mapProductOrder = (obj) => {
        const out = {};
        if (!obj || typeof obj !== 'object') return out;
        Object.entries(obj).forEach(([category, ids]) => {
            if (!Array.isArray(ids)) return;
            const seen = new Set();
            const clean = [];
            ids.forEach((id) => {
                const n = Number(id);
                if (Number.isNaN(n)) return;
                if (seen.has(n)) return;
                seen.add(n);
                clean.push(n);
            });
            out[category] = clean;
        });
        return out;
    };

    const getMergedProductsForCategory = (category) => {
        const custom = (adminSettings.customProducts && adminSettings.customProducts[category]) || [];
        return [...(menuData[category] || []), ...custom];
    };

    const sanitizeProductOrderForAllCategories = (productOrder) => {
        const orderMap = mapProductOrder(productOrder);
        const out = {};
        for (const category of getAllCategories()) {
            const products = [...(menuData[category] || []), ...(((adminSettings.customProducts || {})[category]) || [])];
            const ids = products.map(p => Number(p.id)).filter(n => !Number.isNaN(n));
            const idSet = new Set(ids);

            const desired = Array.isArray(orderMap[category]) ? orderMap[category] : [];
            const seen = new Set();
            const cleaned = [];
            // 1) Keep existing desired order if item still exists
            for (const raw of desired) {
                const n = Number(raw);
                if (Number.isNaN(n)) continue;
                if (!idSet.has(n)) continue;
                if (seen.has(n)) continue;
                seen.add(n);
                cleaned.push(n);
            }
            // 2) Append any missing items in current natural order
            for (const n of ids) {
                if (seen.has(n)) continue;
                seen.add(n);
                cleaned.push(n);
            }
            if (cleaned.length) out[category] = cleaned;
        }
        return out;
    };

    // Sanitize/normalize common image URL formats (e.g., Imgur page -> direct image)
    const sanitizeImageUrl = (url) => {
        if (!url) return url;
        let cleaned = (url + '').trim();
        // Convert imgur page links like https://imgur.com/ABC123 to direct image https://i.imgur.com/ABC123.jpg
        const simpleImgur = cleaned.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)$/i);
        if (simpleImgur) {
            return `https://i.imgur.com/${simpleImgur[1]}.jpg`;
        }
        // If i.imgur.com without extension, append .jpg
        const directImgurNoExt = cleaned.match(/^https?:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)(?:[?#].*)?$/i);
        if (directImgurNoExt && !/\.(jpg|jpeg|png|gif|webp)(?:[?#].*)?$/i.test(cleaned)) {
            return `https://i.imgur.com/${directImgurNoExt[1]}.jpg`;
        }
        return cleaned;
    };
    
    // Initialize admin panel
    async function initAdmin() {
        try {
            console.log('🚀 Inicializando panel de administración...');
            console.log('🔍 Verificando Firebase Manager:', !!window.firebaseManager);
            
            if (!window.firebaseManager) {
                throw new Error('Firebase Manager no disponible después de la espera');
            }
            
            console.log('📡 Cargando configuraciones desde Firebase...');
            await loadSettingsFromFirebase();

            ensureCurrentCategoryValid();
            renderCategoryTabs();
            populateCategorySelect();
            
            console.log('🎨 Renderizando productos...');
            renderProducts(currentCategory);
            
            console.log('⚙️ Configurando event listeners...');
            setupEventListeners();
            
            console.log('📊 Actualizando estado del servicio...');
            updateServiceStatus();
            
            console.log('👂 Configurando listeners en tiempo real...');
            setupRealtimeListeners();
            
            console.log('✅ Panel de administración listo y sincronizado');
            showToast('Panel de administración conectado a Firebase', 'success');
        } catch (error) {
            console.error('❌ Error inicializando admin:', error);
            console.log('🔄 Fallback a configuración local...');
            // Fallback to localStorage if Firebase fails
            loadSettingsFromLocalStorage();
            ensureCurrentCategoryValid();
            renderCategoryTabs();
            populateCategorySelect();
            renderProducts(currentCategory);
            setupEventListeners();
            updateServiceStatus();
            showToast('Usando configuración local (sin sincronización)', 'warning');
        }
    }

    // Load settings from Firebase
    async function loadSettingsFromFirebase() {
        try {
        const settings = await window.firebaseManager.getSettings();
            if (settings) {
                adminSettings = {
                    serviceActive: settings.serviceActive !== undefined ? settings.serviceActive : true,
            hiddenProducts: normalizeHiddenProducts(settings.hiddenProducts),
            priceOverrides: mapPriceOverrides(settings.priceOverrides),
            imageOverrides: mapImageOverrides(settings.imageOverrides),
            customProducts: mapCustomProducts(settings.customProducts),
            categories: normalizeCategories(settings.categories),
            productOrder: mapProductOrder(settings.productOrder),
            productInfoOverrides: mapProductInfoOverrides(settings.productInfoOverrides),
                    customizeButtonOverrides: mapCustomizeButtonOverrides(settings.customizeButtonOverrides),
                    specificationsOverrides: mapSpecificationsOverrides(settings.specificationsOverrides)
                };
                
                // Update UI
                document.getElementById('service-toggle').checked = adminSettings.serviceActive;
                window.hiddenProducts = adminSettings.hiddenProducts;
            }
        } catch (error) {
            console.error('Error loading settings from Firebase:', error);
            throw error;
        }
    }

    // Load settings from localStorage (fallback)
    function loadSettingsFromLocalStorage() {
        const serviceActive = localStorage.getItem('restaurantServiceActive');
        const hiddenProducts = localStorage.getItem('hiddenProducts');
    const savedOverrides = localStorage.getItem('priceOverrides');
        const savedImageOverrides = localStorage.getItem('imageOverrides');
    	const savedCustomProducts = localStorage.getItem('customProducts');
            const savedProductInfoOverrides = localStorage.getItem('productInfoOverrides');
            const savedCustomizeButtonOverrides = localStorage.getItem('customizeButtonOverrides');
            const savedSpecificationsOverrides = localStorage.getItem('specificationsOverrides');
            const savedProductOrder = localStorage.getItem('productOrder');
            const savedCategories = localStorage.getItem('categories');

    adminSettings.serviceActive = serviceActive !== null ? serviceActive === 'true' : true;
    adminSettings.hiddenProducts = normalizeHiddenProducts(hiddenProducts ? JSON.parse(hiddenProducts) : []);
    adminSettings.priceOverrides = mapPriceOverrides(savedOverrides ? JSON.parse(savedOverrides) : {});
    adminSettings.imageOverrides = mapImageOverrides(savedImageOverrides ? JSON.parse(savedImageOverrides) : {});
    adminSettings.customProducts = mapCustomProducts(savedCustomProducts ? JSON.parse(savedCustomProducts) : {});
    adminSettings.categories = normalizeCategories(savedCategories ? JSON.parse(savedCategories) : DEFAULT_CATEGORIES);
    adminSettings.productOrder = mapProductOrder(savedProductOrder ? JSON.parse(savedProductOrder) : {});
    adminSettings.productInfoOverrides = mapProductInfoOverrides(savedProductInfoOverrides ? JSON.parse(savedProductInfoOverrides) : {});
        adminSettings.customizeButtonOverrides = mapCustomizeButtonOverrides(savedCustomizeButtonOverrides ? JSON.parse(savedCustomizeButtonOverrides) : {});
        adminSettings.specificationsOverrides = mapSpecificationsOverrides(savedSpecificationsOverrides ? JSON.parse(savedSpecificationsOverrides) : {});
        
        document.getElementById('service-toggle').checked = adminSettings.serviceActive;
        window.hiddenProducts = adminSettings.hiddenProducts;
    }

    // Remove any undefined values recursively so Firestore accepts the payload
    function sanitizeForFirestore(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
            return obj
                .filter(v => v !== undefined)
                .map(v => (typeof v === 'object' && v !== null ? sanitizeForFirestore(v) : v));
        }
        if (typeof obj !== 'object') return obj;
        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined) continue;
            if (typeof value === 'object' && value !== null) {
                const nested = sanitizeForFirestore(value);
                if (nested !== undefined) clean[key] = nested;
            } else {
                clean[key] = value;
            }
        }
        return clean;
    }

    // Save settings to Firebase
    async function saveSettingsToFirebase() {
        try {
            console.log('💾 Intentando guardar configuraciones...', adminSettings);

            if (!window.firebaseManager) {
                console.error('❌ window.firebaseManager no está disponible');
                throw new Error('Firebase Manager no disponible');
            }

            const payload = sanitizeForFirestore({
                serviceActive: adminSettings.serviceActive ?? true,
                hiddenProducts: adminSettings.hiddenProducts || [],
                priceOverrides: adminSettings.priceOverrides || {},
                imageOverrides: adminSettings.imageOverrides || {},
                customProducts: adminSettings.customProducts || {},
                categories: getPersistedCategories(),
                productOrder: sanitizeProductOrderForAllCategories(adminSettings.productOrder || {}),
                productInfoOverrides: adminSettings.productInfoOverrides || {},
                customizeButtonOverrides: adminSettings.customizeButtonOverrides || {},
                specificationsOverrides: adminSettings.specificationsOverrides || {}
            });

            console.log('📡 Guardando en Firebase...', payload);
            await window.firebaseManager.saveSettings(payload);
            console.log('✅ Configuraciones guardadas en Firebase exitosamente');
            
            // Also save to localStorage as backup
            localStorage.setItem('restaurantServiceActive', (adminSettings.serviceActive ?? true).toString());
            localStorage.setItem('hiddenProducts', JSON.stringify(adminSettings.hiddenProducts || []));
            localStorage.setItem('priceOverrides', JSON.stringify(adminSettings.priceOverrides || {}));
            localStorage.setItem('imageOverrides', JSON.stringify(adminSettings.imageOverrides || {}));
            localStorage.setItem('customProducts', JSON.stringify(adminSettings.customProducts || {}));
            localStorage.setItem('categories', JSON.stringify(getPersistedCategories()));
            localStorage.setItem('productOrder', JSON.stringify(adminSettings.productOrder || {}));
            localStorage.setItem('productInfoOverrides', JSON.stringify(adminSettings.productInfoOverrides || {}));
            localStorage.setItem('customizeButtonOverrides', JSON.stringify(adminSettings.customizeButtonOverrides || {}));
            localStorage.setItem('specificationsOverrides', JSON.stringify(adminSettings.specificationsOverrides || {}));
            
            showToast('Configuración sincronizada exitosamente', 'success');
        } catch (error) {
            console.error('❌ Error saving settings to Firebase:', error);
            // Fallback to localStorage only
            localStorage.setItem('restaurantServiceActive', (adminSettings.serviceActive ?? true).toString());
            localStorage.setItem('hiddenProducts', JSON.stringify(adminSettings.hiddenProducts || []));
            localStorage.setItem('priceOverrides', JSON.stringify(adminSettings.priceOverrides || {}));
            localStorage.setItem('imageOverrides', JSON.stringify(adminSettings.imageOverrides || {}));
            localStorage.setItem('customProducts', JSON.stringify(adminSettings.customProducts || {}));
            localStorage.setItem('categories', JSON.stringify(getPersistedCategories()));
            localStorage.setItem('productOrder', JSON.stringify(adminSettings.productOrder || {}));
            localStorage.setItem('productInfoOverrides', JSON.stringify(adminSettings.productInfoOverrides || {}));
            localStorage.setItem('customizeButtonOverrides', JSON.stringify(adminSettings.customizeButtonOverrides || {}));
            localStorage.setItem('specificationsOverrides', JSON.stringify(adminSettings.specificationsOverrides || {}));
            showToast('Error de sincronización - guardado solo localmente', 'warning');
        }
    }

    // Setup real-time listeners for settings changes
    function setupRealtimeListeners() {
    if (window.firebaseManager && window.firebaseManager.listenToSettings) {
            window.firebaseManager.listenToSettings((newSettings) => {
                if (newSettings) {
                    const oldServiceActive = adminSettings.serviceActive;
                    
            adminSettings = {
            serviceActive: newSettings.serviceActive !== undefined ? newSettings.serviceActive : true,
            hiddenProducts: normalizeHiddenProducts(newSettings.hiddenProducts),
            priceOverrides: mapPriceOverrides(newSettings.priceOverrides),
            imageOverrides: mapImageOverrides(newSettings.imageOverrides),
            customProducts: mapCustomProducts(newSettings.customProducts),
            categories: normalizeCategories(newSettings.categories),
            productOrder: mapProductOrder(newSettings.productOrder),
            productInfoOverrides: mapProductInfoOverrides(newSettings.productInfoOverrides),
                            customizeButtonOverrides: mapCustomizeButtonOverrides(newSettings.customizeButtonOverrides),
                            specificationsOverrides: mapSpecificationsOverrides(newSettings.specificationsOverrides)
                        };
                    
                    // Update UI
                    document.getElementById('service-toggle').checked = adminSettings.serviceActive;
                    window.hiddenProducts = adminSettings.hiddenProducts;
                    
                    updateServiceStatus();
                    ensureCurrentCategoryValid();
                    renderCategoryTabs();
                    populateCategorySelect();
                    renderProducts(currentCategory);
                    
                    // Show notification if service status changed from another device
                    if (oldServiceActive !== adminSettings.serviceActive) {
                        showToast(
                            `Servicio ${adminSettings.serviceActive ? 'ACTIVADO' : 'DESACTIVADO'} desde otro dispositivo`,
                            adminSettings.serviceActive ? 'success' : 'warning'
                        );
                    }
                }
            });
        }
    }

    // Update service status display
    function updateServiceStatus() {
        const isActive = adminSettings.serviceActive;
        const toggle = document.getElementById('service-toggle');
        const emoji = document.getElementById('service-emoji');
        const title = document.getElementById('service-title');
        const description = document.getElementById('service-description');
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        // Update toggle if needed (prevent infinite loops)
        if (toggle.checked !== isActive) {
            toggle.checked = isActive;
        }
        
        if (isActive) {
            emoji.textContent = '🟢';
            title.textContent = 'Servicio Activo';
            description.textContent = 'Los clientes pueden realizar pedidos normalmente';
            statusDot.className = 'w-3 h-3 bg-green-500 rounded-full animate-pulse';
            statusText.textContent = 'SERVICIO ACTIVO';
            statusText.className = 'text-sm font-semibold text-green-600';
        } else {
            emoji.textContent = '🔴';
            title.textContent = 'Servicio Inactivo';
            description.textContent = 'Los clientes verán un mensaje de "Temporalmente cerrado"';
            statusDot.className = 'w-3 h-3 bg-red-500 rounded-full animate-pulse';
            statusText.textContent = 'SERVICIO CERRADO';
            statusText.className = 'text-sm font-semibold text-red-600';
        }
    }

    // Render products for selected category
    function renderProducts(category) {
        const container = document.getElementById('products-container');
    // Merge base menu + custom products for the category
    const custom = (adminSettings.customProducts && adminSettings.customProducts[category]) || [];
    const customIds = new Set(custom.map(p => Number(p.id)));
    const products = [...(menuData[category] || []), ...custom];

        // Apply saved order for this category (if any)
        const sanitizedOrder = sanitizeProductOrderForAllCategories(adminSettings.productOrder || {});
        const ids = sanitizedOrder[category] || [];
        if (ids.length) {
            const index = new Map(ids.map((id, idx) => [Number(id), idx]));
            const decorated = products.map((p, idx) => ({ p, idx, pos: index.has(Number(p.id)) ? index.get(Number(p.id)) : 1e9 }));
            decorated.sort((a, b) => (a.pos - b.pos) || (a.idx - b.idx));
            // overwrite in-place for later use
            products.length = 0;
            decorated.forEach(d => products.push(d.p));
        }
        
        container.innerHTML = products.map(product => {
            const isHidden = isProductHidden(product.id);
            const isCustom = customIds.has(Number(product.id));
            const effectiveImage = (adminSettings.imageOverrides && adminSettings.imageOverrides[product.id]?.image) || product.image;
            const effectiveName = (adminSettings.productInfoOverrides && adminSettings.productInfoOverrides[product.id]?.name) || product.name;
            const effectiveDesc = (adminSettings.productInfoOverrides && adminSettings.productInfoOverrides[product.id]?.description) || product.description;
            const baseHasCustomize = !!(product.isCombo || product.customizable);
            const overrideCustomize = adminSettings.customizeButtonOverrides && Object.prototype.hasOwnProperty.call(adminSettings.customizeButtonOverrides, Number(product.id))
                ? !!adminSettings.customizeButtonOverrides[Number(product.id)]
                : null;
            const effectiveCustomize = overrideCustomize !== null ? overrideCustomize : baseHasCustomize;
            const overrideSpecs = adminSettings.specificationsOverrides && Object.prototype.hasOwnProperty.call(adminSettings.specificationsOverrides, Number(product.id))
                ? !!adminSettings.specificationsOverrides[Number(product.id)]
                : null;
            const baseAllowsSpecs = baseHasCustomize; // Por defecto, mismos productos que se pueden personalizar permiten especificaciones
            const effectiveSpecs = overrideSpecs !== null ? overrideSpecs : baseAllowsSpecs;
            
            return `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden border-2 ${isHidden ? 'border-red-300 opacity-60' : 'border-gray-200'} transition-all duration-300">
                    <div class="relative">
                            ${effectiveImage ? `<img src="${effectiveImage}" alt="${product.name}" class="w-full h-40 object-cover" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';">` : `<div class="w-full h-40 bg-gray-100"></div>`}
                        
                        <!-- Status overlay -->
                        <div class="absolute top-2 right-2">
                            ${isHidden ? 
                                '<div class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">OCULTO</div>' :
                                '<div class="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">VISIBLE</div>'
                            }
                        </div>
                    </div>
                    
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-2 ${isHidden ? 'text-gray-500' : 'text-gray-800'}">${effectiveName}</h3>
                        <p class="text-gray-600 text-sm mb-3 line-clamp-2">${effectiveDesc}</p>

                        <div class="flex gap-2 mb-3">
                            <button class="edit-product-btn flex-1 ${isCustom ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-700 hover:bg-slate-800'} text-white px-3 py-2 rounded-lg text-sm font-semibold" data-product-id="${product.id}">
                                <i class="fas fa-pen mr-2"></i>Editar
                            </button>
                            <button class="delete-product-btn flex-1 ${isCustom ? 'bg-red-500 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'} text-white px-3 py-2 rounded-lg text-sm font-semibold" data-product-id="${product.id}">
                                <i class="fas fa-trash mr-2"></i>Eliminar
                            </button>
                        </div>

                        <div class="space-y-3 mb-4">
                            <div class="flex justify-between items-center">
                                <span class="text-xl font-bold text-yellow-600">$${((adminSettings.priceOverrides && adminSettings.priceOverrides[product.id]?.price) ?? product.price)}</span>
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm text-gray-500">ID: ${product.id}</span>
                                        <div class="flex items-center gap-1">
                                            <button class="move-up-btn bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs" data-product-id="${product.id}" title="Subir">↑</button>
                                            <button class="move-down-btn bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs" data-product-id="${product.id}" title="Bajar">↓</button>
                                        </div>
                                    </div>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg border">
                                <label class="block text-sm text-gray-600 mb-1">Precio:</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-500">$</span>
                                    <input type="number" step="1" min="0" value="${(adminSettings.priceOverrides && adminSettings.priceOverrides[product.id]?.price) ?? product.price}" data-product-id="${product.id}" class="price-input w-24 border rounded px-2 py-1 focus:ring-yellow-400 focus:border-yellow-400">
                                    <button class="save-price-btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm" data-product-id="${product.id}">
                                        Guardar
                                    </button>
                                    ${adminSettings.priceOverrides && adminSettings.priceOverrides[product.id]?.price != null ? `<button class="reset-price-btn bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm" data-product-id="${product.id}">Reset</button>` : ''}
                                </div>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg border">
                                <label class="block text-sm text-gray-600 mb-1">Precio original (tachado):</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-500">$</span>
                                    <input type="number" step="1" min="0" value="${(adminSettings.priceOverrides && adminSettings.priceOverrides[product.id]?.originalPrice) ?? (product.originalPrice ?? '')}" data-product-id="${product.id}" class="original-price-input w-24 border rounded px-2 py-1 focus:ring-yellow-400 focus:border-yellow-400" placeholder="Ej. 300">
                                    <button class="save-original-price-btn bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-sm" data-product-id="${product.id}">
                                        Guardar
                                    </button>
                                    ${adminSettings.priceOverrides && adminSettings.priceOverrides[product.id]?.originalPrice != null ? `<button class="reset-original-price-btn bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm" data-product-id="${product.id}">Reset</button>` : ''}
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Se muestra como precio tachado y activa el mensaje de ahorro si es mayor al precio actual.</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg border">
                                <label class="block text-sm text-gray-600 mb-1">Imagen (URL):</label>
                                <div class="flex items-center gap-2">
                                    <input type="url" placeholder="https://..." value="${(adminSettings.imageOverrides && adminSettings.imageOverrides[product.id]?.image) || ''}" data-product-id="${product.id}" class="image-input flex-1 border rounded px-2 py-1 focus:ring-yellow-400 focus:border-yellow-400">
                                    <button class="save-image-btn bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm" data-product-id="${product.id}">Guardar</button>
                                    ${adminSettings.imageOverrides && adminSettings.imageOverrides[product.id]?.image ? `<button class="reset-image-btn bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm" data-product-id="${product.id}">Reset</button>` : ''}
                                </div>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg border">
                                <label class="block text-sm text-gray-600 mb-1">Botón "Personalizar" en la web:</label>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-gray-600">${effectiveCustomize ? 'Se mostrará el botón Personalizar' : 'No se mostrará el botón Personalizar'}</span>
                                    <label class="switch">
                                        <input type="checkbox" class="customize-toggle" data-product-id="${product.id}" data-base-value="${baseHasCustomize ? '1' : '0'}" ${effectiveCustomize ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg border">
                                <label class="block text-sm text-gray-600 mb-1">Especificaciones del cliente:</label>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-gray-600">${effectiveSpecs
                                        ? 'El cliente verá un campo para escribir indicaciones (ej. "sin cebolla")'
                                        : 'No se mostrará el campo de especificaciones para este producto'}</span>
                                    <label class="switch">
                                        <input type="checkbox" class="specifications-toggle" data-product-id="${product.id}" data-base-value="${baseAllowsSpecs ? '1' : '0'}" ${effectiveSpecs ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Toggle button -->
                        <button onclick="toggleProduct(${product.id})" 
                                class="w-full py-2 px-4 rounded-lg font-semibold transition-all duration-300 ${
                                    isHidden ? 
                                    'bg-green-500 hover:bg-green-600 text-white' : 
                                    'bg-red-500 hover:bg-red-600 text-white'
                                }">
                            <i class="fas ${isHidden ? 'fa-eye' : 'fa-eye-slash'} mr-2"></i>
                            ${isHidden ? 'Mostrar Producto' : 'Ocultar Producto'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Toggle product visibility
    window.toggleProduct = async function(productId) {
        console.log(`🔄 Toggling product ${productId}...`);
        
        const pid = Number(productId);
        const product = findProductById(pid);
        const currentlyHidden = isProductHidden(pid);

        if (currentlyHidden) {
            // Show product
            adminSettings.hiddenProducts = normalizeHiddenProducts(
                adminSettings.hiddenProducts.filter((h) => Number(h) !== pid)
            );
            console.log(`👁️ Producto ${productId} (${product?.name || ''}) ahora es VISIBLE`);
            showToast(`${product?.name || 'Producto'} ahora es VISIBLE`, 'success');
        } else {
            // Hide product
            adminSettings.hiddenProducts = normalizeHiddenProducts([
                ...adminSettings.hiddenProducts,
                pid
            ]);
            console.log(`🙈 Producto ${productId} (${product?.name || ''}) ahora está OCULTO`);
            showToast(`${product?.name || 'Producto'} ahora está OCULTO`, 'warning');
        }
        
        // Update global reference for compatibility
        window.hiddenProducts = adminSettings.hiddenProducts;
        
        console.log('💾 Guardando cambio de producto...');
        console.log('Productos ocultos actuales:', adminSettings.hiddenProducts);
        
        // Re-render inmediatamente para feedback visual
        renderProducts(currentCategory);
        
        try {
            await saveSettingsToFirebase();
            // Re-render por si el listener remoto trae cambios
            renderProducts(currentCategory);
        } catch (e) {
            console.error('Error guardando cambio de producto', e);
            showToast('No se pudo sincronizar, usando estado local', 'warning');
        }
    };

    // Find product by ID
    function findProductById(productId) {
        for (const category in menuData) {
            const product = menuData[category].find(p => Number(p.id) === Number(productId));
            if (product) return product;
        }
        return null;
    }

    // Find base product by ID (not including custom products)
    function findBaseProductById(productId) {
        const pid = Number(productId);
        for (const category in menuData) {
            const product = (menuData[category] || []).find(p => Number(p.id) === pid);
            if (product) return { category, product };
        }
        return null;
    }

    // Show all products
    window.showAllProducts = async function() {
        adminSettings.hiddenProducts = [];
        window.hiddenProducts = adminSettings.hiddenProducts;
        await saveSettingsToFirebase();
        renderProducts(currentCategory);
        showToast('Todos los productos son ahora VISIBLES', 'success');
    };

    // Hide all products
    window.hideAllProducts = async function() {
        const allProducts = [];
        Object.values(menuData).forEach(category => {
            category.forEach(product => allProducts.push(Number(product.id)));
        });
        adminSettings.hiddenProducts = normalizeHiddenProducts(allProducts);
        window.hiddenProducts = adminSettings.hiddenProducts;
        await saveSettingsToFirebase();
        renderProducts(currentCategory);
        showToast('Todos los productos están ahora OCULTOS', 'warning');
    };

    // Reset settings
    window.resetSettings = async function() {
        if (confirm('¿Estás seguro de que quieres resetear todas las configuraciones?')) {
            adminSettings = {
                serviceActive: true,
                hiddenProducts: [],
                priceOverrides: {},
                imageOverrides: {},
                customProducts: {},
                categories: [...DEFAULT_CATEGORIES],
                productOrder: {},
                productInfoOverrides: {},
                customizeButtonOverrides: {},
                specificationsOverrides: {}
            };
            window.hiddenProducts = adminSettings.hiddenProducts;
            
            document.getElementById('service-toggle').checked = true;
            updateServiceStatus();
            ensureCurrentCategoryValid();
            renderCategoryTabs();
            populateCategorySelect();
            renderProducts(currentCategory);
            
            await saveSettingsToFirebase();
            showToast('Configuración reseteada exitosamente', 'success');
        }
    };

    // Show toast notification
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        
        // Set toast color based on type
        toast.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-xl z-50 transform transition-transform duration-300 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'warning' ? 'bg-orange-500' : 
            'bg-red-500'
        } text-white`;
        
        // Show toast
        toast.classList.remove('translate-x-full');
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
        }, 3000);
    }

    // Setup event listeners
    function setupEventListeners() {
        // Add/Edit product modal state
        let productModalMode = 'add';
        let editingProductId = null;
        let editingIsBase = false;

        // Open Add Product modal
        const openBtn = document.getElementById('add-product-btn');
        const modal = document.getElementById('add-product-modal');
        const closeBtn = document.getElementById('close-add-product');
        const cancelBtn = document.getElementById('cancel-add-product');
        const saveBtn = document.getElementById('save-add-product');
        const modalTitle = document.getElementById('product-modal-title');
        const catSel = document.getElementById('new-product-category');
        const nameInput = document.getElementById('new-product-name');
        const priceInput = document.getElementById('new-product-price');
        const descInput = document.getElementById('new-product-description');
        const imgInput = document.getElementById('new-product-image');

        // Add Category modal
        const addCategoryBtn = document.getElementById('add-category-btn');
        const addCategoryModal = document.getElementById('add-category-modal');
        const closeAddCategory = document.getElementById('close-add-category');
        const cancelAddCategory = document.getElementById('cancel-add-category');
        const saveAddCategory = document.getElementById('save-add-category');
        const newCategoryName = document.getElementById('new-category-name');

        const openCategoryModal = () => {
            if (newCategoryName) newCategoryName.value = '';
            if (addCategoryModal) {
                addCategoryModal.classList.remove('hidden');
                addCategoryModal.classList.add('flex');
            }
            setTimeout(() => { try { newCategoryName && newCategoryName.focus(); } catch (_) {} }, 0);
        };
        const closeCategoryModal = () => {
            if (addCategoryModal) {
                addCategoryModal.classList.add('hidden');
                addCategoryModal.classList.remove('flex');
            }
        };

        const openModal = () => { if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); } };
        const closeModal = () => { if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } };

        const setModalModeAdd = () => {
            productModalMode = 'add';
            editingProductId = null;
            editingIsBase = false;
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus mr-2 text-yellow-500"></i>Nuevo Producto';
            if (saveBtn) saveBtn.textContent = 'Añadir';
            if (catSel) catSel.disabled = false;
            if (nameInput) nameInput.value = '';
            if (priceInput) priceInput.value = '';
            if (descInput) descInput.value = '';
            if (imgInput) imgInput.value = '';
        };

        const setModalModeEdit = (product, category) => {
            productModalMode = 'edit';
            editingProductId = Number(product.id);
            editingIsBase = false;
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-pen mr-2 text-indigo-600"></i>Editar Producto';
            if (saveBtn) saveBtn.textContent = 'Guardar cambios';
            if (catSel) {
                catSel.value = category;
                catSel.disabled = false; // permitir mover de categoría si lo deseas
            }
            if (nameInput) nameInput.value = product.name || '';
            if (priceInput) priceInput.value = Number(product.price) || 0;
            if (descInput) descInput.value = product.description || '';
            if (imgInput) imgInput.value = product.image || '';
        };

        const setModalModeEditBase = (product, category) => {
            productModalMode = 'edit';
            editingProductId = Number(product.id);
            editingIsBase = true;
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-pen mr-2 text-slate-700"></i>Editar Producto (Base)';
            if (saveBtn) saveBtn.textContent = 'Guardar cambios';
            if (catSel) {
                catSel.value = category;
                catSel.disabled = true; // los productos base no se mueven de categoría
            }

            const effectiveName = (adminSettings.productInfoOverrides && adminSettings.productInfoOverrides[product.id]?.name) || product.name;
            const effectiveDesc = (adminSettings.productInfoOverrides && adminSettings.productInfoOverrides[product.id]?.description) || product.description;
            const effectivePrice = (adminSettings.priceOverrides && adminSettings.priceOverrides[product.id]?.price) ?? product.price;
            const effectiveImage = (adminSettings.imageOverrides && adminSettings.imageOverrides[product.id]?.image) || product.image;

            if (nameInput) nameInput.value = effectiveName || '';
            if (priceInput) priceInput.value = Number(effectivePrice) || 0;
            if (descInput) descInput.value = effectiveDesc || '';
            if (imgInput) imgInput.value = effectiveImage || '';
        };

        const findCustomProductById = (id) => {
            const pid = Number(id);
            const customByCat = adminSettings.customProducts || {};
            for (const cat of Object.keys(customByCat)) {
                const arr = Array.isArray(customByCat[cat]) ? customByCat[cat] : [];
                const idx = arr.findIndex(p => Number(p.id) === pid);
                if (idx !== -1) return { category: cat, index: idx, product: arr[idx] };
            }
            return null;
        };

        if (openBtn) openBtn.addEventListener('click', () => { setModalModeAdd(); openModal(); });
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        if (saveBtn) saveBtn.addEventListener('click', async () => {
            const category = catSel.value;
            const name = (nameInput.value || '').trim();
            const price = Number(priceInput.value);
            const description = (descInput.value || '').trim();
            let image = (imgInput.value || '').trim();
            if (!name) { showToast('Nombre requerido', 'error'); return; }
            if (Number.isNaN(price) || price < 0) { showToast('Precio inválido', 'error'); return; }
            if (!/^https?:\/\//i.test(image)) { showToast('URL de imagen inválida', 'error'); return; }
            image = sanitizeImageUrl(image);

            adminSettings.customProducts = adminSettings.customProducts || {};

            if (productModalMode === 'edit' && editingProductId != null) {
                if (editingIsBase) {
                    // Base product: store overrides instead of rewriting the base menu
                    adminSettings.productInfoOverrides = adminSettings.productInfoOverrides || {};
                    adminSettings.productInfoOverrides[editingProductId] = { name, description };

                    adminSettings.priceOverrides = adminSettings.priceOverrides || {};
                    adminSettings.priceOverrides[editingProductId] = { ...(adminSettings.priceOverrides[editingProductId] || {}), price: Math.round(price) };

                    adminSettings.imageOverrides = adminSettings.imageOverrides || {};
                    adminSettings.imageOverrides[editingProductId] = { image };
                } else {
                    const found = findCustomProductById(editingProductId);
                    if (!found) { showToast('Solo puedes editar productos agregados desde el admin', 'error'); return; }

                    // Actualizar el producto (y permitir mover de categoría)
                    const updated = { id: editingProductId, name, price: Math.round(price), description, image };
                    // Remove from old
                    adminSettings.customProducts[found.category].splice(found.index, 1);
                    if (adminSettings.customProducts[found.category].length === 0) {
                        delete adminSettings.customProducts[found.category];
                    }
                    // Add to new category
                    adminSettings.customProducts[category] = adminSettings.customProducts[category] || [];
                    adminSettings.customProducts[category].push(updated);

                    // Limpieza: si tenía overrides por ID, los quitamos para evitar duplicidad
                    if (adminSettings.priceOverrides && adminSettings.priceOverrides[editingProductId]) {
                        delete adminSettings.priceOverrides[editingProductId];
                    }
                    if (adminSettings.imageOverrides && adminSettings.imageOverrides[editingProductId]) {
                        delete adminSettings.imageOverrides[editingProductId];
                    }
                    if (adminSettings.productInfoOverrides && adminSettings.productInfoOverrides[editingProductId]) {
                        delete adminSettings.productInfoOverrides[editingProductId];
                    }
                }
            } else {
                // Generate unique ID: max existing ID + 1 across all categories and custom
                const allIds = [];
                Object.values(menuData).forEach(arr => arr.forEach(p => allIds.push(Number(p.id))));
                Object.values(adminSettings.customProducts || {}).forEach(arr => arr.forEach(p => allIds.push(Number(p.id))));
                const nextId = (Math.max(0, ...allIds.filter(n => !Number.isNaN(n))) + 1) || Date.now();

                const newProduct = { id: nextId, name, price: Math.round(price), description, image };
                adminSettings.customProducts[category] = adminSettings.customProducts[category] || [];
                adminSettings.customProducts[category].push(newProduct);
            }

            try {
                await saveSettingsToFirebase();
                // Switch to the category and re-render
                setCurrentCategory(category);
                showToast(productModalMode === 'edit' ? 'Producto actualizado' : 'Producto añadido', 'success');
                closeModal();
                setModalModeAdd();
            } catch (err) {
                console.error('No se pudo guardar producto', err);
                showToast('Error guardando producto', 'error');
            }
        });

        // Edit/Delete custom products
        document.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-product-btn');
            if (editBtn) {
                const id = Number(editBtn.dataset.productId);
                const foundCustom = findCustomProductById(id);
                if (foundCustom) {
                    setModalModeEdit(foundCustom.product, foundCustom.category);
                } else {
                    const foundBase = findBaseProductById(id);
                    if (!foundBase) { showToast('Producto no encontrado', 'error'); return; }
                    setModalModeEditBase(foundBase.product, foundBase.category);
                }
                openModal();
                return;
            }

            const delBtn = e.target.closest('.delete-product-btn');
            if (delBtn) {
                const id = Number(delBtn.dataset.productId);
                const foundCustom = findCustomProductById(id);
                if (foundCustom) {
                    if (!confirm(`¿Eliminar "${foundCustom.product.name}"? Esta acción no se puede deshacer.`)) return;

                    // Remove product
                    adminSettings.customProducts[foundCustom.category].splice(foundCustom.index, 1);
                    if (adminSettings.customProducts[foundCustom.category].length === 0) {
                        delete adminSettings.customProducts[foundCustom.category];
                    }

                    // Cleanup overrides/hidden flags tied to this ID
                    if (adminSettings.priceOverrides && adminSettings.priceOverrides[id]) delete adminSettings.priceOverrides[id];
                    if (adminSettings.imageOverrides && adminSettings.imageOverrides[id]) delete adminSettings.imageOverrides[id];
                    if (adminSettings.productInfoOverrides && adminSettings.productInfoOverrides[id]) delete adminSettings.productInfoOverrides[id];
                    if (adminSettings.customizeButtonOverrides && adminSettings.customizeButtonOverrides[id] !== undefined) delete adminSettings.customizeButtonOverrides[id];
                    if (adminSettings.specificationsOverrides && adminSettings.specificationsOverrides[id] !== undefined) delete adminSettings.specificationsOverrides[id];
                    if (Array.isArray(adminSettings.hiddenProducts)) {
                        adminSettings.hiddenProducts = normalizeHiddenProducts(adminSettings.hiddenProducts.filter(h => Number(h) !== id));
                        window.hiddenProducts = adminSettings.hiddenProducts;
                    }
                } else {
                    const foundBase = findBaseProductById(id);
                    if (!foundBase) { showToast('Producto no encontrado', 'error'); return; }
                    const nameToShow = (adminSettings.productInfoOverrides && adminSettings.productInfoOverrides[id]?.name) || foundBase.product.name;
                    if (!confirm(`¿Eliminar (ocultar) "${nameToShow}"? Puedes volver a mostrarlo con el botón "Mostrar Producto".`)) return;

                    // Soft-delete for base products: mark as hidden
                    adminSettings.hiddenProducts = normalizeHiddenProducts([...(adminSettings.hiddenProducts || []), id]);
                    window.hiddenProducts = adminSettings.hiddenProducts;

                    // Optionally cleanup overrides so it comes back as original if re-enabled
                    if (adminSettings.priceOverrides && adminSettings.priceOverrides[id]) delete adminSettings.priceOverrides[id];
                    if (adminSettings.imageOverrides && adminSettings.imageOverrides[id]) delete adminSettings.imageOverrides[id];
                    if (adminSettings.productInfoOverrides && adminSettings.productInfoOverrides[id]) delete adminSettings.productInfoOverrides[id];
                    if (adminSettings.customizeButtonOverrides && adminSettings.customizeButtonOverrides[id] !== undefined) delete adminSettings.customizeButtonOverrides[id];
                    if (adminSettings.specificationsOverrides && adminSettings.specificationsOverrides[id] !== undefined) delete adminSettings.specificationsOverrides[id];
                }

                try {
                    await saveSettingsToFirebase();
                    renderProducts(currentCategory);
                    showToast('Producto eliminado', 'success');
                } catch (err) {
                    console.error('No se pudo eliminar producto', err);
                    showToast('Error eliminando producto', 'error');
                }
            }
        });
        // Service toggle
        document.getElementById('service-toggle').addEventListener('change', async () => {
            const newStatus = document.getElementById('service-toggle').checked;
            console.log(`🔄 Cambiando servicio a: ${newStatus ? 'ACTIVO' : 'INACTIVO'}`);
            
            adminSettings.serviceActive = newStatus;
            updateServiceStatus();
            
            console.log('💾 Guardando cambio de servicio...');
            await saveSettingsToFirebase();
            
            showToast(
                adminSettings.serviceActive ? 'Servicio ACTIVADO - Los clientes pueden hacer pedidos' : 'Servicio DESACTIVADO - Página cerrada temporalmente',
                adminSettings.serviceActive ? 'success' : 'warning'
            );
        });

        // Category tabs (event delegation)
        const tabsEl = document.getElementById('category-tabs');
        if (tabsEl) {
            tabsEl.addEventListener('click', (e) => {
                const tab = e.target.closest('.category-tab');
                if (!tab) return;
                const category = tab.dataset.category;
                if (!category) return;
                setCurrentCategory(category);
            });
        }

        // Add Category handlers
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', openCategoryModal);
        if (closeAddCategory) closeAddCategory.addEventListener('click', closeCategoryModal);
        if (cancelAddCategory) cancelAddCategory.addEventListener('click', closeCategoryModal);
        if (saveAddCategory) saveAddCategory.addEventListener('click', async () => {
            const rawName = (newCategoryName && newCategoryName.value) ? newCategoryName.value : '';
            const name = String(rawName || '').trim();
            if (!name) { showToast('Nombre de sección requerido', 'error'); return; }

            const existing = getAllCategories();
            const exists = existing.some((c) => c.toLowerCase() === name.toLowerCase());
            if (exists) { showToast('Esa sección ya existe', 'warning'); return; }

            const current = normalizeCategories(adminSettings.categories);
            adminSettings.categories = [...current, name];

            try {
                await saveSettingsToFirebase();
                renderCategoryTabs();
                populateCategorySelect();
                setCurrentCategory(name);
                closeCategoryModal();
                showToast('Sección agregada', 'success');
            } catch (err) {
                console.error('No se pudo guardar sección', err);
                showToast('Error guardando sección', 'error');
            }
        });

        // Guardar precio override
        document.addEventListener('click', async (e) => {
            const moveUpBtn = e.target.closest('.move-up-btn');
            const moveDownBtn = e.target.closest('.move-down-btn');
            if (moveUpBtn || moveDownBtn) {
                const id = Number((moveUpBtn || moveDownBtn).dataset.productId);
                const dir = moveUpBtn ? -1 : 1;
                const category = currentCategory;

                const merged = getMergedProductsForCategory(category);
                const sanitized = sanitizeProductOrderForAllCategories(adminSettings.productOrder || {});
                const orderIds = Array.isArray(sanitized[category]) ? sanitized[category] : merged.map(p => Number(p.id)).filter(n => !Number.isNaN(n));

                const idx = orderIds.findIndex(x => Number(x) === Number(id));
                if (idx === -1) return;
                const nextIdx = idx + dir;
                if (nextIdx < 0 || nextIdx >= orderIds.length) return;

                const swapped = [...orderIds];
                const tmp = swapped[idx];
                swapped[idx] = swapped[nextIdx];
                swapped[nextIdx] = tmp;

                adminSettings.productOrder = adminSettings.productOrder || {};
                adminSettings.productOrder[category] = swapped;

                try {
                    await saveSettingsToFirebase();
                    renderProducts(currentCategory);
                    showToast('Orden actualizado', 'success');
                } catch (err) {
                    console.error('No se pudo guardar el orden', err);
                    showToast('Error guardando orden', 'error');
                }
                return;
            }

            if (e.target.classList.contains('save-price-btn')) {
                const id = parseInt(e.target.dataset.productId);
                const input = document.querySelector(`.price-input[data-product-id="${id}"]`);
                const val = parseFloat(input.value);
                if (isNaN(val) || val < 0) { showToast('Precio inválido', 'error'); return; }
                adminSettings.priceOverrides = adminSettings.priceOverrides || {};
                adminSettings.priceOverrides[id] = { ...(adminSettings.priceOverrides[id]||{}), price: Math.round(val) };
                await saveSettingsToFirebase();
                renderProducts(currentCategory);
                showToast('Precio guardado', 'success');
            }
            if (e.target.classList.contains('reset-price-btn')) {
                const id = parseInt(e.target.dataset.productId);
                if (adminSettings.priceOverrides && adminSettings.priceOverrides[id]) {
                    delete adminSettings.priceOverrides[id].price;
                    if (Object.keys(adminSettings.priceOverrides[id]).length === 0) delete adminSettings.priceOverrides[id];
                    await saveSettingsToFirebase();
                    renderProducts(currentCategory);
                    showToast('Precio restablecido', 'success');
                }
            }
            if (e.target.classList.contains('save-original-price-btn')) {
                const id = parseInt(e.target.dataset.productId);
                const input = document.querySelector(`.original-price-input[data-product-id="${id}"]`);
                const val = parseFloat(input.value);
                if (isNaN(val) || val < 0) { showToast('Precio original inválido', 'error'); return; }
                adminSettings.priceOverrides = adminSettings.priceOverrides || {};
                adminSettings.priceOverrides[id] = { ...(adminSettings.priceOverrides[id]||{}), originalPrice: Math.round(val) };
                await saveSettingsToFirebase();
                renderProducts(currentCategory);
                showToast('Precio original guardado', 'success');
            }
            if (e.target.classList.contains('reset-original-price-btn')) {
                const id = parseInt(e.target.dataset.productId);
                if (adminSettings.priceOverrides && adminSettings.priceOverrides[id]) {
                    delete adminSettings.priceOverrides[id].originalPrice;
                    if (Object.keys(adminSettings.priceOverrides[id]).length === 0) delete adminSettings.priceOverrides[id];
                    await saveSettingsToFirebase();
                    renderProducts(currentCategory);
                    showToast('Precio original restablecido', 'success');
                }
            }
            if (e.target.classList.contains('save-image-btn')) {
                const id = parseInt(e.target.dataset.productId);
                const input = document.querySelector(`.image-input[data-product-id="${id}"]`);
                let url = (input.value || '').trim();
                if (!url || !/^https?:\/\//i.test(url)) { showToast('URL inválida', 'error'); return; }
                const sanitized = sanitizeImageUrl(url);
                if (sanitized !== url) {
                    url = sanitized;
                    input.value = url;
                    showToast('Enlace convertido a imagen directa', 'success');
                }
                adminSettings.imageOverrides = adminSettings.imageOverrides || {};
                adminSettings.imageOverrides[id] = { image: url };
                await saveSettingsToFirebase();
                renderProducts(currentCategory);
                showToast('Imagen guardada', 'success');
            }
            if (e.target.classList.contains('reset-image-btn')) {
                const id = parseInt(e.target.dataset.productId);
                if (adminSettings.imageOverrides && adminSettings.imageOverrides[id]) {
                    delete adminSettings.imageOverrides[id];
                    await saveSettingsToFirebase();
                    renderProducts(currentCategory);
                    showToast('Imagen restablecida', 'success');
                }
            }
        });

        // Toggles desde la tarjeta de producto (Personalizar / Especificaciones)
        document.addEventListener('change', async (e) => {
            if (e.target.classList.contains('customize-toggle')) {
                const id = Number(e.target.dataset.productId);
                const isChecked = !!e.target.checked;
                const baseVal = e.target.dataset.baseValue === '1';

                adminSettings.customizeButtonOverrides = adminSettings.customizeButtonOverrides || {};

                // Si coincide con el valor base, quitamos el override para mantener limpio
                if (isChecked === baseVal) {
                    if (adminSettings.customizeButtonOverrides[id] !== undefined) {
                        delete adminSettings.customizeButtonOverrides[id];
                    }
                } else {
                    adminSettings.customizeButtonOverrides[id] = isChecked;
                }

                try {
                    await saveSettingsToFirebase();
                    renderProducts(currentCategory);
                    showToast(isChecked ? 'Se mostrará el botón Personalizar en la página principal' : 'Se ocultará el botón Personalizar en la página principal', 'success');
                } catch (err) {
                    console.error('No se pudo guardar el estado del botón Personalizar', err);
                    showToast('Error guardando botón Personalizar', 'error');
                }
            } else if (e.target.classList.contains('specifications-toggle')) {
                const id = Number(e.target.dataset.productId);
                const isChecked = !!e.target.checked;
                const baseVal = e.target.dataset.baseValue === '1';

                adminSettings.specificationsOverrides = adminSettings.specificationsOverrides || {};

                if (isChecked === baseVal) {
                    if (adminSettings.specificationsOverrides[id] !== undefined) {
                        delete adminSettings.specificationsOverrides[id];
                    }
                } else {
                    adminSettings.specificationsOverrides[id] = isChecked;
                }

                try {
                    await saveSettingsToFirebase();
                    renderProducts(currentCategory);
                    showToast(isChecked ? 'Se mostrará el campo de especificaciones para este producto' : 'Se ocultará el campo de especificaciones para este producto', 'success');
                } catch (err) {
                    console.error('No se pudo guardar el estado del botón de especificaciones', err);
                    showToast('Error guardando botón de especificaciones', 'error');
                }
            }
        });
    }

    // (Removed duplicate initAdmin() call; initialization happens after Firebase is ready)
});
