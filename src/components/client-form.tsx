"use client";
import { useState } from "react";
import { db } from "@/lib/db";
import { Field, Modal, Spinner } from "./ui";
import { useToast } from "./providers";
import type { Client } from "@/lib/types";

const EMPTY: Omit<Client, "id"> = { name: "", docId: "", phone: "", email: "", address: "", type: "detal" };

type ClientFormProps = {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  /** Datos para precargar un cliente nuevo (p. ej. la cédula o el teléfono buscado en el POS) */
  initial?: Partial<Client>;
  onSaved?: (c: Client) => void;
};

/** Se monta solo al abrirse, para que cada apertura empiece con el formulario limpio */
export function ClientFormModal(props: ClientFormProps) {
  return props.open ? <ClientForm {...props} /> : null;
}

function ClientForm({ open, onClose, client, initial, onSaved }: ClientFormProps) {
  const toast = useToast();
  const [f, setF] = useState<Omit<Client, "id">>(() => (client ? { ...EMPTY, ...client } : { ...EMPTY, ...initial }));
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = { ...f, name: f.name.trim(), docId: f.docId.trim().toUpperCase() };
      // Evita registrar dos veces la misma cédula/RIF
      const same = await new Promise<Client[]>((resolve) => {
        const unsub = db.subscribe<Client>("clients", (r) => {
          resolve(r);
          setTimeout(() => unsub(), 0);
        }, { where: [["docId", "==", data.docId]] }, () => resolve([]));
      });
      const dup = same.find((c) => c.id !== client?.id);
      if (dup) throw new Error(`Ya existe un cliente con la cédula/RIF ${data.docId}: ${dup.name}`);
      let id = client?.id;
      // Una vez registrado, solo se pueden cambiar el teléfono y la dirección
      if (id) await db.update("clients", id, { phone: f.phone?.trim() ?? "", address: f.address?.trim() ?? "" });
      else id = await db.add("clients", { ...data, createdAt: new Date().toISOString() });
      toast(client ? "Cliente actualizado" : "Cliente registrado");
      onSaved?.(client ? { ...client, phone: f.phone, address: f.address } : { ...data, id });
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const locked = !!client;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <Modal open={open} onClose={onClose} title={client ? "Editar cliente" : "Nuevo cliente"}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {locked && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 sm:col-span-2">
            Por seguridad, de un cliente ya registrado solo se pueden modificar el <b>teléfono</b> y la <b>dirección</b>.
          </p>
        )}
        <Field label="Nombre o razón social *" className="sm:col-span-2">
          <input className="input" value={f.name} onChange={set("name")} required autoFocus={!locked} disabled={locked} />
        </Field>
        <Field label="Cédula / RIF *">
          <input className="input" value={f.docId} onChange={set("docId")} placeholder="V-12345678" required disabled={locked} />
        </Field>
        <Field label="Tipo">
          <select className="input" value={f.type} onChange={set("type")} disabled={locked}>
            <option value="detal">Detal</option>
            <option value="mayorista">Mayorista</option>
          </select>
        </Field>
        <Field label="Teléfono">
          <input className="input" value={f.phone} onChange={set("phone")} placeholder="0414-1234567" autoFocus={locked} />
        </Field>
        <Field label="Correo">
          <input className="input" type="email" value={f.email} onChange={set("email")} disabled={locked} />
        </Field>
        <Field label="Dirección" className="sm:col-span-2">
          <input className="input" value={f.address} onChange={set("address")} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-white" />} Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
