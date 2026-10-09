/** Operaciones de negocio atómicas (ventas, inventario, producción) */
import { db, type Tx } from "./db";
import { PAYMENT_METHODS } from "./constants";
import { round2 } from "./format";
import type {
  AppUser,
  Material,
  Movement,
  Payment,
  PaymentMethod,
  Product,
  ProductionOrder,
  ProductionStatus,
  Sale,
  SaleItem,
  Settings,
} from "./types";

/* ------------------------------ Cálculos ------------------------------ */
export function toUSD(amount: number, currency: Payment["currency"], rate: number) {
  if (currency === "VES") return rate > 0 ? Math.round((amount / rate) * 10000) / 10000 : 0;
  return round2(amount);
}

export function computeTotals(
  items: Pick<SaleItem, "subtotalUSD">[],
  discountUSD: number,
  settings: Settings,
  payments: Pick<Payment, "method" | "amountUSD">[],
) {
  const subtotal = round2(items.reduce((a, b) => a + b.subtotalUSD, 0));
  const discount = round2(Math.min(Math.max(discountUSD, 0), subtotal));
  const base = round2(subtotal - discount);
  const iva = settings.ivaEnabled ? round2((base * settings.ivaPct) / 100) : 0;
  const beforeIgtf = round2(base + iva);
  const foreignPaid = payments.filter((p) => PAYMENT_METHODS[p.method].foreign).reduce((a, b) => a + b.amountUSD, 0);
  // Los pagos en divisa incluyen el IGTF: la base gravada es lo pagado / (1 + %), con tope en el total de la factura
  const pct = settings.igtfEnabled ? settings.igtfPct / 100 : 0;
  const foreignBase = Math.min(foreignPaid / (1 + pct), beforeIgtf);
  const igtf = round2(foreignBase * pct);
  const total = round2(beforeIgtf + igtf);
  const paid = round2(payments.reduce((a, b) => a + b.amountUSD, 0));
  const change = round2(Math.max(0, paid - total));
  const balance = round2(Math.max(0, total - paid));
  return { subtotal, discount, iva, igtf, total, paid, change, balance, beforeIgtf, foreignBase, pct };
}

/** Monto sugerido para cubrir el resto con un método dado (en la moneda del método) */
export function suggestAmount(t: ReturnType<typeof computeTotals>, method: PaymentMethod, rate: number) {
  if (t.balance <= 0) return 0;
  if (PAYMENT_METHODS[method].currency === "VES") return round2(t.balance * rate);
  const room = Math.max(0, t.beforeIgtf - t.foreignBase);
  return round2(t.balance + Math.min(t.balance, room) * t.pct);
}

/* ------------------------------ Helpers ------------------------------ */
async function nextNumber(tx: Tx, key: "sale" | "production") {
  const c = (await tx.get<Record<string, number>>("meta", "counters")) ?? {};
  const n = (Number(c[key]) || 0) + 1;
  return { n, commit: () => tx.set("meta", "counters", { ...stripId(c), [key]: n }) };
}

const stripId = <T extends object>(o: T) => {
  const { id: _id, ...rest } = o as T & { id?: string };
  return rest;
};

function movement(tx: Tx, m: Omit<Movement, "id" | "date"> & { date?: string }) {
  tx.set("movements", db.newId(), { ...m, date: m.date ?? new Date().toISOString() });
}

/** Registro de caja: cada pago recibido (o revertido) para el cierre diario */
function cashEntry(
  tx: Tx,
  p: Payment,
  e: { kind: "venta" | "abono" | "anulacion"; saleId: string; saleNumber: number; user: AppUser; date: string; sign?: 1 | -1 },
) {
  const sign = e.sign ?? 1;
  tx.set("cashflow", db.newId(), {
    date: e.date, kind: e.kind, saleId: e.saleId, saleNumber: e.saleNumber, method: p.method, currency: p.currency,
    amount: round2(sign * p.amount), amountUSD: Math.round(sign * p.amountUSD * 10000) / 10000, rate: p.rate,
    reference: p.reference ?? null, userId: e.user.id, userName: e.user.name,
  });
}

/* ------------------------------ Ventas ------------------------------ */
export interface NewSale {
  items: SaleItem[];
  discountUSD: number;
  payments: Payment[];
  rate: number;
  settings: Settings;
  client: { id?: string; name: string; docId?: string };
  priceType: "detal" | "mayor";
  allowCredit: boolean;
  notes?: string;
  user: AppUser;
}

