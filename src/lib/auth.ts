import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import { firebaseEnabled, getAuthFor, getFirebaseApp, getSecondaryApp } from "./firebase";
import { db } from "./db";
import type { AppUser, Role } from "./types";

export interface AuthAPI {
  onChange(cb: (user: AppUser | null, error?: string) => void): () => void;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  createUser(name: string, email: string, password: string, role: Role, tutorial?: boolean): Promise<void>;
  resetPassword(email: string): Promise<void>;
  needsSetup(): Promise<boolean>;
  setupAdmin(name: string, email: string, password: string): Promise<void>;
}

const ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Correo o contraseña incorrectos",
  "auth/wrong-password": "Correo o contraseña incorrectos",
  "auth/user-not-found": "Correo o contraseña incorrectos",
  "auth/email-already-in-use": "Ese correo ya está registrado",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
  "auth/invalid-email": "Correo inválido",
  "auth/too-many-requests": "Demasiados intentos. Intenta más tarde",
  "auth/network-request-failed": "Sin conexión a internet",
};
export const authError = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? "";
  return ERRORS[code] ?? (e as Error)?.message ?? "Error desconocido";
};

/* ------------------------------ Firebase ------------------------------ */
function firebaseAuth(): AuthAPI {
  const auth = () => getAuthFor(getFirebaseApp());
  return {
    onChange(cb) {
      let unsubUser: (() => void) | null = null;
      const unsub = onAuthStateChanged(auth(), (fu) => {
        unsubUser?.();
        unsubUser = null;
        if (!fu) return cb(null);
        unsubUser = db.subscribeDoc<AppUser>("users", fu.uid, (u) => {
          if (!u) cb(null, "Tu usuario no tiene un perfil asignado. Contacta al administrador.");
          else if (!u.active) {
            signOut(auth());
            cb(null, "Tu usuario está desactivado. Contacta al administrador.");
          } else cb({ ...u, id: fu.uid });
        });
      });
      return () => {
        unsubUser?.();
        unsub();
      };
    },
    async login(email, password) {
      await signInWithEmailAndPassword(auth(), email.trim(), password);
    },
    async logout() {
      await signOut(auth());
    },
    async createUser(name, email, password, role, tutorial = true) {
      const secAuth = getAuthFor(getSecondaryApp());
      const cred = await createUserWithEmailAndPassword(secAuth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name });
      await signOut(secAuth);
      await db.set("users", cred.user.uid, {
        name, email: email.trim().toLowerCase(), role, active: true, tutorial, createdAt: new Date().toISOString(),
      });
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(auth(), email.trim());
    },
    async needsSetup() {
      const s = await db.getDoc("meta", "setup");
      return !s;
    },
    async setupAdmin(name, email, password) {
      const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
      await updateProfile(cred.user, { displayName: name });
      const uid = cred.user.uid;
      const now = new Date().toISOString();
      // Transacción: las reglas solo permiten crear el primer admin si meta/setup no existe
      await db.transaction(async (tx) => {
        const setup = await tx.get("meta", "setup");
        if (setup) throw new Error("El sistema ya fue configurado");
        tx.set("meta", "setup", { done: true, at: now, by: uid });
        tx.set("users", uid, { name, email: email.trim().toLowerCase(), role: "admin", active: true, tutorial: true, createdAt: now });
      });
    },
  };
}

/* ------------------------------ Demo ------------------------------ */
const SESSION_KEY = "sandalias_demo_session";
function demoAuth(): AuthAPI {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    onChange(cb) {
      let unsubUser: (() => void) | null = null;
      const run = () => {
        unsubUser?.();
        unsubUser = null;
        let uid: string | null = null;
        try {
          uid = window.sessionStorage.getItem(SESSION_KEY);
        } catch {}
        if (!uid) return cb(null);
        unsubUser = db.subscribeDoc<AppUser>("users", uid, (u) => {
          if (!u || !u.active) cb(null, u ? "Tu usuario está desactivado." : undefined);
          else cb(u);
        });
      };
      listeners.add(run);
      run();
      return () => {
        unsubUser?.();
        listeners.delete(run);
      };
    },
    async login(email, password) {
      const a = await db.getDoc<{ uid: string; password: string }>("_auth", email.trim().toLowerCase());
      if (!a || a.password !== password) throw { code: "auth/invalid-credential" };
      window.sessionStorage.setItem(SESSION_KEY, a.uid);
      notify();
    },
    async logout() {
      window.sessionStorage.removeItem(SESSION_KEY);
      notify();
    },
    async createUser(name, email, password, role, tutorial = true) {
      const key = email.trim().toLowerCase();
      if (password.length < 6) throw { code: "auth/weak-password" };
      if (await db.getDoc("_auth", key)) throw { code: "auth/email-already-in-use" };
      const uid = db.newId();
      await db.set("_auth", key, { uid, password });
      await db.set("users", uid, { name, email: key, role, active: true, tutorial, createdAt: new Date().toISOString() });
    },
    async resetPassword() {
      throw new Error("En modo demostración usa la contraseña: demo123");
    },
    async needsSetup() {
      return false;
    },
    async setupAdmin() {},
  };
}

export const authApi: AuthAPI = firebaseEnabled ? firebaseAuth() : demoAuth();
