"use client";
import { useMemo, useState } from "react";
import { ErrorBox, Field } from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { parseNum } from "@/lib/nums";
import type { Customer, Product } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

interface Line {
  key: number;
  product_id: string;
  name: string;
  qty: string;
  price: string;
}

export default function OrderForm({ customers, products, onSaved }: { customers: Customer[]; products: Product[]; onSaved: () => void }) {
  const { t } = useI18n();
  const { supabase, ws, money, today, canFinance } = useWorkspace();
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 1, product_id: "", name: "", qty: "1", price: "" }]);
  const [discount, setDiscount] = useState("");
  const [shipping, setShipping] = useState("");
  const [paid, setPaid] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sellable = useMemo(() => products.filter((p) => p.active), [products]);

  function setLine(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function pick(key: number, id: string) {
    const p = sellable.find((x) => x.id === id);
    setLine(key, p ? { product_id: id, name: p.name, price: String(p.sell_price) } : { product_id: "", name: "", price: "" });
  }

  const num = (s: string) => (s.trim() === "" ? 0 : parseNum(s));
  const subtotal = lines.reduce((a, l) => {
    const q = num(l.qty);
    const p = num(l.price);
    return a + (Number.isFinite(q) && Number.isFinite(p) ? Math.round(q * p * 100) / 100 : 0);
  }, 0);
  const total = subtotal - (num(discount) || 0) + (num(shipping) || 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const items: { product_id?: string; name: string; qty: number; unit_price: number }[] = [];
    for (const l of lines) {
      const q = num(l.qty);
      const p = num(l.price);
      if (!l.product_id && !l.name.trim()) continue;
      if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p < 0) return setError(t("sale.errItem"));
      items.push({ ...(l.product_id ? { product_id: l.product_id } : {}), name: l.name.trim() || "Item", qty: q, unit_price: p });
    }
    if (items.length === 0) return setError(t("sale.errNoItems"));
    const d = num(discount);
    const s = num(shipping);
    const pd = num(paid);
    if (![d, s, pd].every((x) => Number.isFinite(x) && x >= 0)) return setError(t("sale.errAmount"));
    if (total < 0) return setError(t("err.discount"));
    if (pd > total) return setError(t("err.overpay"));
    setBusy(true);
    const { error: err } = await supabase.rpc("create_order", {
      p_ws: ws.id,
      p_customer: customer || null,
      p_items: items,
      p_discount: d,
      p_shipping: s,
      p_paid: pd,
      p_status: status,
      p_date: date,
      p_note: note.trim(),
    });
    setBusy(false);
    if (err) return setError(errMsg(err, t));
    onSaved();
  }

  return (
    <form onSubmit={save} className="space-y-3" noValidate>
      <Field label={t("sale.customer")} htmlFor="oc">
        <select id="oc" className="input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
          <option value="">{t("sale.walkIn")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` · ${c.phone}` : ""}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-3">
        {lines.map((l, i) => (
          <div key={l.key} className="space-y-2 rounded-xl border border-line p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>
                {t("sale.item")} {i + 1}
              </span>
              {lines.length > 1 && (
                <button type="button" className="text-danger" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                  {t("common.remove")}
                </button>
              )}
            </div>
            <select className="input" value={l.product_id} onChange={(e) => pick(l.key, e.target.value)} aria-label={t("sale.product")}>
              <option value="">{t("sale.custom")}</option>
              {sellable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.kind === "product" ? ` (${p.stock_qty})` : ""}
                </option>
              ))}
            </select>
            {!l.product_id && (
              <input className="input" placeholder={t("sale.itemName")} value={l.name} maxLength={160} onChange={(e) => setLine(l.key, { name: e.target.value })} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <input className="input" inputMode="decimal" placeholder={t("sale.qty")} aria-label={t("sale.qty")} value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} />
              <input className="input" inputMode="decimal" placeholder={t("sale.price")} aria-label={t("sale.price")} value={l.price} onChange={(e) => setLine(l.key, { price: e.target.value })} />
            </div>
          </div>
        ))}
        {lines.length < 50 && (
          <button type="button" className="btn btn-ghost w-full" onClick={() => setLines((ls) => [...ls, { key: Date.now(), product_id: "", name: "", qty: "1", price: "" }])}>
            + {t("sale.addItem")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("sale.discount")} htmlFor="od">
          <input id="od" className="input" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </Field>
        <Field label={t("sale.shipping")} htmlFor="os">
          <input id="os" className="input" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </Field>
        <Field label={t("sale.paid")} htmlFor="op">
          <input id="op" className="input" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} />
        </Field>
        <Field label={t("sale.date")} htmlFor="odt">
          <input id="odt" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label={t("sale.status")} htmlFor="ost">
        <select id="ost" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["pending", "confirmed", "shipped", "delivered"].map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("sale.note")} htmlFor="on">
        <input id="on" className="input" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="rounded-xl bg-brand-soft p-3 text-sm">
        <div className="flex justify-between">
          <span>{t("sale.subtotal")}</span>
          <span>{money(subtotal)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>{t("sale.total")}</span>
          <span>{money(total)}</span>
        </div>
        {canFinance && <div className="mt-1 text-xs text-muted">{t("sale.dueN", { amt: money(Math.max(0, total - (num(paid) || 0))) })}</div>}
      </div>

      <ErrorBox message={error} />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? t("common.wait") : t("sale.save")}
      </button>
    </form>
  );
}
