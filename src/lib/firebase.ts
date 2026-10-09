import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

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
