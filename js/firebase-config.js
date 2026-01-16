// Configuración de Firebase para SR & SRA BURGER
// ✅ CONFIGURACIÓN REAL OBTENIDA DE FIREBASE CONSOLE

const firebaseConfig = {
    apiKey: "AIzaSyCf7-6oLHjpNgU1zr4qdTrOKuXGe1ht2Zs",
    authDomain: "sr-sra-burger.firebaseapp.com",
    projectId: "sr-sra-burger",
    storageBucket: "sr-sra-burger.firebasestorage.app",
    messagingSenderId: "542059080203",
    appId: "1:542059080203:web:2e15f179a1475b1a77f50e"
};

// Inicializar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    arrayUnion,
    arrayRemove,
    onSnapshot,
    orderBy,
    query,
    where,
    limit,
    serverTimestamp,
    setDoc,
    getDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Funciones para manejar pedidos en Firebase
class FirebaseOrderManager {
    constructor() {
        this.ordersCollection = collection(db, 'orders');
        this.historyCollection = collection(db, 'orders_history');
    }

    // Guardar pedido en historial (al marcar Entregado) y remover de 'orders'
    async archiveOrderToHistory(orderId) {
        try {
            if (!orderId) throw new Error('orderId requerido');

            const orderRef = doc(db, 'orders', orderId);
            const historyRef = doc(db, 'orders_history', orderId);

            await runTransaction(db, async (tx) => {
                const [orderSnap, historySnap] = await Promise.all([
                    tx.get(orderRef),
                    tx.get(historyRef)
                ]);

                // Si ya existe en historial, solo aseguramos que no exista en orders
                if (historySnap.exists()) {
                    if (orderSnap.exists()) tx.delete(orderRef);
                    return;
                }

                if (!orderSnap.exists()) {
                    // Nada que archivar
                    return;
                }

                const data = orderSnap.data() || {};
                const archivedOrder = this.cleanOrderData({
                    ...data,
                    status: 'delivered',
                    archivedAt: serverTimestamp(),
                    deliveredAt: serverTimestamp(),
                    originalOrderId: orderId
                });

                tx.set(historyRef, archivedOrder);
                tx.delete(orderRef);
            });

            return true;
        } catch (error) {
            console.error('❌ Error archivando pedido:', error);
            throw error;
        }
    }

    // Escuchar historial en tiempo real
    onHistoryOrdersChange(callback) {
        const q = query(this.historyCollection, orderBy('archivedAt', 'desc'));
        return onSnapshot(
            q,
            (querySnapshot) => {
                const orders = [];
                querySnapshot.forEach((docSnap) => {
                    const d = docSnap.data() || {};
                    orders.push({
                        id: docSnap.id,
                        ...d
                    });
                });
                callback(orders);
            },
            (error) => {
                console.error('❌ Error escuchando historial:', error);
                try { if (window.showFirebaseError) window.showFirebaseError(error); } catch (_) {}
                try { callback([]); } catch (_) {}
            }
        );
    }

    // Obtener historial (una vez)
    async getHistoryOrders() {
        try {
            const q = query(this.historyCollection, orderBy('archivedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const orders = [];
            querySnapshot.forEach((docSnap) => {
                const d = docSnap.data() || {};
                orders.push({
                    id: docSnap.id,
                    ...d
                });
            });
            return orders;
        } catch (error) {
            console.error('Error obteniendo historial: ', error);
            throw error;
        }
    }

    // Agregar nuevo pedido
    async addOrder(orderData) {
        try {
            // Generar número de orden legible (YYYYMMDD-XXX)
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const rand = Math.floor(Math.random() * 900) + 100; // 100-999
            const orderNumber = `${yyyy}${mm}${dd}-${rand}`;

            // Calcular puntos (se acreditan SOLO cuando el pedido se marca como pagado)
            const totalNumber = typeof orderData.total === 'number' ? orderData.total : Number(orderData.total || 0);
            const pointsEarned = Math.max(0, Math.floor(totalNumber / 10));

            // Limpiar datos para evitar valores undefined
            const cleanedOrder = this.cleanOrderData({
                ...orderData,
                // Si el frontend no envía clienteId, intentar asociar el pedido al usuario autenticado actual
                clienteId: orderData.clienteId || (auth && auth.currentUser ? auth.currentUser.uid : undefined),
                orderNumber,
                timestamp: serverTimestamp(),
                status: 'pending',
                confirmed: false,
                onWaySent: false,
                arrivedSent: false,
                paid: false,
                // Puntos: se guardan como referencia y se acreditan al marcar PAGADO
                pointsEarned,
                pointsCredited: false,
                pointsAdded: 0,
                estimatedTime: this.calculateEstimatedTime(orderData.items)
            });

            const docRef = await addDoc(this.ordersCollection, cleanedOrder);
            console.log('✅ Pedido agregado con ID: ', docRef.id);
            return { id: docRef.id, orderNumber };
        } catch (error) {
            console.error('❌ Error agregando pedido: ', error);
            try { if (window.showFirebaseError) window.showFirebaseError(error); } catch (_) {}
            throw error;
        }
    }

    // Función para limpiar datos y remover valores undefined
    cleanOrderData(data) {
        const cleaned = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
                    // Si es un objeto, limpiar recursivamente
                    const cleanedObj = this.cleanOrderData(value);
                    if (Object.keys(cleanedObj).length > 0) {
                        cleaned[key] = cleanedObj;
                    }
                } else if (Array.isArray(value)) {
                    // Si es un array, limpiar cada elemento
                    const cleanedArray = value.map(item => 
                        typeof item === 'object' ? this.cleanOrderData(item) : item
                    ).filter(item => item !== undefined && item !== null);
                    if (cleanedArray.length > 0) {
                        cleaned[key] = cleanedArray;
                    }
                } else {
                    cleaned[key] = value;
                }
            }
        }
        
