/**
 * Capa de datos con dos implementaciones:
 *  - Firestore (producción) cuando las variables NEXT_PUBLIC_FIREBASE_* están configuradas.
 *  - Local (modo demostración) usando localStorage, para probar el sistema sin configurar nada.
 * La lógica de negocio usa solo esta interfaz, así funciona igual en ambos modos.
 */
import {
  collection,
  doc,
  onSnapshot,
  query,
  where as fsWhere,
  orderBy as fsOrderBy,
  limit as fsLimit,
  getDoc as fsGetDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  type QueryConstraint,
  type WhereFilterOp,
} from "firebase/firestore";
import { firebaseEnabled, getDb } from "./firebase";
import { seedDemoData } from "./seed";

export type WhereClause = [string, "==" | ">=" | "<=" | ">" | "<" | "!=", unknown];

export interface QueryOpts {
  where?: WhereClause[];
  orderBy?: string;
  desc?: boolean;
  limit?: number;
}

export interface Tx {
  get<T>(col: string, id: string): Promise<T | null>;
  set(col: string, id: string, data: object): void;
  update(col: string, id: string, data: object): void;
}

export interface DB {
  mode: "firebase" | "demo";
  subscribe<T>(col: string, cb: (rows: T[]) => void, opts?: QueryOpts, onError?: (e: Error) => void): () => void;
  subscribeDoc<T>(col: string, id: string, cb: (row: T | null) => void): () => void;
  getDoc<T>(col: string, id: string): Promise<T | null>;
  add(col: string, data: object): Promise<string>;
  set(col: string, id: string, data: object, merge?: boolean): Promise<void>;
  update(col: string, id: string, data: object): Promise<void>;
  remove(col: string, id: string): Promise<void>;
  transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>;
  newId(): string;
}

const clean = (o: object) => JSON.parse(JSON.stringify(o)); // quita undefined

/* ------------------------------ Firestore ------------------------------ */
function createFirestoreDB(): DB {
  const fs = getDb;

  const buildQuery = (col: string, opts?: QueryOpts) => {
    const c: QueryConstraint[] = [];
    opts?.where?.forEach(([f, op, v]) => c.push(fsWhere(f, op as WhereFilterOp, v)));
    if (opts?.orderBy) c.push(fsOrderBy(opts.orderBy, opts.desc ? "desc" : "asc"));
    if (opts?.limit) c.push(fsLimit(opts.limit));
    return query(collection(fs(), col), ...c);
  };

  return {
    mode: "firebase",
    subscribe(col, cb, opts, onError) {
      return onSnapshot(
        buildQuery(col, opts),
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as never)),
        (e) => {
          console.error(`[db] ${col}:`, e);
          onError?.(e);
        },
      );
    },
    subscribeDoc(col, id, cb) {
      return onSnapshot(
        doc(fs(), col, id),
        (d) => cb(d.exists() ? ({ id: d.id, ...d.data() } as never) : null),
        (e) => console.error(`[db] ${col}/${id}:`, e),
      );
    },
    async getDoc(col, id) {
      const d = await fsGetDoc(doc(fs(), col, id));
      return d.exists() ? ({ id: d.id, ...d.data() } as never) : null;
    },
    async add(col, data) {
      const ref = await addDoc(collection(fs(), col), clean(data));
      return ref.id;
    },
    async set(col, id, data, merge) {
      await setDoc(doc(fs(), col, id), clean(data), { merge: !!merge });
    },
    async update(col, id, data) {
      await updateDoc(doc(fs(), col, id), clean(data));
    },
    async remove(col, id) {
      await deleteDoc(doc(fs(), col, id));
    },
    transaction(fn) {
      return runTransaction(fs(), (t) =>
        fn({
          async get(col, id) {
            const d = await t.get(doc(fs(), col, id));
            return d.exists() ? ({ id: d.id, ...d.data() } as never) : null;
          },
          set(col, id, data) {
            t.set(doc(fs(), col, id), clean(data));
          },
          update(col, id, data) {
            t.update(doc(fs(), col, id), clean(data));
          },
        }),
      );
    },
    newId() {
      return doc(collection(fs(), "_")).id;
    },
  };
}

