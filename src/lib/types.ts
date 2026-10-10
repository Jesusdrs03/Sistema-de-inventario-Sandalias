export type Role = "admin" | "gerente" | "vendedor" | "almacen";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: string;
}

export type Category = "Dama" | "Caballero" | "Niño" | "Niña" | "Unisex";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: Category;
  color: string;
  material: string;
  priceUSD: number;
  wholesalePriceUSD?: number;
  costUSD: number;
  minStock: number;
  /** stock por talla, ej: {"36": 10, "37": 4} */
  sizes: Record<string, number>;
  imageUrl?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  costUSD: number;
  supplierId?: string;
  supplierName?: string;
  updatedAt?: string;
}

export type MovementType =
  | "venta"
  | "entrada"
  | "salida"
  | "ajuste"
  | "produccion"
  | "consumo"
  | "anulacion";

export interface Movement {
  id: string;
  itemType: "producto" | "material";
  itemId: string;
  itemName: string;
  size?: string;
  qty: number;
  type: MovementType;
  reference?: string;
  note?: string;
  userName: string;
  date: string;
}

export type PaymentMethod =
  | "pago_movil"
  | "transferencia"
  | "efectivo_bs"
  | "efectivo_usd"
  | "punto_venta"
  | "zelle"
  | "binance";

export type Currency = "VES" | "USD" | "USDT";

export interface Payment {
  method: PaymentMethod;
  currency: Currency;
  /** monto en la moneda del método */
  amount: number;
  /** equivalente en USD a la tasa usada */
  amountUSD: number;
  rate: number;
  reference?: string;
  bank?: string;
  date?: string;
  userName?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  size: string;
  qty: number;
  priceUSD: number;
  costUSD: number;
  subtotalUSD: number;
}

export type SaleStatus = "pagada" | "credito" | "anulada";

export interface Sale {
  id: string;
  number: number;
  date: string;
  items: SaleItem[];
  subtotalUSD: number;
  discountUSD: number;
  ivaUSD: number;
  igtfUSD: number;
  totalUSD: number;
  rate: number;
  totalBs: number;
  payments: Payment[];
  paidUSD: number;
  changeUSD: number;
  changeBs: number;
  balanceUSD: number;
  status: SaleStatus;
  clientId?: string;
  clientName: string;
  clientDoc?: string;
  sellerId: string;
  sellerName: string;
  priceType: "detal" | "mayor";
  notes?: string;
  cancelReason?: string;
  cancelledBy?: string;
}

export interface Client {
  id: string;
  name: string;
  docId: string;
  phone?: string;
  email?: string;
  address?: string;
  type: "detal" | "mayorista";
  createdAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  rif: string;
  phone?: string;
  email?: string;
  contact?: string;
  supplies?: string;
  address?: string;
  createdAt?: string;
}

export type ProductionStatus = "pendiente" | "en_proceso" | "terminada" | "cancelada";

export interface ProductionOrder {
  id: string;
  number: number;
  productId: string;
  productName: string;
  sizes: Record<string, number>;
  totalPairs: number;
  materials: { materialId: string; name: string; unit: string; qty: number }[];
  status: ProductionStatus;
  responsible?: string;
  notes?: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

export interface Expense {
  id: string;
  date: string;
  concept: string;
  category: string;
  amount: number;
  currency: Currency;
  amountUSD: number;
  rate: number;
  method: PaymentMethod;
  userName: string;
}

export interface Settings {
  businessName: string;
  rif: string;
  address: string;
  phone: string;
  email: string;
  ivaEnabled: boolean;
  ivaPct: number;
  igtfEnabled: boolean;
  igtfPct: number;
  rateMode: "auto" | "manual";
  manualRate: number;
  enabledMethods: PaymentMethod[];
  pagoMovil: { bank: string; phone: string; docId: string };
  transferencia: { bank: string; account: string; holder: string; docId: string };
  zelleEmail: string;
  binanceId: string;
  receiptFooter: string;
  sizesDefault: string[];
}

export interface RateRecord {
  id: string;
  rate: number;
  source: string;
  date: string;
  fetchedAt: string;
}

export interface CashEntry {
  id: string;
  date: string;
  kind: "venta" | "abono" | "anulacion";
  saleId: string;
  saleNumber: number;
  method: PaymentMethod;
  currency: Currency;
  amount: number;
  amountUSD: number;
  rate: number;
  reference?: string | null;
  userId: string;
  userName: string;
}