        return cleaned;
    }

    // Obtener todos los pedidos
    async getOrders() {
        try {
            const q = query(this.ordersCollection, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);
            const orders = [];
            
            querySnapshot.forEach((doc) => {
                orders.push({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate()?.toISOString() || new Date().toISOString()
                });
            });
            
            return orders;
        } catch (error) {
            console.error('Error obteniendo pedidos: ', error);
            throw error;
        }
    }

    // Escuchar cambios en tiempo real
    onOrdersChange(callback) {
        const q = query(this.ordersCollection, orderBy('timestamp', 'desc'));
        return onSnapshot(
            q,
            (querySnapshot) => {
                const orders = [];
                querySnapshot.forEach((doc) => {
                    orders.push({
                        id: doc.id,
                        ...doc.data(),
                        timestamp: doc.data().timestamp?.toDate()?.toISOString() || new Date().toISOString()
                    });
                });
                callback(orders);
            },
            (error) => {
                console.error('❌ Error escuchando pedidos:', error);
                try { if (window.showFirebaseError) window.showFirebaseError(error); } catch (_) {}
                try { callback([]); } catch (_) {}
            }
        );
    }

    // Buscar pedido por número de orden
    async findOrderByNumber(orderNumber) {
        try {
            const q = query(this.ordersCollection, where('orderNumber', '==', orderNumber), limit(1));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            const docSnap = snapshot.docs[0];
            return {
                id: docSnap.id,
                ...docSnap.data(),
                timestamp: docSnap.data().timestamp?.toDate()?.toISOString() || new Date().toISOString()
            };
        } catch (error) {
            console.error('Error buscando pedido por número:', error);
            throw error;
        }
    }

    // Suscribirse a un pedido por número en tiempo real
    subscribeOrderByNumber(orderNumber, callback) {
        try {
            const q = query(this.ordersCollection, where('orderNumber', '==', orderNumber), limit(1));
            return onSnapshot(q, (snapshot) => {
                if (snapshot.empty) return; // No emitir si no hay
                const docSnap = snapshot.docs[0];
                const data = docSnap.data();
                callback({
                    id: docSnap.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString()
                });
            });
        } catch (error) {
            console.error('Error suscribiéndose al pedido:', error);
            return () => {};
        }
    }

    // Actualizar pedido
    async updateOrder(orderId, updateData) {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, updateData);
            console.log('Pedido actualizado correctamente');
        } catch (error) {
            console.error('Error actualizando pedido: ', error);
            throw error;
        }
    }

    // Eliminar pedido
    async deleteOrder(orderId) {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await deleteDoc(orderRef);
            console.log('Pedido eliminado correctamente');
        } catch (error) {
            console.error('Error eliminando pedido: ', error);
            throw error;
        }
    }

    // Calcular tiempo estimado
    calculateEstimatedTime(items) {
        const baseTime = 15;
        const timePerItem = 5;
        return baseTime + (items.length * timePerItem);
    }

    // Rellenar metadatos (productId, unitPrice) en órdenes antiguas
    async backfillOrderItemsMetadata() {
        try {
            const q = query(this.ordersCollection);
            const snapshot = await getDocs(q);

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data() || {};
                const items = Array.isArray(data.items) ? data.items : [];
                if (!items.length) continue;

                let changed = false;
                const nextItems = items.map((it) => {
                    if (!it || typeof it !== 'object') return it;
                    const copy = { ...it };

                    const baseId = Number(copy.productId || copy.id || copy.baseItemId || copy.itemId);
                    if (Number.isFinite(baseId) && copy.productId == null) {
                        copy.productId = baseId;
                        changed = true;
                    }

                    const qtyRaw = Number(copy.quantity || 1);
                    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
                    if (copy.unitPrice == null) {
                        const lineTotal = Number(copy.price || 0);
                        if (Number.isFinite(lineTotal) && qty > 0) {
                            copy.unitPrice = lineTotal / qty;
                            changed = true;
                        }
                    }

                    return copy;
                });

                if (!changed) continue;

                const ref = doc(db, 'orders', docSnap.id);
                await updateDoc(ref, { items: nextItems });
            }
        } catch (error) {
            console.error('Error haciendo backfill de metadatos de órdenes:', error);
        }
    }
}

