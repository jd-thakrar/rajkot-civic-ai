import admin from 'firebase-admin';
import { env } from './env.js';

let db = null;

export function initFirebase() {
  if (admin.apps.length) {
    return admin;
  }

  if (env.firebaseServiceAccountJson) {
    const serviceAccount = JSON.parse(env.firebaseServiceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || env.firebaseProjectId
    });
  } else if (env.firebaseProjectId) {
    admin.initializeApp({ projectId: env.firebaseProjectId });
  } else {
    throw new Error(
      'Firebase not configured. Set FIREBASE_PROJECT_ID (Cloud Run ADC) or FIREBASE_SERVICE_ACCOUNT_JSON (local dev).'
    );
  }

  db = admin.firestore();
  return admin;
}

export function getFirestore() {
  if (!db) initFirebase();
  return db;
}

export function getAuth() {
  if (!admin.apps.length) initFirebase();
  return admin.auth();
}
