"use client";
import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Search, Download, Boxes, DollarSign, AlertTriangle, PackageX } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, Empty, Field, Loading, Modal, PageHeader, Spinner, Stat, Tabs, cx } from "@/components/ui";
import { can } from "@/lib/constants";
import { downloadCSV, endOfDay, fmtDateTime, fmtInt, fmtUSD, localDay, sortSizes, startOfDay, totalStock } from "@/lib/format";
import { adjustProductStock } from "@/lib/services";
import type { Movement, Product } from "@/lib/types";

const TYPE_LABEL: Record<string, { label: string; tone: "green" | "red" | "blue" | "amber" | "violet" | "slate" }> = {
  venta: { label: "Venta", tone: "blue" },
  entrada: { label: "Entrada", tone: "green" },
  salida: { label: "Salida", tone: "red" },
  ajuste: { label: "Ajuste", tone: "amber" },
  produccion: { label: "Producción", tone: "violet" },
  consumo: { label: "Consumo", tone: "red" },
  anulacion: { label: "Anulación", tone: "slate" },
};

export default function InventoryPage() {
  const { user } = useApp();
  const [tab, setTab] = useState<"stock" | "kardex">("stock");
  const { rows: products, loading } = useCollection<Product>("products", { orderBy: "name" });
  const [q, setQ] = useState("");
  const [adj, setAdj] = useState<{ p: Product; type: "entrada" | "salida" | "ajuste" } | null>(null);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return products.filter((p) => !s || `${p.name} ${p.sku} ${p.color}`.toLowerCase().includes(s));
  }, [products, q]);

  const allSizes = useMemo(() => sortSizes([...new Set(products.flatMap((p) => Object.keys(p.sizes)))]), [products]);
  const pairs = products.reduce((a, p) => a + totalStock(p.sizes), 0);
  const value = products.reduce((a, p) => a + totalStock(p.sizes) * p.costUSD, 0);
  const saleValue = products.reduce((a, p) => a + totalStock(p.sizes) * p.priceUSD, 0);
  const out = products.filter((p) => totalStock(p.sizes) === 0).length;
  const low = products.filter((p) => totalStock(p.sizes) > 0 && totalStock(p.sizes) <= p.minStock).length;

  return (
    <div>
      <PageHeader title="Inventario" subtitle="Existencias por talla, entradas, salidas y kardex" actions={<Tabs value={tab} onChange={setTab} tabs={[{ value: "stock", label: "Existencias" }, { value: "kardex", label: "Kardex / movimientos" }]} />} />

      {tab === "stock" ? (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pares en inventario" value={fmtInt(pairs)} icon={Boxes} tone="brand" />
            {can.seeCosts(user?.role) ? (
              <Stat label="Valor al costo" value={fmtUSD(value)} sub={`Valor de venta ${fmtUSD(saleValue)}`} icon={DollarSign} tone="green" />
            ) : (
              <Stat label="Valor de venta" value={fmtUSD(saleValue)} icon={DollarSign} tone="green" />
            )}
            <Stat label="Stock bajo" value={low} icon={AlertTriangle} tone="amber" />
            <Stat label="Agotados" value={out} icon={PackageX} tone="red" />
          </div>
          <div className="card mb-4 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="card overflow-hidden">
            {loading ? (
              <Loading />
            ) : list.length ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-slate-50 dark:bg-slate-800">Producto</th>
                      {allSizes.map((z) => (
                        <th key={z} className="text-center">{z}</th>
                      ))}
                      <th className="text-center">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => {
                      const st = totalStock(p.sizes);
                      return (
                        <tr key={p.id}>
                          <td className="sticky left-0 bg-white dark:bg-slate-900">
                            <p className="whitespace-nowrap font-medium">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.sku} · {p.color}</p>
                          </td>
                          {allSizes.map((z) => (
                            <td key={z} className={cx("text-center tabular-nums", p.sizes[z] === undefined ? "text-slate-300 dark:text-slate-700" : p.sizes[z] === 0 ? "font-semibold text-red-500" : "")}>
                              {p.sizes[z] ?? "·"}
                            </td>
                          ))}
                          <td className="text-center">
                            <Badge tone={st === 0 ? "red" : st <= p.minStock ? "amber" : "green"}>{st}</Badge>
                          </td>
                          <td>
                            <div className="flex justify-end gap-1">
                              <button className="btn-icon btn-ghost text-emerald-600" title="Entrada" onClick={() => setAdj({ p, type: "entrada" })} aria-label="Entrada">
                                <ArrowDownCircle className="h-4 w-4" />
                              </button>
                              <button className="btn-icon btn-ghost text-red-500" title="Salida" onClick={() => setAdj({ p, type: "salida" })} aria-label="Salida">
                                <ArrowUpCircle className="h-4 w-4" />
                              </button>
                              <button className="btn-icon btn-ghost text-amber-600" title="Ajuste (conteo físico)" onClick={() => setAdj({ p, type: "ajuste" })} aria-label="Ajuste">
                                <SlidersHorizontal className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
          </div>
        </>
      ) : (
        <Kardex products={products} />
      )}
      {adj && <AdjustModal product={adj.p} type={adj.type} onClose={() => setAdj(null)} />}
    </div>
  );
}

function Kardex({ products }: { products: Product[] }) {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const [from, setFrom] = useState(localDay(d));
  const [to, setTo] = useState(localDay());
  const [item, setItem] = useState("todos");
  const [type, setType] = useState("todos");
  const { rows, loading } = useCollection<Movement>("movements", {
    where: [["date", ">=", startOfDay(from)], ["date", "<=", endOfDay(to)]],
    orderBy: "date",
    desc: true,
  });
  const list = rows.filter((m) => (item === "todos" || m.itemId === item) && (type === "todos" || m.type === type));

  return (
    <>
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="input lg:col-span-2" value={item} onChange={(e) => setItem(e.target.value)}>
          <option value="todos">Todos los productos y materiales</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.color})</option>
          ))}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="todos">Todos los tipos</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
      <div className="mb-3 flex justify-end">
        <button
          className="btn-secondary btn-sm"
          onClick={() =>
            downloadCSV(`kardex_${from}_${to}.csv`, [
              ["Fecha", "Tipo", "Artículo", "Talla", "Cantidad", "Referencia", "Nota", "Usuario"],
              ...list.map((m) => [fmtDateTime(m.date), TYPE_LABEL[m.type]?.label ?? m.type, m.itemName, m.size ?? "", m.qty, m.reference ?? "", m.note ?? "", m.userName]),
            ])
          }
        >
          <Download className="h-3.5 w-3.5" /> Exportar
        </button>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : list.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Artículo</th>
                  <th className="text-center">Talla</th>
                  <th className="text-right">Cantidad</th>
                  <th>Referencia / nota</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">{fmtDateTime(m.date)}</td>
                    <td><Badge tone={TYPE_LABEL[m.type]?.tone}>{TYPE_LABEL[m.type]?.label ?? m.type}</Badge></td>
                    <td>
                      {m.itemName}
                      {m.itemType === "material" && <span className="ml-1 text-xs text-slate-400">(materia prima)</span>}
                    </td>
                    <td className="text-center">{m.size ?? "—"}</td>
                    <td className={cx("text-right font-semibold tabular-nums", m.qty > 0 ? "text-emerald-600" : "text-red-500")}>
                      {m.qty > 0 ? "+" : ""}
                      {m.qty}
                    </td>
                    <td className="text-xs text-slate-500">{[m.reference, m.note].filter(Boolean).join(" · ")}</td>
                    <td className="whitespace-nowrap text-xs">{m.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Sin movimientos en el período" />
        )}
      </div>
    </>
  );
}