/* ------------------------------ Local (demo) ------------------------------ */
const STORE_KEY = "sandalias_demo_v1";
type Store = Record<string, Record<string, Record<string, unknown>>>;

function createLocalDB(): DB {
  let store: Store | null = null;
  const listeners = new Set<() => void>();

  const load = (): Store => {
    if (store) return store;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORE_KEY) : null;
      store = raw ? JSON.parse(raw) : null;
    } catch {
      store = null;
    }
    if (!store) {
      store = seedDemoData();
      persist();
    }
    return store!;
  };
  const persist = () => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* almacenamiento no disponible */
    }
  };
  const emit = () => {
    persist();
    listeners.forEach((l) => l());
  };
  const colOf = (c: string) => (load()[c] ??= {});

  const cmp = (a: unknown, op: string, b: unknown) => {
    const x = a as never;
    const y = b as never;
    switch (op) {
      case "==": return x === y;
      case "!=": return x !== y;
      case ">=": return x >= y;
      case "<=": return x <= y;
      case ">": return x > y;
      case "<": return x < y;
    }
    return true;
  };

  const runQuery = (col: string, opts?: QueryOpts) => {
    let rows = Object.entries(colOf(col)).map(([id, d]) => ({ ...d, id }) as Record<string, unknown>);
    opts?.where?.forEach(([f, op, v]) => (rows = rows.filter((r) => cmp(r[f], op, v))));
    if (opts?.orderBy) {
      const k = opts.orderBy;
      rows.sort((a, b) => {
        const r = (a[k] as never) > (b[k] as never) ? 1 : (a[k] as never) < (b[k] as never) ? -1 : 0;
        return opts.desc ? -r : r;
      });
    }
    if (opts?.limit) rows = rows.slice(0, opts.limit);
    return rows;
  };

  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const db: DB = {
    mode: "demo",
    subscribe(col, cb, opts) {
      const run = () => cb(runQuery(col, opts) as never);
      listeners.add(run);
      setTimeout(run, 0);
      return () => listeners.delete(run);
    },
    subscribeDoc(col, id, cb) {
      const run = () => {
        const d = colOf(col)[id];
        cb(d ? ({ ...d, id } as never) : null);
      };
      listeners.add(run);
      setTimeout(run, 0);
      return () => listeners.delete(run);
    },
    async getDoc(col, id) {
      const d = colOf(col)[id];
      return d ? ({ ...structuredClone(d), id } as never) : null;
    },
    async add(col, data) {
      const id = newId();
      colOf(col)[id] = clean(data);
      emit();
      return id;
    },
    async set(col, id, data, merge) {
      colOf(col)[id] = merge ? { ...(colOf(col)[id] ?? {}), ...clean(data) } : clean(data);
      emit();
    },
    async update(col, id, data) {
      if (!colOf(col)[id]) throw new Error("Documento no encontrado");
      colOf(col)[id] = { ...colOf(col)[id], ...clean(data) };
      emit();
    },
    async remove(col, id) {
      delete colOf(col)[id];
      emit();
    },
    async transaction(fn) {
      const writes: (() => void)[] = [];
      const result = await fn({
        async get(col, id) {
          const d = colOf(col)[id];
          return d ? ({ ...structuredClone(d), id } as never) : null;
        },
        set(col, id, data) {
          writes.push(() => (colOf(col)[id] = clean(data)));
        },
        update(col, id, data) {
          writes.push(() => {
            if (!colOf(col)[id]) throw new Error("Documento no encontrado");
            colOf(col)[id] = { ...colOf(col)[id], ...clean(data) };
          });
        },
      });
      writes.forEach((w) => w());
      emit();
      return result;
    },
    newId,
  };
  return db;
}

export const resetDemoData = () => {
  window.localStorage.removeItem(STORE_KEY);
  window.location.reload();
};

export const db: DB = firebaseEnabled ? createFirestoreDB() : createLocalDB();