export async function createSale(input: NewSale): Promise<{ id: string; number: number }> {
  if (!input.items.length) throw new Error("El carrito está vacío");
  if (!(input.rate > 0)) throw new Error("No hay tasa BCV disponible. Configúrala en Configuración.");
  const t = computeTotals(input.items, input.discountUSD, input.settings, input.payments);
  if (t.balance >= 0.01 && !input.allowCredit) throw new Error("El pago no cubre el total de la venta");
  if (t.balance >= 0.01 && !input.client.id) throw new Error("Para ventas a crédito selecciona un cliente registrado");

  const id = db.newId();
  const now = new Date().toISOString();
  return db.transaction(async (tx) => {
    // 1) Lecturas
    const counter = await nextNumber(tx, "sale");
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const products: Record<string, Product> = {};
    for (const pid of ids) {
      const p = await tx.get<Product>("products", pid);
      if (!p) throw new Error("Producto no encontrado");
      products[pid] = p;
    }
    // 2) Validaciones
    for (const it of input.items) {
      const p = products[it.productId];
      const avail = Number(p.sizes?.[it.size] ?? 0);
      if (avail < it.qty) throw new Error(`Stock insuficiente: ${p.name} talla ${it.size} (disponible ${avail})`);
      p.sizes = { ...p.sizes, [it.size]: avail - it.qty };
    }
    // 3) Escrituras
    counter.commit();
    for (const pid of ids) tx.update("products", pid, { sizes: products[pid].sizes, updatedAt: now });
    const sale: Omit<Sale, "id"> = {
      number: counter.n,
      date: now,
      items: input.items,
      subtotalUSD: t.subtotal,
      discountUSD: t.discount,
      ivaUSD: t.iva,
      igtfUSD: t.igtf,
      totalUSD: t.total,
      rate: input.rate,
      totalBs: round2(t.total * input.rate),
      payments: input.payments.map((p) => ({ ...p, date: now, userName: input.user.name })),
      paidUSD: round2(t.paid - t.change),
      changeUSD: t.change,
      changeBs: round2(t.change * input.rate),
      balanceUSD: t.balance,
      status: t.balance >= 0.01 ? "credito" : "pagada",
      clientId: input.client.id,
      clientName: input.client.name || "Cliente Contado",
      clientDoc: input.client.docId,
      sellerId: input.user.id,
      sellerName: input.user.name,
      priceType: input.priceType,
      notes: input.notes,
    };
    tx.set("sales", id, sale);
    for (const it of input.items) {
      movement(tx, {
        itemType: "producto", itemId: it.productId, itemName: it.name, size: it.size,
        qty: -it.qty, type: "venta", reference: `Venta #${counter.n}`, userName: input.user.name, date: now,
      });
    }
    for (const p of input.payments)
      cashEntry(tx, p, { kind: "venta", saleId: id, saleNumber: counter.n, user: input.user, date: now });
    return { id, number: counter.n };
  });
}

export async function cancelSale(saleId: string, reason: string, user: AppUser) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const sale = await tx.get<Sale>("sales", saleId);
    if (!sale) throw new Error("Venta no encontrada");
    if (sale.status === "anulada") throw new Error("La venta ya está anulada");
    const ids = [...new Set(sale.items.map((i) => i.productId))];
    const products: Record<string, Product | null> = {};
    for (const pid of ids) products[pid] = await tx.get<Product>("products", pid);
    for (const it of sale.items) {
      const p = products[it.productId];
      if (!p) continue;
      p.sizes = { ...p.sizes, [it.size]: Number(p.sizes?.[it.size] ?? 0) + it.qty };
    }
    for (const pid of ids) if (products[pid]) tx.update("products", pid, { sizes: products[pid]!.sizes, updatedAt: now });
    tx.update("sales", saleId, { status: "anulada", cancelReason: reason, cancelledBy: user.name, balanceUSD: 0 });
    for (const p of sale.payments)
      cashEntry(tx, p, { kind: "anulacion", saleId, saleNumber: sale.number, user, date: now, sign: -1 });
    for (const it of sale.items) {
      movement(tx, {
        itemType: "producto", itemId: it.productId, itemName: it.name, size: it.size, qty: it.qty,
        type: "anulacion", reference: `Anulación venta #${sale.number}`, note: reason, userName: user.name, date: now,
      });
    }
  });
}

export async function addSalePayment(saleId: string, payment: Payment, user: AppUser) {
  await db.transaction(async (tx) => {
    const sale = await tx.get<Sale>("sales", saleId);
    if (!sale) throw new Error("Venta no encontrada");
    if (sale.status !== "credito") throw new Error("Esta venta no tiene saldo pendiente");
    if (payment.amountUSD <= 0) throw new Error("Monto inválido");
    if (payment.amountUSD > sale.balanceUSD + 0.009) throw new Error("El abono supera el saldo pendiente");
    const balance = round2(sale.balanceUSD - payment.amountUSD);
    const now = new Date().toISOString();
    cashEntry(tx, payment, { kind: "abono", saleId, saleNumber: sale.number, user, date: now });
    tx.update("sales", saleId, {
      payments: [...sale.payments, { ...payment, date: now, userName: user.name }],
      paidUSD: round2(sale.paidUSD + payment.amountUSD),
      balanceUSD: Math.max(0, balance),
      status: balance <= 0.009 ? "pagada" : "credito",
    });
  });
}

