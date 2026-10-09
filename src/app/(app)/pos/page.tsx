"use client";
import { useMemo, useState } from "react";
import { Search, Minus, Plus, Trash2, ShoppingCart, UserPlus, X, CreditCard, Footprints, Info } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, Empty, Field, Modal, Spinner, Tabs, cx } from "@/components/ui";
import { ClientFormModal } from "@/components/client-form";
import { ReceiptModal } from "@/components/receipt";
import { MethodButtons, PaymentRow, draftToPayment, type DraftPayment } from "@/components/payment-editor";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { fmtBs, fmtNum, fmtUSD, parseNum, round2, sortSizes, totalStock } from "@/lib/format";
import { computeTotals, createSale, suggestAmount } from "@/lib/services";
import { db } from "@/lib/db";
import type { Client, PaymentMethod, Product, Sale, SaleItem } from "@/lib/types";

type CartItem = SaleItem & { stock: number; detalPrice: number; mayorPrice: number };

export default function POSPage() {
  const { settings, rate } = useApp();
  const toast = useToast();
  const { rows: products, loading } = useCollection<Product>("products", { orderBy: "name" });
  const { rows: clients } = useCollection<Client>("clients", { orderBy: "name" });

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Todas");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [picking, setPicking] = useState<Product | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [clientQ, setClientQ] = useState("");
  const [newClient, setNewClient] = useState(false);
  const [priceType, setPriceType] = useState<"detal" | "mayor">("detal");
  const [discount, setDiscount] = useState("");
  const [discountMode, setDiscountMode] = useState<"usd" | "pct">("usd");
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.active !== false &&
        (cat === "Todas" || p.category === cat) &&
        (!s || `${p.name} ${p.sku} ${p.color} ${p.material}`.toLowerCase().includes(s)),
    );
  }, [products, q, cat]);

  const subtotal = round2(cart.reduce((a, b) => a + b.subtotalUSD, 0));
  const discountUSD = discountMode === "pct" ? round2((subtotal * parseNum(discount)) / 100) : parseNum(discount);
  const preview = computeTotals(cart, discountUSD, settings, []);
  const pairs = cart.reduce((a, b) => a + b.qty, 0);

  const addToCart = (p: Product, size: string, qty: number) => {
    const stock = Number(p.sizes[size] ?? 0);
    setCart((c) => {
      const i = c.findIndex((x) => x.productId === p.id && x.size === size);
      const mayor = p.wholesalePriceUSD || p.priceUSD;
      const price = priceType === "mayor" ? mayor : p.priceUSD;
      if (i >= 0) {
        const n = [...c];
        const nq = Math.min(stock, n[i].qty + qty);
        n[i] = { ...n[i], qty: nq, subtotalUSD: round2(nq * n[i].priceUSD) };
        return n;
      }
      return [
        ...c,
        {
          productId: p.id, name: `${p.name} (${p.color})`, sku: p.sku, size, qty: Math.min(qty, stock),
          priceUSD: price, costUSD: p.costUSD, subtotalUSD: round2(price * Math.min(qty, stock)),
          stock, detalPrice: p.priceUSD, mayorPrice: mayor,
        },
      ];
    });
  };

  const setQty = (i: number, qty: number) =>
    setCart((c) => {
      const n = [...c];
      const q2 = Math.max(1, Math.min(n[i].stock, qty));
      n[i] = { ...n[i], qty: q2, subtotalUSD: round2(q2 * n[i].priceUSD) };
      return n;
    });

  const changePriceType = (t: "detal" | "mayor") => {
    setPriceType(t);
    setCart((c) =>
      c.map((i) => {
        const price = t === "mayor" ? i.mayorPrice : i.detalPrice;
        return { ...i, priceUSD: price, subtotalUSD: round2(price * i.qty) };
      }),
    );
  };

  const pickClient = (c: Client | null) => {
    setClient(c);
    setClientQ("");
    if (c) changePriceType(c.type === "mayorista" ? "mayor" : "detal");
  };

  const clientMatches = clientQ.trim()
    ? clients.filter((c) => `${c.name} ${c.docId}`.toLowerCase().includes(clientQ.toLowerCase())).slice(0, 6)
    : [];

  const clear = () => {
    setCart([]);
    setClient(null);
    setDiscount("");
    changePriceType("detal");
  };

  return (
    <div className="grid gap-4 pb-24 lg:grid-cols-[1fr_400px] lg:pb-0">
      {/* Catálogo */}
      <section className="min-w-0 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar por modelo, código, color…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["Todas", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cx(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition",
                cat === c ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Spinner /></div>
        ) : list.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {list.map((p) => {
              const st = totalStock(p.sizes);
              return (
                <button
                  key={p.id}
                  onClick={() => (st > 0 ? setPicking(p) : toast("Producto sin existencia", "error"))}
                  className={cx("card group flex flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-md", st === 0 && "opacity-50")}
                >
                  <div className="flex h-24 items-center justify-center bg-gradient-to-br from-brand-50 to-rose-50 dark:from-brand-900/20 dark:to-rose-900/20">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Footprints className="h-9 w-9 text-brand-300 transition group-hover:scale-110" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{p.color} · {p.sku}</p>
                    <div className="mt-auto flex items-end justify-between pt-2">
                      <div>
                        <p className="font-bold text-brand-700 dark:text-brand-400">{fmtUSD(priceType === "mayor" ? p.wholesalePriceUSD || p.priceUSD : p.priceUSD)}</p>
                        <p className="text-[11px] text-slate-500">{fmtBs((priceType === "mayor" ? p.wholesalePriceUSD || p.priceUSD : p.priceUSD) * rate.rate)}</p>
                      </div>
                      <Badge tone={st === 0 ? "red" : st <= p.minStock ? "amber" : "green"}>{st}</Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="card"><Empty text="No se encontraron productos" /></div>
        )}
      </section>

      {/* Carrito */}
      <aside id="cart" className="card flex h-fit flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="h-5 w-5 text-brand-600" /> Venta actual
            {pairs > 0 && <Badge tone="brand">{pairs} pares</Badge>}
          </h2>
          {cart.length > 0 && (
            <button className="btn-ghost btn-sm text-red-500" onClick={clear}>
              Vaciar
            </button>
          )}
        </div>

        <div className="space-y-3 border-b px-4 py-3">
          {client ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{client.name}</p>
                <p className="text-xs text-slate-500">{client.docId} · {client.type === "mayorista" ? "Mayorista" : "Detal"}</p>
              </div>
              <button className="btn-icon btn-ghost" onClick={() => pickClient(null)} aria-label="Quitar cliente">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex gap-2">
                <input className="input" placeholder="Cliente (nombre o cédula)…" value={clientQ} onChange={(e) => setClientQ(e.target.value)} />
                <button className="btn-secondary px-3" onClick={() => setNewClient(true)} title="Nuevo cliente" aria-label="Nuevo cliente">
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
              {clientMatches.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg dark:bg-slate-800">
                  {clientMatches.map((c) => (
                    <li key={c.id}>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => pickClient(c)}>
                        {c.name} <span className="text-xs text-slate-500">{c.docId}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Tabs
            value={priceType}
            onChange={changePriceType}
            tabs={[
              { value: "detal", label: "Precio detal" },
              { value: "mayor", label: "Precio mayor" },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length ? (
            <ul className="divide-y dark:divide-slate-800">
              {cart.map((i, k) => (
                <li key={i.productId + i.size} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-slate-500">Talla {i.size} · {fmtUSD(i.priceUSD)} c/u</p>
                    </div>
                    <button className="text-slate-400 hover:text-red-500" onClick={() => setCart(cart.filter((_, x) => x !== k))} aria-label="Quitar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border dark:border-slate-700">
                      <button className="px-2 py-1" onClick={() => setQty(k, i.qty - 1)} aria-label="Menos"><Minus className="h-3.5 w-3.5" /></button>
                      <input
                        className="w-10 bg-transparent text-center text-sm outline-none"
                        value={i.qty}
                        onChange={(e) => setQty(k, parseInt(e.target.value) || 1)}
                      />
                      <button className="px-2 py-1" onClick={() => setQty(k, i.qty + 1)} aria-label="Más"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="text-xs text-slate-400">máx {i.stock}</span>
                    <span className="font-semibold">{fmtUSD(i.subtotalUSD)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Agrega productos desde el catálogo" icon={ShoppingCart} />
          )}
        </div>

        <div className="space-y-2 border-t px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-slate-500">Descuento</span>
            <input className="input w-24 py-1 text-right" inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <select className="input w-16 py-1" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as "usd" | "pct")}>
              <option value="usd">$</option>
              <option value="pct">%</option>
            </select>
          </div>
          <Line k="Subtotal" v={fmtUSD(preview.subtotal)} />
          {preview.discount > 0 && <Line k="Descuento" v={`- ${fmtUSD(preview.discount)}`} />}
          {preview.iva > 0 && <Line k={`IVA ${settings.ivaPct}%`} v={fmtUSD(preview.iva)} />}
          <div className="flex items-end justify-between pt-1">
            <span className="font-semibold">Total</span>
            <div className="text-right">
              <p className="text-2xl font-bold">{fmtUSD(preview.total)}</p>
              <p className="text-sm font-medium text-emerald-600">{fmtBs(preview.total * rate.rate)}</p>
            </div>
          </div>
          {settings.igtfEnabled && (
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              <Info className="h-3 w-3" /> Pagos en divisas generan IGTF {settings.igtfPct}%
            </p>
          )}
          <button className="btn-primary w-full py-3 text-base" disabled={!cart.length || !rate.rate} onClick={() => setPayOpen(true)}>
            <CreditCard className="h-5 w-5" /> Cobrar
          </button>
          {!rate.rate && <p className="text-center text-xs text-red-500">Sin tasa BCV. Configúrala manualmente en Configuración.</p>}
        </div>
      </aside>

      {/* Barra móvil */}
      {cart.length > 0 && (
        <div className="no-print fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t bg-white p-3 shadow-lg dark:bg-slate-900 lg:hidden">
          <div>
            <p className="text-lg font-bold">{fmtUSD(preview.total)}</p>
            <p className="text-xs text-emerald-600">{fmtBs(preview.total * rate.rate)}</p>
          </div>
          <a href="#cart" className="btn-secondary">Ver carrito ({pairs})</a>
          <button className="btn-primary" disabled={!rate.rate} onClick={() => setPayOpen(true)}>Cobrar</button>
        </div>
      )}

      <SizePicker product={picking} onClose={() => setPicking(null)} onAdd={addToCart} />
      <ClientFormModal open={newClient} onClose={() => setNewClient(false)} onSaved={(c) => pickClient(c)} />
      {payOpen && (
        <PaymentModal
          cart={cart}
          discountUSD={discountUSD}
          client={client}
          priceType={priceType}
          onClose={() => setPayOpen(false)}
          onDone={async (id) => {
            setPayOpen(false);
            clear();
            const s = await db.getDoc<Sale>("sales", id);
            setReceipt(s);
          }}
        />
      )}
      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

const Line = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between text-slate-600 dark:text-slate-300">
    <span>{k}</span>
    <span>{v}</span>
  </div>
);

function SizePicker({
  product,
  onClose,
  onAdd,
}: {
  product: Product | null;
  onClose: () => void;
  onAdd: (p: Product, size: string, qty: number) => void;
}) {
  const [sel, setSel] = useState<Record<string, number>>({});
  if (!product) return null;
  const sizes = sortSizes(Object.keys(product.sizes));
  const total = Object.values(sel).reduce((a, b) => a + b, 0);
  const close = () => {
    setSel({});
    onClose();
  };
  return (
    <Modal
      open
      onClose={close}
      title={product.name}
      footer={
        <>
          <button className="btn-secondary" onClick={close}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={!total}
            onClick={() => {
              Object.entries(sel).forEach(([z, q]) => q > 0 && onAdd(product, z, q));
              close();
            }}
          >
            Agregar {total > 0 && `(${total})`}
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-500">
        {product.color} · {product.material} · Selecciona tallas y cantidades
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {sizes.map((z) => {
          const st = Number(product.sizes[z] ?? 0);
          const q = sel[z] ?? 0;
          return (
            <div key={z} className={cx("rounded-xl border-2 p-2 text-center transition", q > 0 ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-200 dark:border-slate-700", st === 0 && "opacity-40")}>
              <button disabled={st === 0} className="w-full" onClick={() => setSel({ ...sel, [z]: Math.min(st, q + 1) })}>
                <p className="text-lg font-bold">{z}</p>
                <p className="text-[11px] text-slate-500">{st} disp.</p>
              </button>
              {q > 0 && (
                <div className="mt-1 flex items-center justify-center gap-2">
                  <button onClick={() => setSel({ ...sel, [z]: q - 1 })} className="rounded bg-white px-1.5 dark:bg-slate-700" aria-label="Menos"><Minus className="h-3 w-3" /></button>
                  <span className="text-sm font-semibold">{q}</span>
                  <button onClick={() => setSel({ ...sel, [z]: Math.min(st, q + 1) })} className="rounded bg-white px-1.5 dark:bg-slate-700" aria-label="Más"><Plus className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function PaymentModal({
  cart,
  discountUSD,
  client,
  priceType,
  onClose,
  onDone,
}: {
  cart: CartItem[];
  discountUSD: number;
  client: Client | null;
  priceType: "detal" | "mayor";
  onClose: () => void;
  onDone: (saleId: string) => void;
}) {
  const { user, settings, rate } = useApp();
  const toast = useToast();
  const [drafts, setDrafts] = useState<DraftPayment[]>([]);
  const [credit, setCredit] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const payments = drafts.map((d) => draftToPayment(d, rate.rate)).filter((p) => p.amount > 0);
  const t = computeTotals(cart, discountUSD, settings, payments);

  const add = (m: PaymentMethod) => {
    const tmp = computeTotals(cart, discountUSD, settings, payments);
    const amt = suggestAmount(tmp, m, rate.rate);
    setDrafts([...drafts, { key: Date.now(), method: m, amount: amt ? String(amt) : "", reference: "", bank: "" }]);
  };

  const fill = (k: number) => {
    const others = drafts.filter((d) => d.key !== k).map((d) => draftToPayment(d, rate.rate)).filter((p) => p.amount > 0);
    const tmp = computeTotals(cart, discountUSD, settings, others);
    setDrafts(drafts.map((d) => (d.key === k ? { ...d, amount: String(suggestAmount(tmp, d.method, rate.rate)) } : d)));
  };

  const confirm = async () => {
    const missingRef = drafts.find((d) => parseNum(d.amount) > 0 && PAYMENT_METHODS[d.method].needsRef && !d.reference.trim());
    if (missingRef) return toast(`Indica la referencia de ${PAYMENT_METHODS[missingRef.method].label}`, "error");
    setBusy(true);
    try {
      const res = await createSale({
        items: cart.map(({ stock: _s, detalPrice: _d, mayorPrice: _m, ...i }) => i),
        discountUSD,
        payments,
        rate: rate.rate,
        settings,
        client: client ? { id: client.id, name: client.name, docId: client.docId } : { name: "Cliente Contado" },
        priceType,
        allowCredit: credit,
        notes: notes.trim() || undefined,
        user: user!,
      });
      toast(`Venta #${res.number} registrada`);
      onDone(res.id);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const canConfirm = t.balance < 0.01 || (credit && !!client);

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar pago"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Volver</button>
          <button className="btn-success" disabled={!canConfirm || busy} onClick={confirm}>
            {busy && <Spinner className="h-4 w-4 text-white" />}
            {t.balance >= 0.01 ? "Registrar a crédito" : "Confirmar venta"}
          </button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <div>
            <p className="label">Agregar método de pago</p>
            <MethodButtons onPick={add} />
          </div>
          {drafts.map((d) => (
            <PaymentRow
              key={d.key}
              d={d}
              rate={rate.rate}
              onChange={(n) => setDrafts(drafts.map((x) => (x.key === d.key ? n : x)))}
              onRemove={() => setDrafts(drafts.filter((x) => x.key !== d.key))}
              onFill={() => fill(d.key)}
            />
          ))}
          {!drafts.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800">Selecciona uno o varios métodos (pago mixto).</p>}
          <Field label="Notas (opcional)">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
          <Line k="Subtotal" v={fmtUSD(t.subtotal)} />
          {t.discount > 0 && <Line k="Descuento" v={`- ${fmtUSD(t.discount)}`} />}
          {t.iva > 0 && <Line k={`IVA ${settings.ivaPct}%`} v={fmtUSD(t.iva)} />}
          {t.igtf > 0 && <Line k={`IGTF ${settings.igtfPct}%`} v={fmtUSD(t.igtf)} />}
          <div className="border-t pt-2 dark:border-slate-700">
            <p className="text-xs text-slate-500">Total a pagar</p>
            <p className="text-2xl font-bold">{fmtUSD(t.total)}</p>
            <p className="font-semibold text-emerald-600">{fmtBs(t.total * rate.rate)}</p>
            <p className="text-[11px] text-slate-500">Tasa BCV Bs {fmtNum(rate.rate)}</p>
          </div>
          <div className="border-t pt-2 dark:border-slate-700">
            <Line k="Pagado" v={fmtUSD(t.paid)} />
            {t.balance >= 0.01 ? (
              <div className="mt-2 rounded-xl bg-amber-100 p-2 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                <p className="text-xs">Falta por pagar</p>
                <p className="text-lg font-bold">{fmtUSD(t.balance)}</p>
                <p className="text-xs">{fmtBs(t.balance * rate.rate)}</p>
              </div>
            ) : t.change > 0 ? (
              <div className="mt-2 rounded-xl bg-emerald-100 p-2 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                <p className="text-xs">Vuelto</p>
                <p className="text-lg font-bold">{fmtUSD(t.change)}</p>
                <p className="text-xs">{fmtBs(t.change * rate.rate)}</p>
              </div>
            ) : (
              <div className="mt-2 rounded-xl bg-emerald-100 p-2 text-center font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                ✓ Pago completo
              </div>
            )}
          </div>
          {t.balance >= 0.01 && (
            <label className="flex items-start gap-2 pt-2 text-xs">
              <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} className="mt-0.5" />
              <span>
                Venta a crédito (dejar saldo pendiente)
                {!client && <span className="block text-red-500">Requiere seleccionar un cliente</span>}
              </span>
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}
