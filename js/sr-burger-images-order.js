import { getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function resolveDb() {
  // 1) Si tu firebase-config ya expone db en window, lo reutilizamos
  if (window.firebaseDb) return window.firebaseDb;
  if (window.db) return window.db;
  if (window.firebaseOrderManager && window.firebaseOrderManager.db) return window.firebaseOrderManager.db;

  // 2) Si ya existe un Firebase app default, creamos db desde ahí
  if (getApps().length) return getFirestore(getApp());

  throw new Error(
    "No se encontró Firebase inicializado. Asegúrate de cargar js/firebase-config.js antes de este módulo y/o exponer window.firebaseDb."
  );
}

const SETTINGS_COLLECTION = "settings";
const DOC_ID = "burgerImages";

export async function getBurgerImagesOrder() {
  const db = resolveDb();
  const ref = doc(db, SETTINGS_COLLECTION, DOC_ID);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : null;
  const images = data && Array.isArray(data.images) ? data.images.filter(Boolean).map(String) : [];
  return images;
}

export function onBurgerImagesOrderChange(callback) {
  const db = resolveDb();
  const ref = doc(db, SETTINGS_COLLECTION, DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const images = data && Array.isArray(data.images) ? data.images.filter(Boolean).map(String) : [];
      callback(images);
    },
    (err) => {
      console.error("onBurgerImagesOrderChange error:", err);
      callback([]);
    }
  );
}

export async function setBurgerImagesOrder(images) {
  const db = resolveDb();
  const ref = doc(db, SETTINGS_COLLECTION, DOC_ID);
  const clean = (Array.isArray(images) ? images : [])
    .map(String)
    .map(s => s.trim())
    .filter(Boolean);

  await setDoc(ref, { images: clean, updatedAt: Date.now() }, { merge: true });
}

// Atajo opcional para usarlo sin imports en HTML
window.srBurgerImagesOrder = {
  get: getBurgerImagesOrder,
  onChange: onBurgerImagesOrderChange,
  set: setBurgerImagesOrder
};
