"use client";
import { useState } from "react";
import { Plus, Pencil, ShieldCheck, KeyRound, UserCog, Check, X } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, Empty, Field, Loading, Modal, PageHeader, Spinner } from "@/components/ui";
import { NAV } from "@/components/shell";
import { PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import { authApi, authError } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AppUser, Role } from "@/lib/types";

const ROLES = Object.keys(ROLE_LABELS) as Role[];
const roleTone = { admin: "red", gerente: "violet", vendedor: "blue", almacen: "amber" } as const;

export default function UsersPage() {
  const { user, mode } = useApp();
  const toast = useToast();
  const { rows, loading } = useCollection<AppUser>("users", { orderBy: "name" });
  const [edit, setEdit] = useState<AppUser | null | undefined>(undefined);

  const toggleTutorial = async (u: AppUser) => {
    try {
      await db.update("users", u.id, { tutorial: !u.tutorial });
      toast(`Tutorial ${!u.tutorial ? "activado" : "desactivado"} para ${u.name}`);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const reset = async (u: AppUser) => {
    try {
      await authApi.resetPassword(u.email);
      toast(`Correo de restablecimiento enviado a ${u.email}`, "info");
    } catch (e) {
      toast(authError(e), "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios y roles"
        subtitle="Controla quién accede y qué puede hacer cada empleado"
        actions={<button className="btn-primary" onClick={() => setEdit(null)}><Plus className="h-4 w-4" /> Nuevo usuario</button>}
      />
      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Tutorial</th><th></th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{u.name.charAt(0)}</div>
                        <div><p className="font-medium">{u.name} {u.id === user?.id && <span className="text-xs text-slate-400">(tú)</span>}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                      </div>
                    </td>
                    <td><Badge tone={roleTone[u.role]}>{ROLE_LABELS[u.role]}</Badge></td>
                    <td>{u.active ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                    <td>
                      <button
                        role="switch"
                        aria-checked={!!u.tutorial}
                        aria-label={`Tutorial de ${u.name}`}
                        onClick={() => toggleTutorial(u)}
                        className="flex items-center gap-2 text-xs"
                        title={u.tutorial ? "Desactivar el tutorial" : "Activar el tutorial"}
                      >
                        <span className={`relative inline-flex h-5 w-9 rounded-full transition ${u.tutorial ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${u.tutorial ? "left-[18px]" : "left-0.5"}`} />
                        </span>
                        {u.tutorial ? "Activo" : "Apagado"}
                      </button>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {mode === "firebase" && <button className="btn-icon btn-ghost" title="Enviar correo para restablecer contraseña" onClick={() => reset(u)} aria-label="Restablecer contraseña"><KeyRound className="h-4 w-4" /></button>}
                        <button className="btn-icon btn-ghost" onClick={() => setEdit(u)} aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={UserCog} />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-4"><ShieldCheck className="h-5 w-5 text-brand-600" /><h3 className="font-semibold">Matriz de permisos por rol</h3></div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Módulo</th>{ROLES.map((r) => <th key={r} className="text-center">{ROLE_LABELS[r]}</th>)}</tr>
            </thead>
            <tbody>
              {NAV.map((n) => (
                <tr key={n.module}>
                  <td className="flex items-center gap-2"><n.icon className="h-4 w-4 text-slate-400" /> {n.label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="text-center">
                      {PERMISSIONS[r].includes(n.module) ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <X className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-700" />}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td>Anular ventas</td>
                {ROLES.map((r) => <td key={r} className="text-center">{r === "admin" || r === "gerente" ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <X className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-700" />}</td>)}
              </tr>
              <tr>
                <td>Eliminar registros</td>
                {ROLES.map((r) => <td key={r} className="text-center">{r === "admin" ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <X className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-700" />}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {edit !== undefined && <UserForm u={edit} self={edit?.id === user?.id} onClose={() => setEdit(undefined)} />}
    </div>
  );
}

function UserForm({ u, self, onClose }: { u: AppUser | null; self: boolean; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(u?.name ?? "");
  const [email, setEmail] = useState(u?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(u?.role ?? "vendedor");
  const [active, setActive] = useState(u?.active ?? true);
  const [tutorial, setTutorial] = useState(u?.tutorial ?? true);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (u) await db.update("users", u.id, self ? { name: name.trim(), tutorial } : { name: name.trim(), role, active, tutorial });
      else await authApi.createUser(name.trim(), email, password, role, tutorial);
      toast(u ? "Usuario actualizado" : "Usuario creado");
      onClose();
    } catch (e) {
      toast(authError(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={u ? "Editar usuario" : "Nuevo usuario"}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Nombre completo *"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
        <Field label="Correo *"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!u} /></Field>
        {!u && <Field label="Contraseña inicial * (mín. 6 caracteres)"><input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></Field>}
        <div>
          <p className="label">Rol</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r}
                disabled={self}
                onClick={() => setRole(r)}
                className={`rounded-xl border-2 p-3 text-left transition disabled:opacity-60 ${role === r ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-200 dark:border-slate-700"}`}
              >
                <p className="text-sm font-semibold">{ROLE_LABELS[r]}</p>
                <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[r]}</p>
              </button>
            ))}
          </div>
          {self && <p className="mt-1 text-xs text-slate-500">No puedes cambiar tu propio rol.</p>}
        </div>
        <label className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-sm dark:bg-sky-900/20">
          <input type="checkbox" className="mt-0.5" checked={tutorial} onChange={(e) => setTutorial(e.target.checked)} />
          <span>
            <b>Mostrar tutorial</b>
            <span className="block text-xs text-slate-500">Al entrar a cada apartado verá una explicación de para qué sirve y cómo usarlo, y un botón &quot;Guía&quot; arriba.</span>
          </span>
        </label>
        {u && !self && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Usuario activo (puede iniciar sesión)</label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />} Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