// Clase para manejar configuraciones de administración
class FirebaseAdminManager {
    constructor() {
        this.db = db;
        this.settingsRef = 'admin-settings';
    }

    // Obtener configuraciones
    async getSettings() {
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
            const docRef = doc(this.db, this.settingsRef, 'main');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                // Configuración por defecto
                const defaultSettings = {
                    serviceActive: true,
                    hiddenProducts: [],
                    lastUpdated: new Date().toISOString()
                };
                await this.saveSettings(defaultSettings);
                return defaultSettings;
            }
        } catch (error) {
            console.error('Error obteniendo configuraciones:', error);
            throw error;
        }
    }

    // Guardar configuraciones
    async saveSettings(settings) {
        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
            const docRef = doc(this.db, this.settingsRef, 'main');
            
            const settingsToSave = {
                ...settings,
                lastUpdated: new Date().toISOString()
            };
            
            await setDoc(docRef, settingsToSave);
            console.log('Configuraciones guardadas en Firebase');
            return true;
        } catch (error) {
            console.error('Error guardando configuraciones:', error);
            throw error;
        }
    }

    // Escuchar cambios en tiempo real
    listenToSettings(callback) {
        try {
            let lastUpdate = null; // Track last update to prevent rapid firing
            
            import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js')
                .then(({ doc, onSnapshot }) => {
                    const docRef = doc(this.db, this.settingsRef, 'main');
                    
                    return onSnapshot(docRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            const currentUpdate = data.lastUpdated;
                            
                            // Only call callback if this is a new update
                            if (currentUpdate !== lastUpdate) {
                                lastUpdate = currentUpdate;
                                callback(data);
                            }
                        }
                    });
                })
                .catch(error => {
                    console.error('Error configurando listener:', error);
                });
        } catch (error) {
            console.error('Error en listener de configuraciones:', error);
        }
    }

    // Verificar si el servicio está activo (para la página principal)
    async isServiceActive() {
        try {
            const settings = await this.getSettings();
            return settings.serviceActive !== false; // Por defecto true si no existe
        } catch (error) {
            console.error('Error verificando estado del servicio:', error);
            return true; // Por defecto activo si hay error
        }
    }

    // Obtener productos ocultos (para la página principal)
    async getHiddenProducts() {
        try {
            const settings = await this.getSettings();
            return settings.hiddenProducts || [];
        } catch (error) {
            console.error('Error obteniendo productos ocultos:', error);
            return [];
        }
    }

    // Obtener overrides de precios (para la página principal)
    async getPriceOverrides() {
        try {
            const settings = await this.getSettings();
            return settings.priceOverrides || {};
        } catch (error) {
            console.error('Error obteniendo overrides de precios:', error);
            return {};
        }
    }

    // Obtener overrides de imágenes (para la página principal)
    async getImageOverrides() {
        try {
            const settings = await this.getSettings();
            return settings.imageOverrides || {};
        } catch (error) {
            console.error('Error obteniendo overrides de imágenes:', error);
            return {};
        }
    }

    // Obtener productos personalizados (para la página principal)
    async getCustomProducts() {
        try {
            const settings = await this.getSettings();
            return settings.customProducts || {};
        } catch (error) {
            console.error('Error obteniendo productos personalizados:', error);
            return {};
        }
    }

    // Obtener overrides de info (nombre/descripcion) (para la página principal)
    async getProductInfoOverrides() {
        try {
            const settings = await this.getSettings();
            return settings.productInfoOverrides || {};
        } catch (error) {
            console.error('Error obteniendo overrides de información de productos:', error);
            return {};
        }
    }

    // Obtener overrides del botón "Personalizar" (para la página principal)
    async getCustomizeButtonOverrides() {
        try {
            const settings = await this.getSettings();
            return settings.customizeButtonOverrides || {};
        } catch (error) {
            console.error('Error obteniendo overrides de botón Personalizar:', error);
            return {};
        }
    }

    // Obtener overrides del campo de "Especificaciones" por producto (para la página principal)
    async getSpecificationsOverrides() {
        try {
            const settings = await this.getSettings();
            return settings.specificationsOverrides || {};
        } catch (error) {
            console.error('Error obteniendo overrides de especificaciones:', error);
            return {};
        }
    }

    // Obtener orden de productos por categoría (para la página principal)
    async getProductOrder() {
        try {
            const settings = await this.getSettings();
            return settings.productOrder || {};
        } catch (error) {
            console.error('Error obteniendo orden de productos:', error);
            return {};
        }
    }
}

