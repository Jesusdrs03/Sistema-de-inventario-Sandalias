import type { Currency, PaymentMethod, Role, Settings } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor / Cajero",
  almacen: "Almacén / Producción",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Acceso total: usuarios, configuración, anulaciones y reportes.",
  gerente: "Opera todo el negocio excepto usuarios y configuración.",
  vendedor: "Punto de venta, clientes, cobranzas y cierre de caja.",
  almacen: "Inventario, materia prima, producción y proveedores.",
};

export type Module =
  | "dashboard"
  | "pos"
  | "ventas"
  | "productos"
  | "inventario"
  | "produccion"
  | "materiales"
  | "clientes"
  | "proveedores"
  | "cobranzas"
  | "gastos"
  | "caja"
  | "reportes"
  | "usuarios"
  | "configuracion";

export const PERMISSIONS: Record<Role, Module[]> = {
  admin: [
    "dashboard", "pos", "ventas", "productos", "inventario", "produccion", "materiales",
    "clientes", "proveedores", "cobranzas", "gastos", "caja", "reportes", "usuarios", "configuracion",
  ],
  gerente: [
    "dashboard", "pos", "ventas", "productos", "inventario", "produccion", "materiales",
    "clientes", "proveedores", "cobranzas", "gastos", "caja", "reportes",
  ],
  vendedor: ["dashboard", "pos", "ventas", "productos", "clientes", "cobranzas", "caja"],
  almacen: ["dashboard", "productos", "inventario", "produccion", "materiales", "proveedores"],
};

/** Acciones sensibles adicionales */
export const can = {
  cancelSale: (r?: Role) => r === "admin" || r === "gerente",
  editProducts: (r?: Role) => r === "admin" || r === "gerente" || r === "almacen",
  deleteRecords: (r?: Role) => r === "admin",
  seeCosts: (r?: Role) => r === "admin" || r === "gerente" || r === "almacen",
  seeAllSales: (r?: Role) => r === "admin" || r === "gerente",
};

export const PAYMENT_METHODS: Record<
  PaymentMethod,
  { label: string; currency: Currency; needsRef: boolean; color: string; foreign: boolean }
> = {
  pago_movil: { label: "Pago Móvil", currency: "VES", needsRef: true, color: "#0ea5e9", foreign: false },
  transferencia: { label: "Transferencia", currency: "VES", needsRef: true, color: "#6366f1", foreign: false },
  punto_venta: { label: "Punto de Venta", currency: "VES", needsRef: true, color: "#8b5cf6", foreign: false },
  efectivo_bs: { label: "Efectivo Bs", currency: "VES", needsRef: false, color: "#22c55e", foreign: false },
  efectivo_usd: { label: "Efectivo Divisa ($)", currency: "USD", needsRef: false, color: "#16a34a", foreign: true },
  zelle: { label: "Zelle", currency: "USD", needsRef: true, color: "#7c3aed", foreign: true },
  binance: { label: "Binance (USDT)", currency: "USDT", needsRef: true, color: "#eab308", foreign: true },
};

export const ALL_METHODS = Object.keys(PAYMENT_METHODS) as PaymentMethod[];

export const CATEGORIES = ["Dama", "Caballero", "Niño", "Niña", "Unisex"] as const;

export const EXPENSE_CATEGORIES = [
  "Materia prima",
  "Nómina",
  "Alquiler",
  "Servicios",
  "Transporte",
  "Mantenimiento",
  "Publicidad",
  "Impuestos",
  "Otros",
];

export const VE_BANKS = [
  "0102 - Banco de Venezuela",
  "0104 - Venezolano de Crédito",
  "0105 - Mercantil",
  "0108 - Provincial (BBVA)",
  "0114 - Bancaribe",
  "0115 - Exterior",
  "0128 - Banco Caroní",
  "0134 - Banesco",
  "0137 - Sofitasa",
  "0138 - Banco Plaza",
  "0151 - BFC Banco Fondo Común",
  "0156 - 100% Banco",
  "0163 - Banco del Tesoro",
  "0166 - Banco Agrícola",
  "0168 - Bancrecer",
  "0169 - R4 Banco Microfinanciero",
  "0171 - Banco Activo",
  "0172 - Bancamiga",
  "0174 - Banplus",
  "0175 - Banco Bicentenario",
  "0177 - BANFANB",
  "0191 - BNC Nacional de Crédito",
  "Otro",
];

export const DEFAULT_SETTINGS: Settings = {
  businessName: "MR Calzados",
  rif: "J-00000000-0",
  address: "Venezuela",
  phone: "",
  ivaEnabled: false,
  ivaPct: 16,
  igtfEnabled: true,
  igtfPct: 3,
  rateMode: "auto",
  manualRate: 0,
  enabledMethods: ALL_METHODS,
  pagoMovil: { bank: "0102 - Banco de Venezuela", phone: "", docId: "" },
  transferencia: { bank: "0134 - Banesco", account: "", holder: "", docId: "" },
  zelleEmail: "",
  binanceId: "",
  receiptFooter: "¡Gracias por su compra! Cambios dentro de los 7 días con factura.",
  sizesDefault: ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"],
};
