"use client";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Users, MessageCircle, Download } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, ConfirmModal, Empty, Loading, PageHeader } from "@/components/ui";
import { ClientFormModal } from "@/components/client-form";
import { can } from "@/lib/constants";
import { downloadCSV, fmtUSD, waLink } from "@/lib/format";
import { db } from "@/lib/db";
import type { Client, Sale } from "@/lib/types";

export default function ClientsPage() {
  const { user } = useApp();
  const toast = useToast();
  const { rows, loading } = useCollection<Client>("clients", { orderBy: "name" });
  const { rows: credit } = useCollection<Sale>("sales", { where: [["status", "==", "credito"]] });
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Client | null | undefined>(undefined);
  const [del, setDel] = useState<Client | null>(null);

  const debt = useMemo(() => {
    const m: Record<string, number> = {};
    credit.forEach((s) => s.clientId && (m[s.clientId] = (m[s.clientId] ?? 0) + s.balanceUSD));
    return m;
  }, [credit]);

  const list = rows.filter((c) => !q || `${c.name} ${c.docId} ${c.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${rows.length} clientes registrados`}
        actions={
          <>
            <button className="btn-secondary" onClick={() => downloadCSV("clientes.csv", [["Nombre", "Cédula/RIF", "Tipo", "Teléfono", "Correo", "Dirección", "Deuda $"], ...rows.map((c) => [c.name, c.docId, c.type, c.phone ?? "", c.email ?? "", c.address ?? "", debt[c.id] ?? 0])])}>
              <Download className="h-4 w-4" /> Exportar
            </button>
            <button className="btn-primary" onClick={() => setEdit(null)}>
              <Plus className="h-4 w-4" /> Nuevo cliente
            </button>
          </>
        }
      />
      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por nombre, cédula o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
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
                  <th>Cliente</th>
                  <th>Cédula / RIF</th>
                  <th>Tipo</th>
                  <th>Contacto</th>
                  <th className="text-right">Deuda</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.docId}</td>
                    <td><Badge tone={c.type === "mayorista" ? "violet" : "slate"}>{c.type === "mayorista" ? "Mayorista" : "Detal"}</Badge></td>
                    <td className="text-xs text-slate-500">
                      {c.phone && <p>{c.phone}</p>}
                      {c.email && <p>{c.email}</p>}
                    </td>
                    <td className="text-right">{debt[c.id] ? <Badge tone="red">{fmtUSD(debt[c.id])}</Badge> : <span className="text-slate-400">—</span>}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {waLink(c.phone) && (
                          <a href={waLink(c.phone)!} target="_blank" rel="noreferrer" className="btn-icon btn-ghost text-emerald-600" aria-label="WhatsApp">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <button className="btn-icon btn-ghost" onClick={() => setEdit(c)} aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                        {can.deleteRecords(user?.role) && (
                          <button className="btn-icon btn-ghost text-red-500" onClick={() => setDel(c)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No hay clientes" icon={Users} />
        )}
      </div>
      <ClientFormModal open={edit !== undefined} client={edit} onClose={() => setEdit(undefined)} />
      <ConfirmModal
        open={!!del}
        title="Eliminar cliente"
        message={`¿Eliminar a "${del?.name}"? Sus ventas registradas se conservarán.`}
        danger
        confirmText="Eliminar"
        onClose={() => setDel(null)}
        onConfirm={async () => {
          await db.remove("clients", del!.id).catch((e) => toast(e.message, "error"));
          toast("Cliente eliminado");
          setDel(null);
        }}
      />
    </div>
  );
}