// Gestor de clientes (registro, login, dashboard de datos básicos)
class FirebaseClientManager {
    constructor() {
        this.auth = auth;
        this.db = db;
        this.clientsCollection = collection(db, 'clientes');
        this.ordersCollection = collection(db, 'orders');
    }

    normalizeEmail(value) {
        return String(value || '').trim().toLowerCase();
    }

    normalizePhoneDigits(value) {
        return String(value || '').replace(/\D/g, '');
    }

    encodeKey(value) {
        // Doc IDs no pueden contener '/', así que codificamos.
        return encodeURIComponent(String(value || '').trim());
    }

    makeError(code, message) {
        const err = new Error(message || code);
        err.code = code;
        return err;
    }

    // Registro de cliente: crea usuario de Auth y documento en "clientes/{uid}"
    async registerClient({ nombre, correo, telefono, calle, numero, colonia, password }) {
        if (!correo || !password) {
            throw new Error('Correo y contraseña son obligatorios');
        }
        const email = this.normalizeEmail(correo);
        const phoneDigits = this.normalizePhoneDigits(telefono);

        if (!phoneDigits) {
            throw this.makeError('PHONE_REQUIRED', 'El teléfono es obligatorio');
        }

        const emailKey = this.encodeKey(email);
        const phoneKey = this.encodeKey(phoneDigits);

        const uniqueEmailRef = doc(this.db, 'unique_emails', emailKey);
        const uniquePhoneRef = doc(this.db, 'unique_phones', phoneKey);

        // Pre-chequeo (no transaccional): mejora UX
        try {
            const [emailSnap, phoneSnap] = await Promise.all([
                getDoc(uniqueEmailRef),
                getDoc(uniquePhoneRef)
            ]);
            if (emailSnap.exists()) {
                throw this.makeError('EMAIL_ALREADY_REGISTERED', 'Este correo ya está registrado. Intenta iniciar sesión.');
            }
            if (phoneSnap.exists()) {
                throw this.makeError('PHONE_ALREADY_REGISTERED', 'Este teléfono ya está registrado. Intenta iniciar sesión.');
            }
        } catch (e) {
            // Si falló la lectura (p.ej. reglas), continuamos y dejamos que Auth/transaction definan el resultado.
            if (e && (e.code === 'EMAIL_ALREADY_REGISTERED' || e.code === 'PHONE_ALREADY_REGISTERED')) throw e;
        }

        const cred = await createUserWithEmailAndPassword(this.auth, email, password);
        const uid = cred.user.uid;
        const createdUser = cred.user;

        const welcomeReward = {
            type: 'WELCOME_10',
            label: '10% primera compra',
            discountPercent: 10,
            freeDelivery: false,
            redeemedAt: serverTimestamp()
        };

        const clienteDoc = {
            nombre: String(nombre || '').trim(),
            correo: email,
            telefono: String(telefono || '').trim(),
            telefonoDigits: phoneDigits,
            direccion: {
                calle: String(calle || '').trim(),
                numero: String(numero || '').trim(),
                colonia: String(colonia || '').trim()
            },
            direcciones: [],
            puntos: 0,
            // Bono automático de 10% al registrarse (se consume al usarlo en la primera compra)
            activeReward: welcomeReward,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Transacción para asegurar unicidad de correo y teléfono (evita duplicados por carrera)
        try {
            await runTransaction(this.db, async (tx) => {
                const [emailSnap, phoneSnap] = await Promise.all([
                    tx.get(uniqueEmailRef),
                    tx.get(uniquePhoneRef)
                ]);

                if (emailSnap.exists()) {
                    throw this.makeError('EMAIL_ALREADY_REGISTERED', 'Este correo ya está registrado. Intenta iniciar sesión.');
                }
                if (phoneSnap.exists()) {
                    throw this.makeError('PHONE_ALREADY_REGISTERED', 'Este teléfono ya está registrado. Intenta iniciar sesión.');
                }

                tx.set(uniqueEmailRef, {
                    uid,
                    email,
                    createdAt: serverTimestamp()
                });

                tx.set(uniquePhoneRef, {
                    uid,
                    phoneDigits,
                    createdAt: serverTimestamp()
                });

                tx.set(doc(this.clientsCollection, uid), clienteDoc);
            });
        } catch (e) {
            // Si falló por duplicado después de crear Auth, intentar limpiar el usuario recién creado
            try {
                if (createdUser) {
                    await deleteUser(createdUser);
                }
            } catch (_) {}
            throw e;
        }
        return uid;
    }

    // Login de cliente
    async login(correo, password) {
        const email = String(correo || '').trim();
        const cred = await signInWithEmailAndPassword(this.auth, email, password);
        return cred.user;
    }

    // Cerrar sesión
    async logout() {
        await signOut(this.auth);
    }

    // Enviar correo para restablecer contraseña
    async sendPasswordReset(correo) {
        const email = String(correo || '').trim().toLowerCase();
        if (!email) {
            const err = new Error('El correo es obligatorio');
            err.code = 'auth/missing-email';
            throw err;
        }
        await sendPasswordResetEmail(this.auth, email);
        return true;
    }

    onAuthChange(callback) {
        return onAuthStateChanged(this.auth, callback);
    }

    getCurrentUser() {
        return this.auth.currentUser || null;
    }

    // Datos del cliente autenticado o por UID
    async getClient(uid) {
        const id = uid || (this.auth.currentUser && this.auth.currentUser.uid);
        if (!id) return null;
        const snap = await getDoc(doc(this.clientsCollection, id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
    }

    // Guardar ubicación (lat/lng + dirección formateada) en el perfil del cliente autenticado
    async saveClientLocation({ formattedAddress, lat, lng, sourceQuery, distanceKm, deliveryPrice, durationMin }) {
        const userId = this.auth.currentUser && this.auth.currentUser.uid;
        if (!userId) {
            throw new Error('Debes iniciar sesión para guardar tu ubicación.');
        }

        const latNum = Number(lat);
        const lngNum = Number(lng);
        if (!isFinite(latNum) || !isFinite(lngNum)) {
            throw new Error('Coordenadas inválidas. Verifica la dirección nuevamente.');
        }

        const formatted = String(formattedAddress || '').trim();

        const ref = doc(this.clientsCollection, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            throw new Error('No se encontró el perfil del cliente.');
        }

        const entry = {
            id: `loc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            formatted: formatted || null,
            lat: latNum,
            lng: lngNum,
            sourceQuery: sourceQuery ? String(sourceQuery).trim() : null,
            createdAtMs: Date.now(),
            distanceKm: distanceKm != null ? Number(distanceKm) : null,
            deliveryPrice: deliveryPrice != null ? Number(deliveryPrice) : null,
            durationMin: durationMin != null ? Number(durationMin) : null
        };

        await updateDoc(ref, {
            'direccion.formatted': formatted || null,
            'direccion.lat': latNum,
            'direccion.lng': lngNum,
            'direccion.sourceQuery': sourceQuery ? String(sourceQuery).trim() : null,
            'direccion.distanceKm': distanceKm != null ? Number(distanceKm) : null,
            'direccion.deliveryPrice': deliveryPrice != null ? Number(deliveryPrice) : null,
            'direccion.durationMin': durationMin != null ? Number(durationMin) : null,
            direcciones: arrayUnion(entry),
            updatedAt: serverTimestamp()
        });

        return true;
    }

    // Agregar una dirección extra a la lista (sin cambiar la dirección principal)
    async addClientLocation({ formattedAddress, lat, lng, sourceQuery, distanceKm, deliveryPrice, durationMin }) {
        const userId = this.auth.currentUser && this.auth.currentUser.uid;
        if (!userId) {
            throw new Error('Debes iniciar sesión para agregar una dirección.');
        }

        const latNum = Number(lat);
        const lngNum = Number(lng);
        if (!isFinite(latNum) || !isFinite(lngNum)) {
            throw new Error('Coordenadas inválidas. Verifica la dirección nuevamente.');
        }

        const formatted = String(formattedAddress || '').trim();
        const ref = doc(this.clientsCollection, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            throw new Error('No se encontró el perfil del cliente.');
        }

        const entry = {
            id: `loc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            formatted: formatted || null,
            lat: latNum,
            lng: lngNum,
            sourceQuery: sourceQuery ? String(sourceQuery).trim() : null,
            createdAtMs: Date.now(),
            distanceKm: distanceKm != null ? Number(distanceKm) : null,
            deliveryPrice: deliveryPrice != null ? Number(deliveryPrice) : null,
            durationMin: durationMin != null ? Number(durationMin) : null
        };

        await updateDoc(ref, {
            direcciones: arrayUnion(entry),
            updatedAt: serverTimestamp()
        });

        return true;
    }

    // Marcar una dirección como principal (para usarla al ordenar)
    async setPrimaryClientLocation(entry) {
        const userId = this.auth.currentUser && this.auth.currentUser.uid;
        if (!userId) {
            throw new Error('Debes iniciar sesión para seleccionar una dirección.');
        }

        const formatted = entry && entry.formatted ? String(entry.formatted).trim() : '';
        const latNum = entry && entry.lat != null ? Number(entry.lat) : null;
        const lngNum = entry && entry.lng != null ? Number(entry.lng) : null;
        if (!formatted || !isFinite(latNum) || !isFinite(lngNum)) {
            throw new Error('Dirección inválida.');
        }

        const ref = doc(this.clientsCollection, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            throw new Error('No se encontró el perfil del cliente.');
        }

        await updateDoc(ref, {
            'direccion.formatted': formatted,
            'direccion.lat': latNum,
            'direccion.lng': lngNum,
            'direccion.sourceQuery': entry && entry.sourceQuery ? String(entry.sourceQuery).trim() : null,
            'direccion.distanceKm': entry && entry.distanceKm != null ? Number(entry.distanceKm) : null,
            'direccion.deliveryPrice': entry && entry.deliveryPrice != null ? Number(entry.deliveryPrice) : null,
            'direccion.durationMin': entry && entry.durationMin != null ? Number(entry.durationMin) : null,
            activeAddressId: entry && entry.id ? String(entry.id) : null,
            updatedAt: serverTimestamp()
        });

        return true;
    }

    // Eliminar una dirección de la lista
    async removeClientLocation(entry) {
        const userId = this.auth.currentUser && this.auth.currentUser.uid;
        if (!userId) {
            throw new Error('Debes iniciar sesión para eliminar una dirección.');
        }
        if (!entry || typeof entry !== 'object') {
            throw new Error('Dirección inválida.');
        }

        const ref = doc(this.clientsCollection, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            throw new Error('No se encontró el perfil del cliente.');
        }

        await updateDoc(ref, {
            direcciones: arrayRemove(entry),
            updatedAt: serverTimestamp()
        });

        return true;
    }

    async clearPrimaryClientLocation() {
        const userId = this.auth.currentUser && this.auth.currentUser.uid;
        if (!userId) {
            throw new Error('Debes iniciar sesión para actualizar tu dirección.');
        }

        const ref = doc(this.clientsCollection, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            throw new Error('No se encontró el perfil del cliente.');
        }

        await updateDoc(ref, {
            'direccion.formatted': null,
            'direccion.lat': null,
            'direccion.lng': null,
            'direccion.sourceQuery': null,
            activeAddressId: null,
            updatedAt: serverTimestamp()
        });

        return true;
    }

    // Pedidos del cliente por clienteId (y fallback por teléfono si es necesario)
    // telefonoFallback: string con el teléfono normalizado (solo dígitos)
    async getClientOrders(uid, telefonoFallback) {
        const clienteId = uid || (this.auth.currentUser && this.auth.currentUser.uid);
        if (!clienteId) return [];
        const allOrdersMap = new Map();

        // 1) Pedidos asociados explícitamente al cliente (clienteId)
        try {
            const q = query(this.ordersCollection, where('clienteId', '==', clienteId));
            const snapshot = await getDocs(q);
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const order = {
                    id: docSnap.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString()
                };
                allOrdersMap.set(order.id, order);
            });
        } catch (e) {
            console.warn('No se pudieron obtener pedidos por clienteId:', e);
        }

        // 2) Pedidos aproximados por teléfono (para incluir compras anteriores sin clienteId)
        if (telefonoFallback) {
            try {
                const q2 = query(this.ordersCollection, where('customer.phone', '==', telefonoFallback));
                const snapshot2 = await getDocs(q2);
                snapshot2.forEach((docSnap) => {
                    const data = docSnap.data();
                    const order = {
                        id: docSnap.id,
                        ...data,
                        timestamp: data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString()
                    };
                    allOrdersMap.set(order.id, order);
                });
            } catch (e) {
                console.warn('No se pudieron obtener pedidos por teléfono:', e);
            }
        }

        // Devolver combinados, ordenados por fecha (más recientes primero)
        const allOrders = Array.from(allOrdersMap.values());
        allOrders.sort((a, b) => {
            const ta = Date.parse(a.timestamp) || 0;
            const tb = Date.parse(b.timestamp) || 0;
            return tb - ta;
        });

        return allOrders;
    }

    // Versión extendida para panel admin: combina clienteId y búsqueda flexible por teléfono
    async getClientOrdersForAdmin(uid, telefono) {
        const clienteId = uid;
        if (!clienteId && !telefono) return [];

        const allOrdersMap = new Map();
        const phoneDigitsTarget = telefono ? String(telefono).replace(/\D/g, '') : null;

        // 1) Pedidos asociados explícitamente al cliente (clienteId)
        if (clienteId) {
            try {
                const q = query(this.ordersCollection, where('clienteId', '==', clienteId));
                const snapshot = await getDocs(q);
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const order = {
                        id: docSnap.id,
                        ...data,
                        timestamp: data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString()
                    };
                    allOrdersMap.set(order.id, order);
                });
            } catch (e) {
                console.warn('Admin: no se pudieron obtener pedidos por clienteId:', e);
            }
        }

