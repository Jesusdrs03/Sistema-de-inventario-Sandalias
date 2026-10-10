"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Footprints } from "lucide-react";
import { db } from "@/lib/db";

export const LEGAL_UPDATED = "10 de octubre de 2026";

export interface PublicInfo {
  businessName: string;
  rif: string;
  address: string;
  phone: string;
  email: string;
}

const FALLBACK: PublicInfo = { businessName: "MR Calzados", rif: "", address: "", phone: "", email: "" };

/** Datos públicos de la empresa (meta/public), legibles sin iniciar sesión */
export function usePublicInfo() {
  const [info, setInfo] = useState<PublicInfo>(FALLBACK);
  useEffect(() => {
    db.getDoc<PublicInfo>("meta", "public")
      .then((d) => d && setInfo({ ...FALLBACK, ...d, businessName: d.businessName || FALLBACK.businessName }))
      .catch(() => {});
  }, []);
  return info;
}

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-500 ${className}`}>
      <Link href="/terminos" className="hover:text-brand-600 hover:underline">
        Términos y Condiciones
      </Link>
      {" · "}
      <Link href="/privacidad" className="hover:text-brand-600 hover:underline">
        Política de Privacidad
      </Link>
    </p>
  );
}

export function LegalPage({ title, children }: { title: string; children: (info: PublicInfo) => React.ReactNode }) {
  const info = usePublicInfo();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-brand-500 to-rose-600 p-2 text-white">
              <Footprints className="h-4 w-4" />
            </div>
            <span className="font-bold">{info.businessName}</span>
          </div>
          <Link href="/" className="btn-ghost btn-sm">
            <ArrowLeft className="h-4 w-4" /> Volver al sistema
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="card p-6 sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Última actualización: {LEGAL_UPDATED}</p>
          <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{children(info)}</div>
        </article>
        <LegalLinks className="mt-6 text-center" />
      </main>
    </div>
  );
}

/** Bloque con los datos de identificación del titular */
export function Titular({ info }: { info: PublicInfo }) {
  return (
    <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
      <p>
        <b>Razón social:</b> {info.businessName}
      </p>
      {info.rif && (
        <p>
          <b>RIF:</b> {info.rif}
        </p>
      )}
      {info.address && (
        <p>
          <b>Domicilio:</b> {info.address}
        </p>
      )}
      {info.phone && (
        <p>
          <b>Teléfono:</b> {info.phone}
        </p>
      )}
      {info.email && (
        <p>
          <b>Correo:</b> {info.email}
        </p>
      )}
    </div>
  );
}

export const contactLine = (info: PublicInfo) =>
  [info.email && `al correo ${info.email}`, info.phone && `al teléfono ${info.phone}`].filter(Boolean).join(" o ") ||
  "a través de los canales de atención de la empresa";