function AdjustModal({ product, type, onClose }: { product: Product; type: "entrada" | "salida" | "ajuste"; onClose: () => void }) {
  const { user } = useApp();
  const toast = useToast();
  const sizes = sortSizes(Object.keys(product.sizes));
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(sizes.map((z) => [z, type === "ajuste" ? String(product.sizes[z]) : ""])),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const titles = { entrada: "Entrada de mercancía", salida: "Salida de mercancía", ajuste: "Ajuste por conteo físico" };

  const save = async () => {
    setBusy(true);
    try {
      const changes = Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, Math.max(0, parseInt(v) || 0)]));
      await adjustProductStock(product.id, changes, type, note.trim(), user!);
      toast("Inventario actualizado");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={titles[type]}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-white" />} Registrar
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm font-medium">{product.name} · {product.color}</p>
      <p className="mb-3 text-xs text-slate-500">
        {type === "ajuste" ? "Escribe la cantidad REAL contada por talla." : `Cantidad a ${type === "entrada" ? "sumar" : "restar"} por talla.`}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {sizes.map((z) => (
          <div key={z} className="rounded-xl border p-2 text-center dark:border-slate-700">
            <p className="text-xs font-semibold">Talla {z}</p>
            <p className="text-[11px] text-slate-500">Actual: {product.sizes[z]}</p>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg bg-slate-50 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-brand-200 dark:bg-slate-800"
              value={vals[z]}
              onChange={(e) => setVals({ ...vals, [z]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Field label="Motivo / nota" className="mt-4">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === "salida" ? "Ej: muestra, defecto, traslado" : "Ej: compra, devolución, conteo"} />
      </Field>
    </Modal>
  );
}