        // 2) Búsqueda flexible por teléfono: recorre pedidos y filtra por dígitos
        if (phoneDigitsTarget) {
            try {
                const qAll = query(this.ordersCollection, orderBy('timestamp', 'desc'));
                const snapshotAll = await getDocs(qAll);
                snapshotAll.forEach((docSnap) => {
                    const data = docSnap.data();
                    const phoneValue = data && data.customer && data.customer.phone
                        ? String(data.customer.phone)
                        : '';
                    const phoneDigits = phoneValue.replace(/\D/g, '');
                    if (phoneDigits && phoneDigits === phoneDigitsTarget) {
                        const order = {
                            id: docSnap.id,
                            ...data,
                            timestamp: data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString()
                        };
                        allOrdersMap.set(order.id, order);
                    }
                });
            } catch (e) {
                console.warn('Admin: no se pudieron obtener pedidos por teléfono flexible:', e);
            }
        }

        const allOrders = Array.from(allOrdersMap.values());
        allOrders.sort((a, b) => {
            const ta = Date.parse(a.timestamp) || 0;
            const tb = Date.parse(b.timestamp) || 0;
            return tb - ta;
        });

        return allOrders;
    }

    // Listado completo de clientes (para panel admin)
    async getAllClients() {
        const snapshot = await getDocs(this.clientsCollection);
        const list = [];
        snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
        });
        return list;
    }

    // Sumar puntos a partir de un pedido (1 punto cada 10 pesos gastados)
    async addPointsFromOrder(orderTotal, uid) {
        try {
            const userId = uid || (this.auth.currentUser && this.auth.currentUser.uid);
            if (!userId) return 0;

            const totalNumber = Number(orderTotal || 0);
            if (!isFinite(totalNumber) || totalNumber <= 0) return 0;

            const pointsToAdd = Math.floor(totalNumber / 10);
            if (pointsToAdd <= 0) return 0;

            const ref = doc(this.clientsCollection, userId);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                // Si el cliente aún no tiene documento (caso raro), no hacemos nada
                return 0;
            }

            const data = snap.data();
            const currentPoints = Number(data.puntos || 0);

            await updateDoc(ref, {
                puntos: currentPoints + pointsToAdd,
                updatedAt: serverTimestamp()
            });

            return pointsToAdd;
        } catch (e) {
            console.warn('No se pudieron sumar puntos al cliente:', e);
            return 0;
        }
    }

    // Sumar puntos por una orden pagada UNA SOLA VEZ (idempotente)
    // - Guarda el id del pedido dentro del documento del cliente para evitar duplicados.
    async addPointsFromPaidOrderOnce(orderTotal, uid, orderId) {
        try {
            const userId = uid || (this.auth.currentUser && this.auth.currentUser.uid);
            if (!userId) return 0;
            const safeOrderId = String(orderId || '').trim();
            if (!safeOrderId) return 0;

            const totalNumber = Number(orderTotal || 0);
            if (!isFinite(totalNumber) || totalNumber <= 0) return 0;

            const pointsToAdd = Math.floor(totalNumber / 10);
            if (pointsToAdd <= 0) return 0;

            const clientRef = doc(this.clientsCollection, userId);

            const added = await runTransaction(this.db, async (tx) => {
                const snap = await tx.get(clientRef);
                if (!snap.exists()) return 0;

                const data = snap.data() || {};
                const currentPoints = Number(data.puntos || 0);
                const credited = Array.isArray(data.creditedOrders) ? data.creditedOrders : [];

                if (credited.includes(safeOrderId)) {
                    return 0; // ya se acreditó
                }

                tx.update(clientRef, {
                    puntos: currentPoints + pointsToAdd,
                    creditedOrders: arrayUnion(safeOrderId),
                    updatedAt: serverTimestamp()
                });

                return pointsToAdd;
            });

            return Number(added || 0);
        } catch (e) {
            console.warn('No se pudieron sumar puntos (idempotente):', e);
            return 0;
        }
    }

    // Restar puntos cuando se elimina un pedido (1 punto cada 10 pesos del total)
    async removePointsFromOrder(orderTotal, uid) {
        try {
            const userId = uid || (this.auth.currentUser && this.auth.currentUser.uid);
            if (!userId) return 0;

            const totalNumber = Number(orderTotal || 0);
            if (!isFinite(totalNumber) || totalNumber <= 0) return 0;

            const pointsToRemove = Math.floor(totalNumber / 10);
            if (pointsToRemove <= 0) return 0;

            const ref = doc(this.clientsCollection, userId);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                return 0;
            }

            const data = snap.data();
            const currentPoints = Number(data.puntos || 0);
            const newPoints = Math.max(0, currentPoints - pointsToRemove);

            await updateDoc(ref, {
                puntos: newPoints,
                updatedAt: serverTimestamp()
            });

            return { pointsRemoved: pointsToRemove, newPoints };
        } catch (e) {
            console.warn('No se pudieron restar puntos al cliente:', e);
            return 0;
        }
    }

    // Resetear puntos de un cliente (por ejemplo, desde panel admin)
    async resetClientPoints(uid) {
        if (!uid) throw new Error('Se requiere el ID del cliente para resetear puntos.');
        const ref = doc(this.clientsCollection, uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            throw new Error('No se encontró el perfil del cliente.');
        }
        await updateDoc(ref, {
            puntos: 0,
            activeReward: null,
            updatedAt: serverTimestamp()
        });
        return true;
    }

    // Ajustar puntos manualmente (por ejemplo, cortesía o correcciones desde panel ADMIN)
    async addManualPoints(uid, rawDelta) {
        if (!uid) throw new Error('Se requiere el ID del cliente para ajustar puntos.');

        const deltaNumber = Number(rawDelta);
        if (!Number.isFinite(deltaNumber) || deltaNumber === 0) {
            return { pointsDelta: 0, newPoints: null };
        }

        const pointsDelta = Math.trunc(deltaNumber);
        const ref = doc(this.clientsCollection, uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            throw new Error('No se encontró el perfil del cliente.');
        }

        const data = snap.data() || {};
        const currentPointsRaw = Number(data.puntos || 0);
        const currentPoints = Number.isFinite(currentPointsRaw) ? currentPointsRaw : 0;
        const newPoints = Math.max(0, currentPoints + pointsDelta);

        await updateDoc(ref, {
            puntos: newPoints,
            updatedAt: serverTimestamp()
        });

        return { pointsDelta, newPoints, previousPoints: currentPoints };
    }

    // Canjear recompensa usando puntos
    async redeemReward(type) {
        const userId = this.auth.currentUser && this.auth.currentUser.uid;
        if (!userId) {
            throw new Error('Debes iniciar sesión para canjear recompensas.');
        }

        const rewards = {
            'DESC_10': { cost: 75, discountPercent: 10, freeDelivery: false, label: '10% de descuento' },
            'DESC_25': { cost: 150, discountPercent: 25, freeDelivery: false, label: '25% de descuento' },
            'ENVIO_GRATIS': { cost: 75, discountPercent: 0, freeDelivery: true, label: 'envío gratis' }
        };

        const reward = rewards[type];
        if (!reward) {
            throw new Error('Recompensa no válida.');
        }

        const ref = doc(this.clientsCollection, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            throw new Error('No se encontró el perfil del cliente.');
        }

        const data = snap.data();
        const currentPoints = Number(data.puntos || 0);
        if (currentPoints < reward.cost) {
            const err = new Error('No tienes puntos suficientes para esta recompensa.');
            err.code = 'INSUFFICIENT_POINTS';
            throw err;
        }

        const newPoints = currentPoints - reward.cost;

        await updateDoc(ref, {
            puntos: newPoints,
            activeReward: {
                type,
                label: reward.label,
                discountPercent: reward.discountPercent,
                freeDelivery: reward.freeDelivery,
                redeemedAt: serverTimestamp()
            },
            updatedAt: serverTimestamp()
        });

        return { newPoints, reward };
    }

    // Limpiar recompensa activa (se usa al aplicar la recompensa en una compra)
    async clearActiveReward(uid) {
        try {
            const userId = uid || (this.auth.currentUser && this.auth.currentUser.uid);
            if (!userId) return false;

            const ref = doc(this.clientsCollection, userId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return false;

            await updateDoc(ref, {
                activeReward: null,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (e) {
            console.warn('No se pudo limpiar activeReward:', e);
            return false;
        }
    }
}

// Exportar instancias globales para uso desde las páginas HTML
window.firebaseOrderManager = new FirebaseOrderManager();
window.firebaseManager = new FirebaseAdminManager();
window.firebaseClientManager = new FirebaseClientManager();
window.firebaseAuth = auth;
window.firebaseDb = db;

// Función de utilidad para mostrar errores
window.showFirebaseError = function(error) {
    console.error('Firebase Error:', error);
    if (window.showNotification) {
        window.showNotification('Error de conexión. Verifica tu internet.', 'error');
    }
};

export { FirebaseOrderManager, FirebaseAdminManager, FirebaseClientManager, db, auth };
