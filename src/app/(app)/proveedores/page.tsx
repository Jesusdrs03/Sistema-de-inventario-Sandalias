"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Truck, MessageCircle } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { ConfirmModal, Empty, Field, Loading, Modal, PageHeader, Spinner } from "@/components/ui";
import { can } from "@/lib/constants";
import { waLink } from "@/lib/format";
import { db } from "@/lib/db";
import type { Supplier } from "@/lib/types";

const EMPTY = { name: "", rif: "", phone: "", email: "", contact: "", supplies: "" };

export default function SuppliersPage() {
  const { user } = useApp();
  const toast = useToast();
  const { rows, loading } = useCollection<Supplier>("suppliers", { orderBy: "name" });
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Supplier | null | undefined>(undefined);
  const [del, setDel] = useState<Supplier | null>(null);
  const list = rows.filter((s) => !q || `${s.name} ${s.rif} ${s.supplies ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Proveedores"
        subtitle="Suplidores de materia prima e insumos"
        actions={<button className="btn-primary" onClick={() => setEdit(null)}><Plus className="h-4 w-4" /> Nuevo proveedor</button>}
      />
      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-900/30"><Truck className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.rif}</p>
                  </div>
                </div>
                <div className="flex">
                  {waLink(s.phone) && (
                    <a href={waLink(s.phone)!} target="_blank" rel="noreferrer" className="btn-icon btn-ghost text-emerald-600" aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></a>
                  )}
                  <button className="btn-icon btn-ghost" onClick={() => setEdit(s)} aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                  {can.deleteRecords(user?.role) && (
                    <button className="btn-icon btn-ghost text-red-500" onClick={() => setDel(s)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {s.supplies && <p><span className="text-slate-400">Suministra:</span> {s.supplies}</p>}
                {s.contact && <p><span className="text-slate-400">Contacto:</span> {s.contact}</p>}
                {s.phone && <p><span className="text-slate-400">Tel:</span> {s.phone}</p>}
                {s.email && <p><span className="text-slate-400">Correo:</span> {s.email}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><Empty text="No hay proveedores" icon={Truck} /></div>
      )}
      {edit !== undefined && <SupplierForm supplier={edit} onClose={() => setEdit(undefined)} />}
      <ConfirmModal
        open={!!del}
        title="Eliminar proveedor"
        message={`¿Eliminar "${del?.name}"?`}
        danger
        confirmText="Eliminar"
        onClose={() => setDel(null)}
        onConfirm={async () => {
          await db.remove("suppliers", del!.id).catch((e) => toast(e.message, "error"));
          toast("Proveedor eliminado");
          setDel(null);
        }}
      />
    </div>
  );
}

function SupplierForm({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (supplier) setF({ ...EMPTY, ...supplier });
  }, [supplier]);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { name, rif, phone, email, contact, supplies } = f;
      const data = { name: name.trim(), rif: rif.trim().toUpperCase(), phone, email, contact, supplies };
      if (supplier) await db.update("suppliers", supplier.id, data);
      else await db.add("suppliers", { ...data, createdAt: new Date().toISOString() });
      toast("Proveedor guardado");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={supplier ? "Editar proveedor" : "Nuevo proveedor"}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Razón social *" className="sm:col-span-2"><input className="input" value={f.name} onChange={set("name")} required autoFocus /></Field>
        <Field label="RIF *"><input className="input" value={f.rif} onChange={set("rif")} placeholder="J-12345678-9" required /></Field>
        <Field label="Persona de contacto"><input className="input" value={f.contact} onChange={set("contact")} /></Field>
        <Field label="Teléfono"><input className="input" value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Correo"><input className="input" type="email" value={f.email} onChange={set("email")} /></Field>
        <Field label="¿Qué suministra?" className="sm:col-span-2"><input className="input" value={f.supplies} onChange={set("supplies")} /></Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />} Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
