"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Search, Layers } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, ConfirmModal, Empty, Field, Loading, Modal, PageHeader, Spinner, Stat } from "@/components/ui";
import { can } from "@/lib/constants";
import { fmtNum, fmtUSD, parseNum } from "@/lib/format";
import { adjustMaterialStock } from "@/lib/services";
import { db } from "@/lib/db";
import type { Material, Supplier } from "@/lib/types";
import { AlertTriangle, DollarSign } from "lucide-react";

export default function MaterialsPage() {
  const { user } = useApp();
  const toast = useToast();
  const { rows, loading } = useCollection<Material>("materials", { orderBy: "name" });
  const { rows: suppliers } = useCollection<Supplier>("suppliers", { orderBy: "name" });
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Material | null | undefined>(undefined);
  const [adj, setAdj] = useState<{ m: Material; type: "entrada" | "salida" | "ajuste" } | null>(null);
  const [del, setDel] = useState<Material | null>(null);

  const list = useMemo(() => rows.filter((m) => !q || `${m.name} ${m.supplierName ?? ""}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const value = rows.reduce((a, m) => a + m.stock * m.costUSD, 0);
  const low = rows.filter((m) => m.stock <= m.minStock).length;

  return (
    <div>
      <PageHeader
        title="Materia prima"
        subtitle="Insumos de la fábrica: suelas, cuero, correas, pegamento…"
        actions={
          <button className="btn-primary" onClick={() => setEdit(null)}>
            <Plus className="h-4 w-4" /> Nuevo material
          </button>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Materiales" value={rows.length} icon={Layers} tone="brand" />
        <Stat label="Valor en almacén" value={fmtUSD(value)} icon={DollarSign} tone="green" />
        <Stat label="Bajo el mínimo" value={low} icon={AlertTriangle} tone="amber" />
      </div>
      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar material o proveedor…" value={q} onChange={(e) => setQ(e.target.value)} />
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
                  <th>Material</th>
                  <th>Proveedor</th>
                  <th className="text-right">Existencia</th>
                  <th className="text-right">Mínimo</th>
                  <th className="text-right">Costo unit.</th>
                  <th className="text-right">Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium">{m.name}</td>
                    <td className="text-slate-500">{m.supplierName ?? "—"}</td>
                    <td className="text-right">
                      <Badge tone={m.stock <= 0 ? "red" : m.stock <= m.minStock ? "amber" : "green"}>
                        {fmtNum(m.stock)} {m.unit}
                      </Badge>
                    </td>
                    <td className="text-right text-slate-500">{fmtNum(m.minStock)}</td>
                    <td className="text-right">{fmtUSD(m.costUSD)}</td>
                    <td className="text-right font-medium">{fmtUSD(m.stock * m.costUSD)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon btn-ghost text-emerald-600" title="Entrada / compra" onClick={() => setAdj({ m, type: "entrada" })} aria-label="Entrada"><ArrowDownCircle className="h-4 w-4" /></button>
                        <button className="btn-icon btn-ghost text-red-500" title="Salida" onClick={() => setAdj({ m, type: "salida" })} aria-label="Salida"><ArrowUpCircle className="h-4 w-4" /></button>
                        <button className="btn-icon btn-ghost text-amber-600" title="Ajuste" onClick={() => setAdj({ m, type: "ajuste" })} aria-label="Ajuste"><SlidersHorizontal className="h-4 w-4" /></button>
                        <button className="btn-icon btn-ghost" onClick={() => setEdit(m)} aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                        {can.deleteRecords(user?.role) && (
                          <button className="btn-icon btn-ghost text-red-500" onClick={() => setDel(m)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No hay materiales registrados" icon={Layers} />
        )}
      </div>
      {edit !== undefined && <MaterialForm material={edit} suppliers={suppliers} onClose={() => setEdit(undefined)} />}
      {adj && <MaterialAdjust material={adj.m} type={adj.type} onClose={() => setAdj(null)} />}
      <ConfirmModal
        open={!!del}
        title="Eliminar material"
        message={`¿Eliminar "${del?.name}"?`}
        danger
        confirmText="Eliminar"
        onClose={() => setDel(null)}
        onConfirm={async () => {
          await db.remove("materials", del!.id).catch((e) => toast(e.message, "error"));
          setDel(null);
          toast("Material eliminado");
        }}
      />
    </div>
  );
}

function MaterialForm({ material, suppliers, onClose }: { material: Material | null; suppliers: Supplier[]; onClose: () => void }) {
  const { user } = useApp();
  const toast = useToast();
  const [f, setF] = useState({ name: "", unit: "unidad", stock: "0", minStock: "0", costUSD: "0", supplierId: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (material)
      setF({
        name: material.name, unit: material.unit, stock: String(material.stock), minStock: String(material.minStock),
        costUSD: String(material.costUSD), supplierId: material.supplierId ?? "",
      });
  }, [material]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const sup = suppliers.find((s) => s.id === f.supplierId);
      const now = new Date().toISOString();
      const data = {
        name: f.name.trim(), unit: f.unit.trim(), minStock: parseNum(f.minStock), costUSD: parseNum(f.costUSD),
        supplierId: sup?.id ?? null, supplierName: sup?.name ?? null, updatedAt: now,
      };
      if (material) await db.update("materials", material.id, data);
      else {
        const stock = parseNum(f.stock);
        const id = await db.add("materials", { ...data, stock });
        if (stock > 0)
          await db.add("movements", { itemType: "material", itemId: id, itemName: data.name, qty: stock, type: "entrada", note: "Inventario inicial", userName: user!.name, date: now });
      }
      toast("Material guardado");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={material ? "Editar material" : "Nuevo material"}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *" className="sm:col-span-2">
          <input className="input" value={f.name} onChange={set("name")} required autoFocus />
        </Field>
        <Field label="Unidad de medida">
          <input className="input" list="units" value={f.unit} onChange={set("unit")} />
          <datalist id="units">
            {["unidad", "par", "metro", "m²", "kg", "litro", "rollo", "cono", "lámina"].map((u) => <option key={u} value={u} />)}
          </datalist>
        </Field>
        <Field label="Proveedor">
          <select className="input" value={f.supplierId} onChange={set("supplierId")}>
            <option value="">— Sin proveedor —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        {!material && (
          <Field label="Existencia inicial">
            <input className="input" inputMode="decimal" value={f.stock} onChange={set("stock")} />
          </Field>
        )}
        <Field label="Stock mínimo">
          <input className="input" inputMode="decimal" value={f.minStock} onChange={set("minStock")} />
        </Field>
        <Field label="Costo unitario ($)">
          <input className="input" inputMode="decimal" value={f.costUSD} onChange={set("costUSD")} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />} Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

function MaterialAdjust({ material, type, onClose }: { material: Material; type: "entrada" | "salida" | "ajuste"; onClose: () => void }) {
  const { user } = useApp();
  const toast = useToast();
  const [qty, setQty] = useState(type === "ajuste" ? String(material.stock) : "");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const titles = { entrada: "Entrada / compra de material", salida: "Salida de material", ajuste: "Ajuste por conteo" };
  const save = async () => {
    setBusy(true);
    try {
      await adjustMaterialStock(material.id, parseNum(qty), type, note.trim(), user!, parseNum(cost) || undefined);
      toast("Existencia actualizada");
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
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={busy || qty === ""}>{busy && <Spinner className="h-4 w-4 text-white" />} Registrar</button>
        </>
      }
    >
      <p className="mb-3 text-sm">
        <b>{material.name}</b> · Actual: {fmtNum(material.stock)} {material.unit}
      </p>
      <div className="space-y-3">
        <Field label={type === "ajuste" ? `Cantidad real (${material.unit})` : `Cantidad (${material.unit})`}>
          <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
        {type === "entrada" && (
          <Field label="Nuevo costo unitario $ (opcional)">
            <input className="input" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder={String(material.costUSD)} />
          </Field>
        )}
        <Field label="Nota">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: factura N°, motivo…" />
        </Field>
      </div>
    </Modal>
  );
}
