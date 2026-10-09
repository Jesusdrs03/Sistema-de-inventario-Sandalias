"use client";
import { useMemo, useState } from "react";
import { Plus, Play, CheckCircle2, XCircle, Factory, Trash2, Clock, Hammer, PackageCheck } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, ConfirmModal, Empty, Field, Loading, Modal, PageHeader, Spinner, Stat, Tabs } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtNum, fmtUSD, parseNum, sortSizes } from "@/lib/format";
import { createProductionOrder, setProductionStatus } from "@/lib/services";
import type { Material, Product, ProductionOrder, ProductionStatus } from "@/lib/types";

const STATUS: Record<ProductionStatus, { label: string; tone: "amber" | "blue" | "green" | "red" }> = {
  pendiente: { label: "Pendiente", tone: "amber" },
  en_proceso: { label: "En proceso", tone: "blue" },
  terminada: { label: "Terminada", tone: "green" },
  cancelada: { label: "Cancelada", tone: "red" },
};

export default function ProductionPage() {
  const { user } = useApp();
  const toast = useToast();
  const { rows, loading } = useCollection<ProductionOrder>("production", { orderBy: "createdAt", desc: true, limit: 200 });
  const { rows: products } = useCollection<Product>("products", { orderBy: "name" });
  const { rows: materials } = useCollection<Material>("materials", { orderBy: "name" });
  const [tab, setTab] = useState<"activas" | "todas">("activas");
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ o: ProductionOrder; s: ProductionStatus } | null>(null);
  const [busy, setBusy] = useState(false);

  const list = tab === "activas" ? rows.filter((o) => o.status === "pendiente" || o.status === "en_proceso") : rows;
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const doneMonth = rows.filter((o) => o.status === "terminada" && o.completedAt?.startsWith(monthPrefix));

  const change = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await setProductionStatus(confirm.o.id, confirm.s, user!);
      toast(confirm.s === "terminada" ? "Orden terminada: stock agregado al inventario" : "Estado actualizado");
      setConfirm(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Producción"
        subtitle="Órdenes de fabricación con consumo de materia prima"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva orden
          </button>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Pendientes" value={rows.filter((o) => o.status === "pendiente").length} icon={Clock} tone="amber" />
        <Stat label="En proceso" value={rows.filter((o) => o.status === "en_proceso").length} sub={`${rows.filter((o) => o.status === "en_proceso").reduce((a, b) => a + b.totalPairs, 0)} pares`} icon={Hammer} tone="blue" />
        <Stat label="Pares fabricados (mes)" value={doneMonth.reduce((a, b) => a + b.totalPairs, 0)} sub={`${doneMonth.length} órdenes`} icon={PackageCheck} tone="green" />
      </div>
      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: "activas", label: "Activas" }, { value: "todas", label: "Todas" }]} />
      </div>
      {loading ? (
        <Loading />
      ) : list.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => (
            <div key={o.id} className="card flex flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono text-slate-500">Orden #{o.number}</p>
                  <p className="font-semibold">{o.productName}</p>
                </div>
                <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
              </div>
              <div className="mb-3 flex flex-wrap gap-1">
                {sortSizes(Object.keys(o.sizes)).filter((z) => o.sizes[z] > 0).map((z) => (
                  <span key={z} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                    T{z}: <b>{o.sizes[z]}</b>
                  </span>
                ))}
              </div>
              <p className="text-sm"><b>{o.totalPairs}</b> pares</p>
              {o.materials.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {o.materials.map((m) => (
                    <li key={m.materialId}>• {m.name}: {fmtNum(m.qty)} {m.unit}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 space-y-0.5 text-xs text-slate-500">
                {o.responsible && <p>Responsable: {o.responsible}</p>}
                {o.dueDate && <p>Entrega: {fmtDate(o.dueDate)}</p>}
                <p>Creada: {fmtDateTime(o.createdAt)} por {o.createdBy}</p>
                {o.completedAt && <p>Terminada: {fmtDateTime(o.completedAt)}</p>}
                {o.notes && <p className="italic">{o.notes}</p>}
              </div>
              {(o.status === "pendiente" || o.status === "en_proceso") && (
                <div className="mt-4 flex gap-2 border-t pt-3">
                  {o.status === "pendiente" && (
                    <button className="btn-secondary btn-sm flex-1" onClick={() => setConfirm({ o, s: "en_proceso" })}>
                      <Play className="h-3.5 w-3.5" /> Iniciar
                    </button>
                  )}
                  <button className="btn-success btn-sm flex-1" onClick={() => setConfirm({ o, s: "terminada" })}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Terminar
                  </button>
                  <button className="btn-ghost btn-sm text-red-500" onClick={() => setConfirm({ o, s: "cancelada" })} aria-label="Cancelar orden">
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><Empty text="No hay órdenes de producción" icon={Factory} /></div>
      )}

      {open && <OrderForm products={products} materials={materials} onClose={() => setOpen(false)} />}
      <ConfirmModal
        open={!!confirm}
        title={confirm?.s === "terminada" ? "Terminar orden" : confirm?.s === "cancelada" ? "Cancelar orden" : "Iniciar producción"}
        message={
          confirm?.s === "terminada"
            ? `Se agregarán ${confirm.o.totalPairs} pares al inventario y se descontará la materia prima indicada.`
            : confirm?.s === "cancelada"
              ? "La orden se marcará como cancelada sin afectar el inventario."
              : "La orden pasará a estado 'En proceso'."
        }
        danger={confirm?.s === "cancelada"}
        busy={busy}
        onConfirm={change}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function OrderForm({ products, materials, onClose }: { products: Product[]; materials: Material[]; onClose: () => void }) {
  const { user } = useApp();
  const toast = useToast();
  const [productId, setProductId] = useState("");
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [mats, setMats] = useState<{ materialId: string; qty: string }[]>([]);
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const product = products.find((p) => p.id === productId);
  const total = Object.values(sizes).reduce((a, b) => a + (parseInt(b) || 0), 0);
  const matCost = useMemo(
    () => mats.reduce((a, m) => a + (materials.find((x) => x.id === m.materialId)?.costUSD ?? 0) * parseNum(m.qty), 0),
    [mats, materials],
  );

  const pick = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setSizes(p ? Object.fromEntries(Object.keys(p.sizes).map((z) => [z, ""])) : {});
  };

  const save = async () => {
    if (!product) return toast("Selecciona un producto", "error");
    if (!total) return toast("Indica cantidades por talla", "error");
    setBusy(true);
    try {
      const res = await createProductionOrder(
        {
          productId: product.id,
          productName: `${product.name} (${product.color})`,
          sizes: Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, parseInt(v) || 0]).filter(([, v]) => (v as number) > 0)),
          materials: mats
            .filter((m) => m.materialId && parseNum(m.qty) > 0)
            .map((m) => {
              const mm = materials.find((x) => x.id === m.materialId)!;
              return { materialId: mm.id, name: mm.name, unit: mm.unit, qty: parseNum(m.qty) };
            }),
          responsible: responsible.trim() || undefined,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        },
        user!,
      );
      toast(`Orden #${res.number} creada`);
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
      title="Nueva orden de producción"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />} Crear orden</button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Producto a fabricar *">
          <select className="input" value={productId} onChange={(e) => pick(e.target.value)}>
            <option value="">Selecciona…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.color} ({p.sku})</option>)}
          </select>
        </Field>
        {product && (
          <div>
            <p className="label">Pares por talla ({total} en total)</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {sortSizes(Object.keys(sizes)).map((z) => (
                <div key={z} className="rounded-xl border p-2 text-center dark:border-slate-700">
                  <p className="text-xs font-semibold">T {z}</p>
                  <input type="number" min={0} className="mt-1 w-full rounded-lg bg-slate-50 py-1 text-center text-sm outline-none dark:bg-slate-800" value={sizes[z]} onChange={(e) => setSizes({ ...sizes, [z]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label mb-0">Materia prima a consumir</p>
            <button className="btn-secondary btn-sm" onClick={() => setMats([...mats, { materialId: "", qty: "" }])}>
              <Plus className="h-3.5 w-3.5" /> Material
            </button>
          </div>
          <div className="space-y-2">
            {mats.map((m, i) => {
              const mm = materials.find((x) => x.id === m.materialId);
              return (
                <div key={i} className="flex gap-2">
                  <select className="input flex-1" value={m.materialId} onChange={(e) => setMats(mats.map((x, k) => (k === i ? { ...x, materialId: e.target.value } : x)))}>
                    <option value="">Material…</option>
                    {materials.map((x) => <option key={x.id} value={x.id}>{x.name} (disp. {fmtNum(x.stock)} {x.unit})</option>)}
                  </select>
                  <input className="input w-28" inputMode="decimal" placeholder={mm?.unit ?? "Cant."} value={m.qty} onChange={(e) => setMats(mats.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} />
                  <button className="btn-icon btn-ghost text-red-500" onClick={() => setMats(mats.filter((_, k) => k !== i))} aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
            {mats.length > 0 && (
              <p className="text-right text-xs text-slate-500">
                Costo de materiales: <b>{fmtUSD(matCost)}</b> {total > 0 && `· ${fmtUSD(matCost / total)} por par`}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsable / taller">
            <input className="input" value={responsible} onChange={(e) => setResponsible(e.target.value)} />
          </Field>
          <Field label="Fecha de entrega">
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Notas" className="sm:col-span-2">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
