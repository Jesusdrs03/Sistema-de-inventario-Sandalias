/** Datos de ejemplo para el modo demostración */
import { DEFAULT_SETTINGS, PAYMENT_METHODS } from "./constants";
import type { PaymentMethod } from "./types";

type Store = Record<string, Record<string, Record<string, unknown>>>;

export const DEMO_ACCOUNTS = [
  { id: "u-admin", name: "Ana Administradora", email: "admin@demo.com", password: "demo123", role: "admin" },
  { id: "u-gerente", name: "Gabriel Gerente", email: "gerente@demo.com", password: "demo123", role: "gerente" },
  { id: "u-vendedor", name: "Valeria Vendedora", email: "vendedor@demo.com", password: "demo123", role: "vendedor" },
  { id: "u-almacen", name: "Alberto Almacén", email: "almacen@demo.com", password: "demo123", role: "almacen" },
] as const;

export const DEMO_RATE = 200;

export function seedDemoData(): Store {
  const now = new Date();
  const iso = now.toISOString();
  const s: Store = {
    users: {},
    _auth: {},
    products: {},
    materials: {},
    clients: {},
    suppliers: {},
    sales: {},
    movements: {},
    production: {},
    expenses: {},
    rates: {},
    cashflow: {},
    meta: {},
  };

  DEMO_ACCOUNTS.forEach((u) => {
    s.users[u.id] = { name: u.name, email: u.email, role: u.role, active: true, createdAt: iso };
    s._auth[u.email] = { uid: u.id, password: u.password };
  });

  const products = [
    ["Sandalia Playera Clásica", "SPC-NEG", "Dama", "Negro", "Goma EVA", 12, 6, 15],
    ["Sandalia Playera Clásica", "SPC-AZU", "Dama", "Azul", "Goma EVA", 12, 6, 15],
    ["Sandalia Trenzada Cuero", "STC-MAR", "Dama", "Marrón", "Cuero", 28, 14, 10],
    ["Sandalia Plataforma Glam", "SPG-DOR", "Dama", "Dorado", "Sintético", 32, 15, 8],
    ["Cholas Caballero Confort", "CCC-NEG", "Caballero", "Negro", "Goma", 15, 7, 15],
    ["Sandalia Caballero Cuero", "SCC-CAF", "Caballero", "Café", "Cuero", 35, 18, 8],
    ["Sandalia Deportiva Aventura", "SDA-GRI", "Unisex", "Gris", "Sintético", 25, 12, 10],
    ["Sandalia Niño Velcro", "SNV-ROJ", "Niño", "Rojo", "Goma EVA", 10, 4.5, 12],
    ["Sandalia Niña Brillos", "SNB-ROS", "Niña", "Rosado", "PVC", 11, 5, 12],
    ["Sandalia Ortopédica Relax", "SOR-BEI", "Unisex", "Beige", "Corcho", 30, 14, 6],
  ] as const;

  const sizeSets: Record<string, string[]> = {
    Dama: ["35", "36", "37", "38", "39", "40"],
    Caballero: ["39", "40", "41", "42", "43", "44"],
    Unisex: ["36", "37", "38", "39", "40", "41", "42", "43"],
    Niño: ["24", "26", "28", "30", "32", "34"],
    Niña: ["24", "26", "28", "30", "32", "34"],
  };

  let seedN = 7;
  const rnd = () => {
    seedN = (seedN * 9301 + 49297) % 233280;
    return seedN / 233280;
  };

  const prodIds: string[] = [];
  products.forEach(([name, sku, cat, color, material, price, cost, min], i) => {
    const id = `p${i + 1}`;
    prodIds.push(id);
    const sizes: Record<string, number> = {};
    const scarce = i === 3 || i === 9; // algunos modelos con poco stock para la demo
    sizeSets[cat].forEach((z) => (sizes[z] = scarce ? Math.floor(rnd() * 2) : Math.floor(rnd() * 14) + 1));
    s.products[id] = {
      name, sku, category: cat, color, material,
      priceUSD: price, wholesalePriceUSD: Math.round(price * 0.8 * 100) / 100, costUSD: cost,
      minStock: min, sizes, active: true, createdAt: iso, updatedAt: iso,
    };
  });

  const suppliers = [
    ["Suelas del Centro C.A.", "J-30123456-1", "0414-1234567", "suelas@centro.com", "Pedro Pérez", "Suelas EVA y goma"],
    ["Cueros Lara S.A.", "J-29876543-2", "0424-7654321", "ventas@cueroslara.com", "María Gómez", "Cuero y correas"],
    ["Insumos Calzado 2000", "J-40111222-3", "0412-5556677", "", "José Ruiz", "Pegamento, hebillas, hilos"],
  ];
  suppliers.forEach(([name, rif, phone, email, contact, supplies], i) => {
    s.suppliers[`s${i + 1}`] = { name, rif, phone, email, contact, supplies, createdAt: iso };
  });

  const materials = [
    ["Suela EVA (par)", "par", 120, 40, 1.8, "s1"],
    ["Suela de goma (par)", "par", 60, 30, 2.5, "s1"],
    ["Cuero natural", "m²", 18, 10, 14, "s2"],
    ["Correa sintética", "metro", 25, 50, 0.6, "s2"],
    ["Pegamento de contacto", "litro", 9, 5, 6.5, "s3"],
    ["Hebillas metálicas", "unidad", 400, 200, 0.12, "s3"],
    ["Hilo nylon", "cono", 14, 6, 3, "s3"],
    ["Plantilla acolchada (par)", "par", 80, 40, 0.9, "s1"],
  ] as const;
  materials.forEach(([name, unit, stock, min, cost, sup], i) => {
    s.materials[`m${i + 1}`] = {
      name, unit, stock, minStock: min, costUSD: cost, supplierId: sup,
      supplierName: (s.suppliers[sup] as { name: string }).name, updatedAt: iso,
    };
  });

  const clients = [
    ["Cliente Contado", "V-00000000", "", "detal"],
    ["María Fernández", "V-15234567", "0414-2223344", "detal"],
    ["Carlos Rodríguez", "V-18765432", "0424-9988776", "detal"],
    ["Zapatería El Paso C.A.", "J-41234567-8", "0251-2345678", "mayorista"],
    ["Boutique Playa Azul", "J-50987654-1", "0295-2611122", "mayorista"],
  ];
  clients.forEach(([name, docId, phone, type], i) => {
    s.clients[`c${i + 1}`] = { name, docId, phone, type, createdAt: iso };
  });

  // Historial de tasas y ventas de los últimos 21 días
  const methods = Object.keys(PAYMENT_METHODS) as PaymentMethod[];
  let saleN = 0;
  for (let d = 20; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const rate = Math.round((DEMO_RATE - d * 0.35) * 100) / 100;
    const dayKey = day.toISOString().slice(0, 10);
    s.rates[dayKey] = { rate, source: "Demo", date: dayKey, fetchedAt: day.toISOString() };
    const count = 2 + Math.floor(rnd() * 5);
    for (let k = 0; k < count; k++) {
      saleN++;
      const when = new Date(day);
      when.setHours(9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60));
      if (when > now) when.setTime(now.getTime() - (k + 1) * 60000);
      const nItems = 1 + Math.floor(rnd() * 3);
      const items = [];
      for (let j = 0; j < nItems; j++) {
        const pid = prodIds[Math.floor(rnd() * prodIds.length)];
        const p = s.products[pid] as { name: string; color: string; sku: string; priceUSD: number; costUSD: number; sizes: Record<string, number> };
        const sizes = Object.keys(p.sizes);
        const qty = 1 + Math.floor(rnd() * 2);
        items.push({
          productId: pid, name: `${p.name} (${p.color})`, sku: p.sku, size: sizes[Math.floor(rnd() * sizes.length)],
          qty, priceUSD: p.priceUSD, costUSD: p.costUSD, subtotalUSD: qty * p.priceUSD,
        });
      }
      const total = items.reduce((a, b) => a + b.subtotalUSD, 0);
      const method = methods[Math.floor(rnd() * methods.length)];
      const meta = PAYMENT_METHODS[method];
      const credit = rnd() < 0.06;
      const paid = credit ? Math.round(total * 0.5 * 100) / 100 : total;
      const amount = meta.currency === "VES" ? Math.round(paid * rate * 100) / 100 : paid;
      const seller = rnd() > 0.5 ? DEMO_ACCOUNTS[2] : DEMO_ACCOUNTS[1];
      const client = credit ? clients[3] : clients[Math.floor(rnd() * 3)];
      s.cashflow[`cf${saleN}`] = {
        date: when.toISOString(), kind: "venta", saleId: `v${saleN}`, saleNumber: saleN, method, currency: meta.currency,
        amount, amountUSD: paid, rate, reference: null, userId: seller.id, userName: seller.name,
      };
      s.sales[`v${saleN}`] = {
        number: saleN, date: when.toISOString(), items,
        subtotalUSD: total, discountUSD: 0, ivaUSD: 0, igtfUSD: 0, totalUSD: total, rate,
        totalBs: Math.round(total * rate * 100) / 100,
        payments: [{
          method, currency: meta.currency, amount, amountUSD: paid, rate,
          reference: meta.needsRef ? `${Math.floor(rnd() * 900000) + 100000}` : "",
          date: when.toISOString(), userName: seller.name,
        }],
        paidUSD: paid, changeUSD: 0, changeBs: 0, balanceUSD: Math.round((total - paid) * 100) / 100,
        status: credit ? "credito" : "pagada",
        clientId: `c${clients.indexOf(client) + 1}`, clientName: client[0], clientDoc: client[1],
        sellerId: seller.id, sellerName: seller.name, priceType: "detal",
      };
    }
  }

  s.production.o1 = {
    number: 1, productId: "p1", productName: "Sandalia Playera Clásica (Negro)",
    sizes: { "36": 12, "37": 12, "38": 12 }, totalPairs: 36,
    materials: [
      { materialId: "m1", name: "Suela EVA (par)", unit: "par", qty: 36 },
      { materialId: "m4", name: "Correa sintética", unit: "metro", qty: 18 },
    ],
    status: "en_proceso", responsible: "Taller 1", createdAt: iso, createdBy: "Alberto Almacén",
  };

  s.expenses.e1 = {
    date: iso, concept: "Pago de electricidad", category: "Servicios", amount: 2400,
    currency: "VES", amountUSD: 12, rate: DEMO_RATE, method: "transferencia", userName: "Ana Administradora",
  };

  s.meta.settings = { ...DEFAULT_SETTINGS } as unknown as Record<string, unknown>;
  s.meta.counters = { sale: saleN, production: 1 };
  s.meta.setup = { done: true, at: iso };
  return s;
}
