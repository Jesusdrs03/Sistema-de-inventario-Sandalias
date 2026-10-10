"use client";
import { useState } from "react";
import { useApp, useToast } from "./providers";
import { Field, Modal, Spinner } from "./ui";
import { sortSizes } from "@/lib/format";
import { adjustProductStock } from "@/lib/services";
import type { Product } from "@/lib/types";

export type AdjustType = "entrada" | "salida" | "ajuste";

export function StockAdjustModal({ product, type, onClose }: { product: Product; type: "entrada" | "salida" | "ajuste"; onClose: () => void }) {
  const { user } = useApp();
  const toast = useToast();
  const sizes = sortSizes(Object.keys(product.sizes));
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(sizes.map((z) => [z, type === "ajuste" ? String(product.sizes[z]) : ""])),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const titles = { entrada: "Reponer stock (entrada de mercancía)", salida: "Salida de mercancía", ajuste: "Ajuste por conteo físico" };

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
