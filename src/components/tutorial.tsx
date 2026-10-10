"use client";
import { useEffect, useState } from "react";
import { GraduationCap, X, BookOpen, Lightbulb } from "lucide-react";
import { Modal } from "./ui";
import { NAV } from "./shell-nav";
import { PERMISSIONS, type Module } from "@/lib/constants";
import { TUTORIAL } from "@/lib/tutorial";
import type { AppUser } from "@/lib/types";

const key = (uid: string) => `tutorial_vistos_${uid}`;
const readSeen = (uid: string): Module[] => {
  try {
    return JSON.parse(window.localStorage.getItem(key(uid)) ?? "[]");
  } catch {
    return [];
  }
};
const writeSeen = (uid: string, v: Module[]) => {
  try {
    window.localStorage.setItem(key(uid), JSON.stringify(v));
  } catch {}
};

/** Tarjeta de ayuda del módulo actual (solo si el administrador activó el tutorial al usuario) */
export function TutorialCard({ user, module, onOpenGuide }: { user: AppUser; module?: Module; onOpenGuide: () => void }) {
  const [seen, setSeen] = useState<Module[]>([]);
  useEffect(() => setSeen(readSeen(user.id)), [user.id]);
  if (!module || seen.includes(module)) return null;
  const t = TUTORIAL[module];
  const dismiss = () => {
    const v = [...seen, module];
    setSeen(v);
    writeSeen(user.id, v);
  };
  return (
    <div className="no-print animate-in mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-950/40">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sky-500 p-2 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">Tutorial · {t.title}</p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{t.purpose}</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {t.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary btn-sm" onClick={dismiss}>
              Entendido
            </button>
            <button className="btn-secondary btn-sm" onClick={onOpenGuide}>
              <BookOpen className="h-3.5 w-3.5" /> Ver guía completa
            </button>
          </div>
        </div>
        <button className="btn-icon btn-ghost" onClick={dismiss} aria-label="Cerrar tutorial">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Guía completa con todos los módulos a los que el usuario tiene acceso */
export function TutorialGuide({ user, open, onClose }: { user: AppUser; open: boolean; onClose: () => void }) {
  const modules = NAV.filter((n) => PERMISSIONS[user.role].includes(n.module));
  const resetSeen = () => {
    writeSeen(user.id, []);
    onClose();
    window.location.reload();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Guía del sistema"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={resetSeen}>
            Volver a mostrar las ayudas
          </button>
          <button className="btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </>
      }
    >
      <p className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Lightbulb className="h-4 w-4 text-amber-500" /> Estos son los apartados a los que tienes acceso y para qué sirve cada uno.
      </p>
      <div className="space-y-3">
        {modules.map((n) => {
          const t = TUTORIAL[n.module];
          return (
            <details key={n.module} className="group rounded-xl border p-4 dark:border-slate-700">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <n.icon className="h-5 w-5 text-brand-600" />
                <span className="flex-1">
                  <span className="block font-semibold">{t.title}</span>
                  <span className="block text-sm text-slate-500">{t.purpose}</span>
                </span>
              </summary>
              <ol className="mt-3 list-decimal space-y-1 pl-12 text-sm text-slate-700 dark:text-slate-300">
                {t.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </details>
          );
        })}
      </div>
    </Modal>
  );
}
