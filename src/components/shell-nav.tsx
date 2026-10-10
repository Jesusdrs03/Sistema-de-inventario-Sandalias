import {
  LayoutDashboard, ShoppingCart, Receipt, Package, Boxes, Factory, Layers, Users, Truck, HandCoins,
  Wallet, Calculator, BarChart3, UserCog, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Module } from "@/lib/constants";

export const NAV: { module: Module; href: string; label: string; icon: LucideIcon; group: string }[] = [
  { module: "dashboard", href: "/", label: "Inicio", icon: LayoutDashboard, group: "General" },
  { module: "pos", href: "/pos", label: "Punto de venta", icon: ShoppingCart, group: "Ventas" },
  { module: "ventas", href: "/ventas", label: "Historial de ventas", icon: Receipt, group: "Ventas" },
  { module: "cobranzas", href: "/cobranzas", label: "Cuentas por cobrar", icon: HandCoins, group: "Ventas" },
  { module: "clientes", href: "/clientes", label: "Clientes", icon: Users, group: "Ventas" },
  { module: "caja", href: "/caja", label: "Cierre de caja", icon: Calculator, group: "Ventas" },
  { module: "productos", href: "/productos", label: "Productos", icon: Package, group: "Inventario" },
  { module: "inventario", href: "/inventario", label: "Inventario y kardex", icon: Boxes, group: "Inventario" },
  { module: "produccion", href: "/produccion", label: "Producción", icon: Factory, group: "Fábrica" },
  { module: "materiales", href: "/materiales", label: "Materia prima", icon: Layers, group: "Fábrica" },
  { module: "proveedores", href: "/proveedores", label: "Proveedores", icon: Truck, group: "Fábrica" },
  { module: "gastos", href: "/gastos", label: "Gastos", icon: Wallet, group: "Administración" },
  { module: "reportes", href: "/reportes", label: "Reportes", icon: BarChart3, group: "Administración" },
  { module: "usuarios", href: "/usuarios", label: "Usuarios y roles", icon: UserCog, group: "Administración" },
  { module: "configuracion", href: "/configuracion", label: "Configuración", icon: Settings, group: "Administración" },
];

export function moduleForPath(path: string): Module | undefined {
  if (path === "/") return "dashboard";
  return NAV.find((n) => n.href !== "/" && path.startsWith(n.href))?.module;
}

