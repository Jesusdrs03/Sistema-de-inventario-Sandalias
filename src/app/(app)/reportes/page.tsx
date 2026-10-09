"use client";
import { useMemo, useState } from "react";
import { Download, DollarSign, TrendingUp, Wallet, Footprints, PiggyBank, Percent } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Empty, Loading, PageHeader, Stat } from "@/components/ui";
import { PAYMENT_METHODS } from "@/lib/constants";
import { downloadCSV, endOfDay, fmtBs, fmtInt, fmtNum, fmtUSD, localDay, round2, startOfDay } from "@/lib/format";
import type { Expense, Product, RateRecord, Sale } from "@/lib/types";

const presets = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 6 },
  { label: "30 días", days: 29 },
  { label: "90 días", days: 89 },
];

export default function ReportsPage() {
  const { rate } = useApp();
  const d = new Date();
  d.setDate(d.getDate() - 29);
  const [from, setFrom] = useState(localDay(d));
  const [to, setTo] = useState(localDay());
  const range = { where: [["date", ">=", startOfDay(from)], ["date", "<=", endOfDay(to)]] as [string, ">=" | "<=", string][] };
  const { rows: salesAll, loading } = useCollection<Sale>("sales", { ...range, orderBy: "date" });
  const { rows: expenses } = useCollection<Expense>("expenses", range);
  const { rows: products } = useCollection<Product>("products");
  const { rows: rates } = useCollection<RateRecord>("rates", { where: [["date", ">=", from], ["date", "<=", to]], orderBy: "date" });

  const sales = salesAll.filter((s) => s.status !== "anulada");
  const revenue = round2(sales.reduce((a, b) => a + b.totalUSD - b.ivaUSD - b.igtfUSD, 0));
  const cost = round2(sales.reduce((a, b) => a + b.items.reduce((x, i) => x + i.costUSD * i.qty, 0), 0));
  const gross = round2(revenue - cost);
  const exp = round2(expenses.reduce((a, b) => a + b.amountUSD, 0));
  const net = round2(gross - exp);
  const pairs = sales.reduce((a, b) => a + b.items.reduce((x, i) => x + i.qty, 0), 0);

  const daily = useMemo(() => {
    const m: Record<string, { day: string; ventas: number; utilidad: number }> = {};
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    for (let x = new Date(start); x <= end; x.setDate(x.getDate() + 1)) m[localDay(x)] = { day: localDay(x).slice(5), ventas: 0, utilidad: 0 };
    sales.forEach((s) => {
      const k = m[localDay(s.date)];
      if (!k) return;
      k.ventas = round2(k.ventas + s.totalUSD);
      k.utilidad = round2(k.utilidad + s.totalUSD - s.ivaUSD - s.igtfUSD - s.items.reduce((x, i) => x + i.costUSD * i.qty, 0));
    });
    return Object.values(m);
  }, [sales, from, to]);

  const group = <K extends string>(fn: (s: Sale) => { key: K; v: number }[]) => {
    const m: Record<string, number> = {};
    sales.forEach((s) => fn(s).forEach(({ key, v }) => (m[key] = (m[key] ?? 0) + v)));
    return Object.entries(m).map(([k, v]) => ({ name: k, value: round2(v) })).sort((a, b) => b.value - a.value);
  };

  const catOf = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.category])), [products]);
  const byMethod = group((s) => s.payments.map((p) => ({ key: PAYMENT_METHODS[p.method]?.label ?? p.method, v: p.amountUSD })));
  const bySeller = group((s) => [{ key: s.sellerName, v: s.totalUSD }]);
  const byCategory = group((s) => s.items.map((i) => ({ key: catOf[i.productId] ?? "Otro", v: i.subtotalUSD })));
  const bySize = group((s) => s.items.map((i) => ({ key: `T${i.size}`, v: i.qty })));

  const topProducts = useMemo(() => {
    const m: Record<string, { name: string; qty: number; total: number; cost: number }> = {};
    sales.forEach((s) =>
      s.items.forEach((i) => {
        m[i.productId] ??= { name: i.name, qty: 0, total: 0, cost: 0 };
        m[i.productId].qty += i.qty;
        m[i.productId].total += i.subtotalUSD;
        m[i.productId].cost += i.costUSD * i.qty;
      }),
    );
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [sales]);

  const setPreset = (days: number) => {
    const x = new Date();
    x.setDate(x.getDate() - days);
    setFrom(localDay(x));
    setTo(localDay());
  };

  const exportAll = () =>
    downloadCSV(`reporte_${from}_${to}.csv`, [
      ["REPORTE", `${from} a ${to}`],
      ["Ventas netas $", revenue], ["Costo de ventas $", cost], ["Utilidad bruta $", gross], ["Gastos $", exp], ["Utilidad neta $", net], ["Pares vendidos", pairs],
      [],
      ["Producto", "Pares", "Ventas $", "Costo $", "Utilidad $"],
      ...topProducts.map((p) => [p.name, p.qty, round2(p.total), round2(p.cost), round2(p.total - p.cost)]),
      [],
      ["Método de pago", "USD"], ...byMethod.map((m) => [m.name, m.value]),
      [],
      ["Vendedor", "USD"], ...bySeller.map((m) => [m.name, m.value]),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Rentabilidad, ventas y comportamiento del negocio"
        actions={<button className="btn-secondary" onClick={exportAll}><Download className="h-4 w-4" /> Exportar</button>}
      />
      <div className="card flex flex-wrap items-center gap-3 p-4">
        {presets.map((p) => (
          <button key={p.label} className="btn-secondary btn-sm" onClick={() => setPreset(p.days)}>{p.label}</button>
        ))}
        <div className="flex-1" />
        <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-slate-400">a</span>
        <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Ventas netas" value={fmtUSD(revenue)} sub={fmtBs(revenue * rate.rate)} icon={DollarSign} tone="green" />
            <Stat label="Costo de ventas" value={fmtUSD(cost)} icon={Footprints} tone="amber" />
            <Stat label="Utilidad bruta" value={fmtUSD(gross)} icon={TrendingUp} tone="blue" />
            <Stat label="Margen" value={`${revenue ? ((gross / revenue) * 100).toFixed(1) : 0}%`} icon={Percent} tone="violet" />
            <Stat label="Gastos" value={fmtUSD(exp)} icon={Wallet} tone="red" />
            <Stat label="Utilidad neta" value={fmtUSD(net)} sub={`${fmtInt(pairs)} pares vendidos`} icon={PiggyBank} tone={net >= 0 ? "green" : "red"} />
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-semibold">Ventas y utilidad por día (USD)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => fmtUSD(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="ventas" name="Ventas" fill="#f97316" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="utilidad" name="Utilidad" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Ranking title="Por método de pago" rows={byMethod} money />
            <Ranking title="Por vendedor" rows={bySeller} money />
            <Ranking title="Por categoría" rows={byCategory} money />
            <Ranking title="Tallas más vendidas (pares)" rows={bySize.slice(0, 10)} />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b px-5 py-4"><h3 className="font-semibold">Rentabilidad por producto</h3></div>
            {topProducts.length ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr><th>Producto</th><th className="text-right">Pares</th><th className="text-right">Ventas</th><th className="text-right">Costo</th><th className="text-right">Utilidad</th><th className="text-right">Margen</th></tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p) => (
                      <tr key={p.name}>
                        <td className="font-medium">{p.name}</td>
                        <td className="text-right">{p.qty}</td>
                        <td className="text-right">{fmtUSD(p.total)}</td>
                        <td className="text-right text-slate-500">{fmtUSD(p.cost)}</td>
                        <td className="text-right font-semibold text-emerald-600">{fmtUSD(p.total - p.cost)}</td>
                        <td className="text-right">{p.total ? (((p.total - p.cost) / p.total) * 100).toFixed(0) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="Sin ventas en el período" />
            )}
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-semibold">Histórico de la tasa BCV (Bs/USD)</h3>
            {rates.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rates.map((r) => ({ day: r.date.slice(5), tasa: r.rate }))} margin={{ left: -5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `Bs ${fmtNum(v)}`} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="tasa" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty text="Sin histórico de tasas en el período" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Ranking({ title, rows, money }: { title: string; rows: { name: string; value: number }[]; money?: boolean }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="card p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {rows.length ? (
        <ul className="space-y-3 text-sm">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="flex justify-between"><span>{r.name}</span><span className="font-semibold">{money ? fmtUSD(r.value) : fmtInt(r.value)}</span></div>
              <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">Sin datos</p>
      )}
    </div>
  );
}
