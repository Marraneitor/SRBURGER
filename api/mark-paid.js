// Vercel Serverless Function: Mark an order as paid and (optionally) credit points.
// Requires Firebase Admin credentials via env vars:
// - FIREBASE_SERVICE_ACCOUNT_JSON (preferred on Vercel)
//   or GOOGLE_APPLICATION_CREDENTIALS (advanced)
// Optional:
// - ADMIN_KEY (requires x-admin-key header)

const firebaseAdmin = require('firebase-admin');

let _firebaseAdminApp = null;

function getFirebaseAdminApp() {
  if (_firebaseAdminApp) return _firebaseAdminApp;

  const jsonEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  let credential = null;

  if (jsonEnv) {
    const parsed = JSON.parse(jsonEnv);
    credential = firebaseAdmin.credential.cert(parsed);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = firebaseAdmin.credential.applicationDefault();
  }

  if (!credential) return null;

  _firebaseAdminApp = firebaseAdmin.apps && firebaseAdmin.apps.length
    ? firebaseAdmin.app()
    : firebaseAdmin.initializeApp({ credential });

  return _firebaseAdminApp;
}

function requireAdminKey(req, res) {
  const expected = (process.env.ADMIN_KEY || '').trim();
  if (!expected) return true; // no auth configured
  const provided = String(req.headers['x-admin-key'] || '').trim();
  if (provided && provided === expected) return true;
  res.status(401).json({ ok: false, error: 'Unauthorized' });
  return false;
}

function computePointsFromOrderData(orderData) {
  const pointsEarned = Number(orderData && orderData.pointsEarned);
  if (Number.isFinite(pointsEarned) && pointsEarned >= 0) return Math.floor(pointsEarned);

  const totalCandidates = [
    orderData && orderData.total,
    orderData && orderData.totals && orderData.totals.total,
    orderData && orderData.totalAmount,
  ];
  for (const v of totalCandidates) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.floor(n / 10));
  }
  return 0;
}

module.exports = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    if (!requireAdminKey(req, res)) return;

    const body = req.body || {};
    const safeOrderId = String(body.orderId || '').trim();
    if (!safeOrderId) return res.status(400).json({ ok: false, error: 'Missing orderId' });

    const adminApp = getFirebaseAdminApp();
    if (!adminApp) {
      return res.status(500).json({
        ok: false,
        error: 'Firebase Admin no está configurado. Define FIREBASE_SERVICE_ACCOUNT_JSON (o GOOGLE_APPLICATION_CREDENTIALS).'
      });
    }

    const db = firebaseAdmin.firestore();
    const orderRef = db.collection('orders').doc(safeOrderId);
    const now = new Date();
    const paidAtIso = now.toISOString();

    const result = await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
      }

      const order = orderSnap.data() || {};
      const alreadyPaid = !!order.paid;
      const alreadyCredited = !!order.pointsCredited;

      const pointsToAdd = computePointsFromOrderData(order);
      const clienteId = String(order.clienteId || '').trim();

      tx.set(orderRef, {
        paid: true,
        paidAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (!clienteId) {
        return { paid: true, pointsAdded: 0, pointsCredited: false, reason: 'missing_clienteId' };
      }

      if (alreadyCredited) {
        return {
          paid: true,
          pointsAdded: Number(order.pointsAdded || 0) || 0,
          pointsCredited: true,
          reason: 'already_credited'
        };
      }

      const clientRef = db.collection('clientes').doc(clienteId);
      const clientSnap = await tx.get(clientRef);
      if (!clientSnap.exists) {
        return { paid: true, pointsAdded: 0, pointsCredited: false, reason: 'client_not_found' };
      }

      const client = clientSnap.data() || {};
      const creditedOrders = Array.isArray(client.creditedOrders) ? client.creditedOrders : [];
      if (creditedOrders.includes(safeOrderId)) {
        tx.set(orderRef, {
          pointsCredited: true,
          pointsCreditedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          pointsAdded: Number(order.pointsAdded || 0) || 0,
        }, { merge: true });
        return {
          paid: true,
          pointsAdded: Number(order.pointsAdded || 0) || 0,
          pointsCredited: true,
          reason: 'creditedOrders_contains'
        };
      }

      const currentPoints = Number(client.puntos || 0);
      const safeCurrentPoints = Number.isFinite(currentPoints) ? currentPoints : 0;
      const safePointsToAdd = Number.isFinite(pointsToAdd) ? pointsToAdd : 0;

      tx.set(clientRef, {
        puntos: safeCurrentPoints + safePointsToAdd,
        creditedOrders: firebaseAdmin.firestore.FieldValue.arrayUnion(safeOrderId),
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(orderRef, {
        pointsEarned: Number.isFinite(Number(order.pointsEarned)) ? order.pointsEarned : safePointsToAdd,
        pointsCredited: true,
        pointsCreditedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        pointsAdded: safePointsToAdd,
      }, { merge: true });

      return {
        paid: true,
        pointsAdded: safePointsToAdd,
        pointsCredited: true,
        reason: alreadyPaid ? 'paid_was_true' : 'ok'
      };
    });

    return res.json({ ok: true, paidAt: paidAtIso, ...result });
  } catch (e) {
    const status = (e && e.status) ? Number(e.status) : 500;
    return res.status(status).json({ ok: false, error: (e && e.message) ? e.message : 'mark-paid-failed' });
  }
};