/* ------------------------------ Inventario ------------------------------ */
export async function adjustProductStock(
  productId: string,
  changes: Record<string, number>,
  type: "entrada" | "salida" | "ajuste",
  note: string,
  user: AppUser,
) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const p = await tx.get<Product>("products", productId);
    if (!p) throw new Error("Producto no encontrado");
    const sizes = { ...p.sizes };
    const moves: { size: string; qty: number }[] = [];
    for (const [size, val] of Object.entries(changes)) {
      if (!val && type !== "ajuste") continue;
      const cur = Number(sizes[size] ?? 0);
      let next = cur;
      if (type === "entrada") next = cur + val;
      if (type === "salida") next = cur - val;
      if (type === "ajuste") next = val;
      if (next < 0) throw new Error(`La talla ${size} quedaría en negativo`);
      if (next !== cur) moves.push({ size, qty: next - cur });
      sizes[size] = next;
    }
    if (!moves.length) throw new Error("No hay cambios que registrar");
    tx.update("products", productId, { sizes, updatedAt: now });
    for (const m of moves)
      movement(tx, {
        itemType: "producto", itemId: productId, itemName: `${p.name} (${p.color})`, size: m.size, qty: m.qty,
        type, note, userName: user.name, date: now,
      });
  });
}

export async function adjustMaterialStock(
  materialId: string,
  qty: number,
  type: "entrada" | "salida" | "ajuste",
  note: string,
  user: AppUser,
  costUSD?: number,
) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const m = await tx.get<Material>("materials", materialId);
    if (!m) throw new Error("Material no encontrado");
    const cur = Number(m.stock || 0);
    const next = type === "entrada" ? cur + qty : type === "salida" ? cur - qty : qty;
    if (next < 0) throw new Error("El stock quedaría en negativo");
    const upd: Partial<Material> = { stock: round2(next), updatedAt: now };
    if (costUSD && costUSD > 0) upd.costUSD = costUSD;
    tx.update("materials", materialId, upd);
    movement(tx, {
      itemType: "material", itemId: materialId, itemName: m.name, qty: round2(next - cur), type, note,
      userName: user.name, date: now,
    });
  });
}

/* ------------------------------ Producción ------------------------------ */
export async function createProductionOrder(
  o: Omit<ProductionOrder, "id" | "number" | "createdAt" | "status" | "createdBy" | "totalPairs">,
  user: AppUser,
) {
  const id = db.newId();
  return db.transaction(async (tx) => {
    const counter = await nextNumber(tx, "production");
    counter.commit();
    const totalPairs = Object.values(o.sizes).reduce((a, b) => a + b, 0);
    tx.set("production", id, {
      ...o, number: counter.n, totalPairs, status: "pendiente", createdAt: new Date().toISOString(), createdBy: user.name,
    });
    return { id, number: counter.n };
  });
}

export async function setProductionStatus(orderId: string, status: ProductionStatus, user: AppUser) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const o = await tx.get<ProductionOrder>("production", orderId);
    if (!o) throw new Error("Orden no encontrada");
    if (o.status === "terminada" || o.status === "cancelada") throw new Error("La orden ya está cerrada");
    if (status !== "terminada") {
      tx.update("production", orderId, { status });
      return;
    }
    const p = await tx.get<Product>("products", o.productId);
    if (!p) throw new Error("Producto no encontrado");
    const mats: Record<string, Material> = {};
    for (const m of o.materials) {
      const mm = await tx.get<Material>("materials", m.materialId);
      if (!mm) throw new Error(`Material ${m.name} no encontrado`);
      if (mm.stock < m.qty) throw new Error(`Materia prima insuficiente: ${m.name} (disponible ${mm.stock} ${mm.unit})`);
      mats[m.materialId] = mm;
    }
    const sizes = { ...p.sizes };
    for (const [z, q] of Object.entries(o.sizes)) sizes[z] = Number(sizes[z] ?? 0) + q;
    tx.update("products", o.productId, { sizes, updatedAt: now });
    for (const m of o.materials) {
      tx.update("materials", m.materialId, { stock: round2(mats[m.materialId].stock - m.qty), updatedAt: now });
      movement(tx, {
        itemType: "material", itemId: m.materialId, itemName: m.name, qty: -m.qty, type: "consumo",
        reference: `Orden de producción #${o.number}`, userName: user.name, date: now,
      });
    }
    for (const [z, q] of Object.entries(o.sizes))
      if (q > 0)
        movement(tx, {
          itemType: "producto", itemId: o.productId, itemName: o.productName, size: z, qty: q, type: "produccion",
          reference: `Orden de producción #${o.number}`, userName: user.name, date: now,
        });
    tx.update("production", orderId, { status: "terminada", completedAt: now });
  });
}
