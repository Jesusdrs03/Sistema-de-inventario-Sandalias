import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";

/**
 * Configuración web del proyecto Firebase "mr-calzados".
 * Estos valores son públicos por diseño (van en el navegador); la seguridad la dan
 * Firebase Authentication y las reglas de firestore.rules.
 * Se pueden sobrescribir con variables NEXT_PUBLIC_FIREBASE_* (por ejemplo, para pruebas).
 * Para forzar el modo demostración: NEXT_PUBLIC_DEMO_MODE=true.
 */
const DEFAULT_CONFIG: FirebaseOptions = {
  apiKey: "AIzaSyCZMLAFT9o123ukI1KyoLsRCyVwOabtQKw",
  authDomain: "mr-calzados.firebaseapp.com",
  projectId: "mr-calzados",
  storageBucket: "mr-calzados.firebasestorage.app",
  messagingSenderId: "723084576679",
  appId: "1:723084576679:web:8c3871a9c32d7278071882",
};

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULT_CONFIG.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_CONFIG.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || DEFAULT_CONFIG.appId,
};

export const firebaseEnabled =
  process.env.NEXT_PUBLIC_DEMO_MODE !== "true" && Boolean(config.apiKey && config.projectId);

export function getFirebaseApp(): FirebaseApp {
  return getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(config);
}

/** App secundaria para que el admin cree usuarios sin cerrar su propia sesión */
export function getSecondaryApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === "secondary");
  return existing ?? initializeApp(config, "secondary");
}

/* Emuladores locales (solo desarrollo): NEXT_PUBLIC_FIREBASE_EMULATOR=true */
const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true";
let firestoreInstance: Firestore | null = null;
const authInstances = new Map<string, Auth>();

export function getDb(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
    if (useEmulator) connectFirestoreEmulator(firestoreInstance, "127.0.0.1", 8080);
  }
  return firestoreInstance;
}

export function getAuthFor(app: FirebaseApp): Auth {
  let a = authInstances.get(app.name);
  if (!a) {
    a = getAuth(app);
    if (useEmulator) connectAuthEmulator(a, "http://127.0.0.1:9099", { disableWarnings: true });
    authInstances.set(app.name, a);
  }
  return a;
}
