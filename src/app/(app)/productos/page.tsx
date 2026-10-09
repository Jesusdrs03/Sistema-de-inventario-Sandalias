"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Package, Download, X } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, ConfirmModal, Empty, Field, Loading, Modal, PageHeader, Spinner } from "@/components/ui";
import { CATEGORIES, can } from "@/lib/constants";
import { downloadCSV, fmtBs, fmtUSD, parseNum, sortSizes, totalStock } from "@/lib/format";
import { db } from "@/lib/db";
import type { Category, Product } from "@/lib/types";

export default function ProductsPage() {
  const { user, rate } = useApp();
  const toast = useToast();
  const { rows, loading } = useCollection<Product>("products", { orderBy: "name" });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todas");
  const [stockF, setStockF] = useState("todos");
  const [edit, setEdit] = useState<Product | null | undefined>(undefined);
  const [del, setDel] = useState<Product | null>(null);
  const editable = can.editProducts(user?.role);
  const costs = can.seeCosts(user?.role);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((p) => {
      const st = totalStock(p.sizes);
      return (
        (cat === "Todas" || p.category === cat) &&
        (stockF === "todos" || (stockF === "bajo" && st <= p.minStock && st > 0) || (stockF === "agotado" && st === 0) || (stockF === "inactivos" && p.active === false)) &&
        (!s || `${p.name} ${p.sku} ${p.color} ${p.material}`.toLowerCase().includes(s))
      );
    });
  }, [rows, q, cat, stockF]);

  const exportCSV = () =>
    downloadCSV("productos.csv", [
      ["Código", "Modelo", "Categoría", "Color", "Material", "Precio detal $", "Precio mayor $", ...(costs ? ["Costo $"] : []), "Stock", "Mínimo", "Tallas"],
      ...list.map((p) => [
        p.sku, p.name, p.category, p.color, p.material, p.priceUSD, p.wholesalePriceUSD ?? "", ...(costs ? [p.costUSD] : []),
        totalStock(p.sizes), p.minStock, sortSizes(Object.keys(p.sizes)).map((z) => `${z}:${p.sizes[z]}`).join(" "),
      ]),
    ]);

  const remove = async () => {
    if (!del) return;
    try {
      await db.remove("products", del.id);
      toast("Producto eliminado");
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setDel(null);
  };

  return (
    <div>
      <PageHeader
        title="Productos"
        subtitle={`${rows.length} modelos registrados`}
        actions={
          <>
            <button className="btn-secondary" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Exportar
            </button>
            {editable && (
              <button className="btn-primary" onClick={() => setEdit(null)}>
                <Plus className="h-4 w-4" /> Nuevo producto
              </button>
            )}
          </>
        }
      />
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option>Todas</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" value={stockF} onChange={(e) => setStockF(e.target.value)}>
          <option value="todos">Todo el stock</option>
          <option value="bajo">Stock bajo</option>
          <option value="agotado">Agotados</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : list.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-right">Precio</th>
                  {costs && <th className="text-right">Costo / Margen</th>}
                  <th>Tallas (stock)</th>
                  <th className="text-center">Total</th>
                  {editable && <th></th>}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const st = totalStock(p.sizes);
                  const margin = p.priceUSD ? ((p.priceUSD - p.costUSD) / p.priceUSD) * 100 : 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 dark:bg-brand-900/20">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-brand-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {p.name} {p.active === false && <Badge>Inactivo</Badge>}
                            </p>
                            <p className="text-xs text-slate-500">{p.sku} · {p.color} · {p.material}</p>
                          </div>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td className="whitespace-nowrap text-right">
                        <p className="font-semibold">{fmtUSD(p.priceUSD)}</p>
                        <p className="text-xs text-slate-500">{fmtBs(p.priceUSD * rate.rate)}</p>
                        {p.wholesalePriceUSD ? <p className="text-xs text-slate-500">Mayor {fmtUSD(p.wholesalePriceUSD)}</p> : null}
                      </td>
                      {costs && (
                        <td className="whitespace-nowrap text-right">
                          <p>{fmtUSD(p.costUSD)}</p>
                          <p className={margin >= 30 ? "text-xs text-emerald-600" : "text-xs text-amber-600"}>{margin.toFixed(0)}%</p>
                        </td>
                      )}
                      <td>
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {sortSizes(Object.keys(p.sizes)).map((z) => (
                            <span
                              key={z}
                              className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                                p.sizes[z] > 0 ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-red-50 text-red-500 dark:bg-red-900/30"
                              }`}
                            >
                              {z}: {p.sizes[z]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-center">
                        <Badge tone={st === 0 ? "red" : st <= p.minStock ? "amber" : "green"}>{st}</Badge>
                      </td>
                      {editable && (
                        <td>
                          <div className="flex justify-end gap-1">
                            <button className="btn-icon btn-ghost" onClick={() => setEdit(p)} aria-label="Editar">
                              <Pencil className="h-4 w-4" />
                            </button>
                            {can.deleteRecords(user?.role) && (
                              <button className="btn-icon btn-ghost text-red-500" onClick={() => setDel(p)} aria-label="Eliminar">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No hay productos" icon={Package} />
        )}
      </div>

      {edit !== undefined && <ProductForm product={edit} onClose={() => setEdit(undefined)} />}
      <ConfirmModal
        open={!!del}
        title="Eliminar producto"
        message={`¿Eliminar "${del?.name}"? Si tiene ventas registradas, mejor desactívalo.`}
        confirmText="Eliminar"
        danger
        onConfirm={remove}
        onClose={() => setDel(null)}
      />
    </div>
  );
}

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { settings, rate, user } = useApp();
  const toast = useToast();
  const isNew = !product;
  const [f, setF] = useState({
    name: "", sku: "", category: "Dama" as Category, color: "", material: "",
    priceUSD: "", wholesalePriceUSD: "", costUSD: "", minStock: "10", imageUrl: "", active: true,
  });
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [newSize, setNewSize] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (product) {
      setF({
        name: product.name, sku: product.sku, category: product.category, color: product.color, material: product.material,
        priceUSD: String(product.priceUSD), wholesalePriceUSD: String(product.wholesalePriceUSD ?? ""), costUSD: String(product.costUSD),
        minStock: String(product.minStock), imageUrl: product.imageUrl ?? "", active: product.active !== false,
      });
      setSizes(Object.fromEntries(Object.entries(product.sizes).map(([k, v]) => [k, String(v)])));
    } else {
      setSizes(Object.fromEntries(settings.sizesDefault.map((z) => [z, "0"])));
    }
  }, [product, settings.sizesDefault]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const data = {
        name: f.name.trim(), sku: f.sku.trim().toUpperCase(), category: f.category, color: f.color.trim(), material: f.material.trim(),
        priceUSD: parseNum(f.priceUSD), wholesalePriceUSD: parseNum(f.wholesalePriceUSD) || undefined, costUSD: parseNum(f.costUSD),
        minStock: parseInt(f.minStock) || 0, imageUrl: f.imageUrl.trim() || undefined, active: f.active, updatedAt: now,
      };
      if (!data.priceUSD) throw new Error("Indica el precio de venta");
      if (isNew) {
        const st = Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, Math.max(0, parseInt(v) || 0)]));
        const id = await db.add("products", { ...data, sizes: st, createdAt: now });
        const total = Object.values(st).reduce((a, b) => a + b, 0);
        if (total > 0) {
          for (const [z, q] of Object.entries(st))
            if (q > 0)
              await db.add("movements", {
                itemType: "producto", itemId: id, itemName: `${data.name} (${data.color})`, size: z, qty: q,
                type: "entrada", note: "Inventario inicial", userName: user!.name, date: now,
              });
        }
      } else {
        // Las tallas nuevas se agregan en 0; el stock se modifica desde Inventario
        // Se lee el stock actual dentro de la transacción para no pisar ventas simultáneas
        await db.transaction(async (tx) => {
          const cur = await tx.get<Product>("products", product!.id);
          if (!cur) throw new Error("Producto no encontrado");
          const st = Object.fromEntries(Object.keys(sizes).map((z) => [z, Number(cur.sizes[z] ?? 0)]));
          Object.entries(cur.sizes).forEach(([z, q]) => q > 0 && (st[z] = q));
          tx.update("products", product!.id, { ...data, sizes: st });
        });
      }
      toast(isNew ? "Producto creado" : "Producto actualizado");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const margin = parseNum(f.priceUSD) ? ((parseNum(f.priceUSD) - parseNum(f.costUSD)) / parseNum(f.priceUSD)) * 100 : 0;

  return (
    <Modal open onClose={onClose} title={isNew ? "Nuevo producto" : "Editar producto"} size="lg">
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Modelo / nombre *" className="sm:col-span-2">
            <input className="input" value={f.name} onChange={set("name")} required autoFocus />
          </Field>
          <Field label="Código / SKU *">
            <input className="input" value={f.sku} onChange={set("sku")} required />
          </Field>
          <Field label="Categoría">
            <select className="input" value={f.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Color *">
            <input className="input" value={f.color} onChange={set("color")} required />
          </Field>
          <Field label="Material">
            <input className="input" value={f.material} onChange={set("material")} placeholder="Cuero, EVA, goma…" />
          </Field>
          <Field label="Precio detal ($) *">
            <input className="input" inputMode="decimal" value={f.priceUSD} onChange={set("priceUSD")} required />
            <span className="text-[11px] text-slate-500">{fmtBs(parseNum(f.priceUSD) * rate.rate)}</span>
          </Field>
          <Field label="Precio mayor ($)">
            <input className="input" inputMode="decimal" value={f.wholesalePriceUSD} onChange={set("wholesalePriceUSD")} />
          </Field>
          <Field label="Costo de fabricación ($)">
            <input className="input" inputMode="decimal" value={f.costUSD} onChange={set("costUSD")} />
            <span className="text-[11px] text-slate-500">Margen: {margin.toFixed(1)}%</span>
          </Field>
          <Field label="Stock mínimo (alerta)">
            <input className="input" type="number" min={0} value={f.minStock} onChange={set("minStock")} />
          </Field>
          <Field label="URL de imagen (opcional)" className="sm:col-span-2">
            <input className="input" value={f.imageUrl} onChange={set("imageUrl")} placeholder="https://…" />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label mb-0">{isNew ? "Tallas y stock inicial" : "Tallas (el stock se ajusta en Inventario)"}</p>
            <div className="flex gap-2">
              <input className="input w-24 py-1" placeholder="Talla" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  if (newSize.trim()) setSizes({ ...sizes, [newSize.trim()]: sizes[newSize.trim()] ?? "0" });
                  setNewSize("");
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {sortSizes(Object.keys(sizes)).map((z) => (
              <div key={z} className="relative rounded-xl border p-2 text-center dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500">T {z}</p>
                {isNew ? (
                  <input
                    className="mt-1 w-full rounded-lg bg-slate-50 py-1 text-center text-sm outline-none dark:bg-slate-800"
                    type="number"
                    min={0}
                    value={sizes[z]}
                    onChange={(e) => setSizes({ ...sizes, [z]: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-sm font-semibold">{product!.sizes[z] ?? 0}</p>
                )}
                {(isNew || !product!.sizes[z]) && (
                  <button
                    type="button"
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-200 p-0.5 text-slate-500 hover:bg-red-100 hover:text-red-500 dark:bg-slate-700"
                    onClick={() => {
                      const n = { ...sizes };
                      delete n[z];
                      setSizes(n);
                    }}
                    aria-label={`Quitar talla ${z}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          Producto activo (visible en el punto de venta)
        </label>

        <div className="flex justify-end gap-2 border-t pt-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-white" />} Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
