export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const usdFmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtUSD = (n: number) => `$ ${usdFmt.format(n || 0)}`;
export const fmtBs = (n: number) => `Bs ${usdFmt.format(n || 0)}`;
export const fmtNum = (n: number, d = 2) =>
  new Intl.NumberFormat("es-VE", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);
export const fmtInt = (n: number) => new Intl.NumberFormat("es-VE").format(n || 0);

export const fmtMoney = (n: number, currency: "VES" | "USD" | "USDT") =>
  currency === "VES" ? fmtBs(n) : currency === "USDT" ? `${usdFmt.format(n || 0)} USDT` : fmtUSD(n);

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/** Fecha local yyyy-mm-dd */
export const localDay = (d: Date | string = new Date()) => {
  const x = typeof d === "string" ? new Date(d) : d;
  const m = `${x.getMonth() + 1}`.padStart(2, "0");
  const day = `${x.getDate()}`.padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
};

export const startOfDay = (day: string) => new Date(`${day}T00:00:00`).toISOString();
export const endOfDay = (day: string) => new Date(`${day}T23:59:59.999`).toISOString();

export const totalStock = (sizes: Record<string, number> = {}) =>
  Object.values(sizes).reduce((a, b) => a + (Number(b) || 0), 0);

export const sortSizes = (sizes: string[]) =>
  [...sizes].sort((a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (isNaN(na) || isNaN(nb)) return a.localeCompare(b);
    return na - nb;
  });

export const pad = (n: number, len = 6) => `${n}`.padStart(len, "0");

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const parseNum = (v: string | number) => {
  if (typeof v === "number") return v;
  let s = String(v).trim().replace(/\s/g, "");
  // Acepta "1.234,56" (formato venezolano), "1234,56" y "1234.56"
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

/** Enlace de WhatsApp para un teléfono venezolano (0414-… → 58414…) */
export const waLink = (phone?: string) => {
  if (!phone) return null;
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "58" + p.slice(1);
  return `https://wa.me/${p}`;
};
