import { NextResponse } from "next/server";

/**
 * Tasa oficial del dólar BCV.
 * Intenta varias fuentes en orden; la respuesta se cachea 30 minutos en el edge de Vercel.
 */
export const revalidate = 1800;

interface RateResult {
  usd: number;
  eur?: number;
  date?: string;
  source: string;
}

const UA = { "User-Agent": "Mozilla/5.0 (SistemaSandalias/1.0)" };

async function fromDolarApi(): Promise<RateResult> {
  const [u, e] = await Promise.all([
    fetch("https://ve.dolarapi.com/v1/dolares/oficial", { headers: UA, next: { revalidate: 1800 } }),
    fetch("https://ve.dolarapi.com/v1/euros/oficial", { headers: UA, next: { revalidate: 1800 } }).catch(() => null),
  ]);
  if (!u.ok) throw new Error(`dolarapi ${u.status}`);
  const j = await u.json();
  const usd = Number(j.promedio ?? j.precio);
  if (!usd) throw new Error("dolarapi sin precio");
  let eur: number | undefined;
  if (e?.ok) {
    const je = await e.json().catch(() => null);
    eur = Number(je?.promedio ?? je?.precio) || undefined;
  }
  return { usd, eur, date: j.fechaActualizacion, source: "BCV (DolarAPI)" };
}

async function fromBcvSite(): Promise<RateResult> {
  const r = await fetch("https://www.bcv.org.ve/", { headers: UA, next: { revalidate: 1800 } });
  if (!r.ok) throw new Error(`bcv ${r.status}`);
  const html = await r.text();
  const grab = (id: string) => {
    const m = html.match(new RegExp(`id="${id}"[\\s\\S]*?<strong>\\s*([\\d.,]+)\\s*</strong>`, "i"));
    return m ? Number(m[1].replace(/\./g, "").replace(",", ".")) : undefined;
  };
  const usd = grab("dolar");
  if (!usd) throw new Error("bcv sin precio");
  const dm = html.match(/date-display-single[^>]*content="([^"]+)"/i);
  return { usd, eur: grab("euro"), date: dm?.[1], source: "BCV (bcv.org.ve)" };
}

async function fromPyDolar(): Promise<RateResult> {
  const r = await fetch("https://pydolarve.org/api/v2/dollar?page=bcv&monitor=usd", { headers: UA, next: { revalidate: 1800 } });
  if (!r.ok) throw new Error(`pydolar ${r.status}`);
  const j = await r.json();
  const usd = Number(j.price);
  if (!usd) throw new Error("pydolar sin precio");
  return { usd, date: j.last_update, source: "BCV (PyDolarVE)" };
}

export async function GET() {
  const errors: string[] = [];
  for (const src of [fromDolarApi, fromBcvSite, fromPyDolar]) {
    try {
      const data = await src();
      return NextResponse.json(
        { ok: true, ...data, fetchedAt: new Date().toISOString() },
        { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
      );
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return NextResponse.json({ ok: false, errors }, { status: 502 });
}
