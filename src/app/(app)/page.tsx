"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  DollarSign, TrendingUp, HandCoins, AlertTriangle, Boxes, Factory, ShoppingCart, ArrowRight, Package,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, Empty, PageHeader, Stat } from "@/components/ui";
import { PERMISSIONS, PAYMENT_METHODS, can } from "@/lib/constants";
import { fmtBs, fmtDateTime, fmtInt, fmtNum, fmtUSD, localDay, round2, totalStock } from "@/lib/format";
import type { Material, Product, ProductionOrder, Sale } from "@/lib/types";

export default function Dashboard() {
  const { user, rate } = useApp();
  const role = user!.role;
  const canSales = PERMISSIONS[role].includes("ventas");
  const canProd = PERMISSIONS[role].includes("produccion");

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return (d < first ? d : first).toISOString();
  }, []);

  const { rows: sales } = useCollection<Sale>("sales", { where: [["date", ">=", since]], orderBy: "date", desc: true }, canSales);
  const { rows: credit } = useCollection<Sale>("sales", { where: [["status", "==", "credito"]] }, canSales);
  const { rows: products } = useCollection<Product>("products");
  const { rows: materials } = useCollection<Material>("materials", undefined, canProd);
  const { rows: orders } = useCollection<ProductionOrder>("production", { orderBy: "createdAt", desc: true, limit: 20 }, canProd);

  const valid = sales.filter((s) => s.status !== "anulada" && (can.seeAllSales(role) || s.sellerId === user!.id));
  const today = localDay();
  const monthPrefix = today.slice(0, 7);
  const todaySales = valid.filter((s) => localDay(s.date) === today);
  const monthSales = valid.filter((s) => localDay(s.date).startsWith(monthPrefix));
  const sum = (arr: Sale[]) => round2(arr.reduce((a, b) => a + b.totalUSD, 0));
  const receivable = round2(credit.reduce((a, b) => a + b.balanceUSD, 0));

  const lowStock = products
    .filter((p) => p.active !== false && totalStock(p.sizes) <= p.minStock)
    .sort((a, b) => totalStock(a.sizes) - totalStock(b.sizes));
  const lowMaterials = materials.filter((m) => m.stock <= m.minStock);
  const pairs = products.reduce((a, p) => a + totalStock(p.sizes), 0);
  const invValue = products.reduce((a, p) => a + totalStock(p.sizes) * p.costUSD, 0);
  const activeOrders = orders.filter((o) => o.status === "pendiente" || o.status === "en_proceso");

  const chart = useMemo(() => {
    const days: { day: string; label: string; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ day: localDay(d), label: d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" }), total: 0 });
    }
    valid.forEach((s) => {
      const k = days.find((d) => d.day === localDay(s.date));
      if (k) k.total = round2(k.total + s.totalUSD);
    });
    return days;
  }, [valid]);

  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    monthSales.forEach((s) => s.payments.forEach((p) => (m[p.method] = (m[p.method] ?? 0) + p.amountUSD)));
    return Object.entries(m)
      .map(([k, v]) => ({ key: k, name: PAYMENT_METHODS[k as keyof typeof PAYMENT_METHODS]?.label ?? k, value: round2(v) }))
      .sort((a, b) => b.value - a.value);
  }, [monthSales]);

  const topProducts = useMemo(() => {
    const m: Record<string, { name: string; qty: number; total: number }> = {};
    monthSales.forEach((s) =>
      s.items.forEach((i) => {
        m[i.productId] ??= { name: i.name, qty: 0, total: 0 };
        m[i.productId].qty += i.qty;
        m[i.productId].total += i.subtotalUSD;
      }),
    );
    return Object.values(m).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [monthSales]);

  const hello = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${hello}, ${user!.name.split(" ")[0]} 👋`}
        subtitle={new Date().toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          PERMISSIONS[role].includes("pos") && (
            <Link href="/pos" className="btn-primary">
              <ShoppingCart className="h-4 w-4" /> Nueva venta
            </Link>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canSales ? (
          <>
            <Stat label="Ventas de hoy" value={fmtUSD(sum(todaySales))} sub={`${fmtBs(sum(todaySales) * rate.rate)} · ${todaySales.length} ventas`} icon={DollarSign} tone="green" />
            <Stat label="Ventas del mes" value={fmtUSD(sum(monthSales))} sub={`${monthSales.length} ventas`} icon={TrendingUp} tone="brand" />
            <Stat label="Por cobrar" value={fmtUSD(receivable)} sub={`${credit.length} ventas a crédito`} icon={HandCoins} tone="violet" />
          </>
        ) : (
          <>
            <Stat label="Pares en inventario" value={fmtInt(pairs)} sub={`${products.length} modelos`} icon={Boxes} tone="brand" />
            <Stat label="Órdenes activas" value={activeOrders.length} sub="En producción o pendientes" icon={Factory} tone="blue" />
            <Stat label="Materia prima baja" value={lowMaterials.length} sub="Materiales bajo el mínimo" icon={AlertTriangle} tone="amber" />
          </>
        )}
        <Stat label="Stock bajo" value={lowStock.length} sub="Modelos por reponer" icon={AlertTriangle} tone="red" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{canSales ? "Ventas últimos 14 días (USD)" : "Inventario"}</h3>
            {canSales && <Badge tone="green">Tasa BCV: Bs {fmtNum(rate.rate)}</Badge>}
          </div>
          {canSales ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: -10, right: 8 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" name="Ventas" stroke="#ea580c" strokeWidth={2.5} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Stat label="Valor del inventario (costo)" value={fmtUSD(invValue)} icon={Package} tone="green" />
              <Stat label="Materiales registrados" value={materials.length} icon={Boxes} tone="blue" />
            </div>
          )}
        </div>

        {canSales ? (
          <div className="card p-5">
            <h3 className="mb-4 font-semibold">Métodos de pago (mes)</h3>
            {byMethod.length ? (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byMethod} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={2}>
                        {byMethod.map((m) => (
                          <Cell key={m.key} fill={PAYMENT_METHODS[m.key as keyof typeof PAYMENT_METHODS]?.color ?? "#999"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {byMethod.map((m) => (
                    <li key={m.key} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_METHODS[m.key as keyof typeof PAYMENT_METHODS]?.color }} />
                        {m.name}
                      </span>
                      <span className="font-medium">{fmtUSD(m.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Empty text="Sin ventas este mes" />
            )}
          </div>
        ) : (
          <div className="card p-5">
            <h3 className="mb-4 font-semibold">Órdenes de producción activas</h3>
            {activeOrders.length ? (
              <ul className="space-y-2 text-sm">
                {activeOrders.slice(0, 6).map((o) => (
                  <li key={o.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                    <span className="truncate">#{o.number} · {o.productName}</span>
                    <Badge tone={o.status === "pendiente" ? "amber" : "blue"}>{o.totalPairs} pares</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="No hay órdenes activas" />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="font-semibold">Productos con stock bajo</h3>
            <Link href={PERMISSIONS[role].includes("inventario") ? "/inventario" : "/productos"} className="text-sm text-brand-600 hover:underline">
              Ver todo
            </Link>
          </div>
          {lowStock.length ? (
            <ul className="divide-y dark:divide-slate-800">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.sku} · {p.color}</p>
                  </div>
                  <Badge tone={totalStock(p.sizes) === 0 ? "red" : "amber"}>
                    {totalStock(p.sizes)} / mín {p.minStock}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Todo el inventario está en orden 🎉" />
          )}
        </div>

        {canSales ? (
          <div className="card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="font-semibold">Más vendidos del mes</h3>
              <Link href="/ventas" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
                Ventas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {topProducts.length ? (
              <ul className="divide-y dark:divide-slate-800">
                {topProducts.map((p, i) => (
                  <li key={p.name + i} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-medium">{p.name}</span>
                    <span className="text-slate-500">{p.qty} pares</span>
                    <span className="w-24 text-right font-semibold">{fmtUSD(p.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Aún no hay ventas este mes" />
            )}
          </div>
        ) : (
          <div className="card">
            <div className="border-b px-5 py-4">
              <h3 className="font-semibold">Materia prima bajo el mínimo</h3>
            </div>
            {lowMaterials.length ? (
              <ul className="divide-y dark:divide-slate-800">
                {lowMaterials.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <Badge tone="amber">
                      {fmtNum(m.stock)} {m.unit}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Materia prima suficiente" />
            )}
          </div>
        )}
      </div>

      {canSales && (
        <div className="card">
          <div className="border-b px-5 py-4">
            <h3 className="font-semibold">Últimas ventas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th className="text-right">Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {valid.slice(0, 6).map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">#{s.number}</td>
                    <td className="whitespace-nowrap">{fmtDateTime(s.date)}</td>
                    <td>{s.clientName}</td>
                    <td>{s.sellerName}</td>
                    <td className="text-right font-semibold">{fmtUSD(s.totalUSD)}</td>
                    <td>
                      <Badge tone={s.status === "pagada" ? "green" : "violet"}>{s.status === "pagada" ? "Pagada" : "Crédito"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!valid.length && <Empty text="Sin ventas recientes" />}
          </div>
        </div>
      )}
    </div>
  );
}
