"use client";
import { useState } from "react";
import Sheet from "@/components/Sheet";
import { Badge, Empty, ErrorBox, Field, LoadError, PageTitle, Skeleton, Tabs } from "@/components/ui";
import { tracksInventory } from "@/lib/business";
import { errMsg } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { cleanPhone, parseNum } from "@/lib/nums";
import type { Product, Supplier } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { useWorkspace } from "@/lib/workspace";

type Tab = "products" | "suppliers";
type Mode = null | { kind: "product"; p?: Product } | { kind: "buy"; p: Product } | { kind: "adjust"; p: Product } | { kind: "supplier"; s?: Supplier };

export default function InventoryPage() {
  const { t, num, date } = useI18n();
  const { supabase, ws, canManage, money, today } = useWorkspace();
  const [tab, setTab] = useState<Tab>("products");
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [paidNow, setPaidNow] = useState(true);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const { data, loading, error: loadErr, reload } = useLoad(async () => {
    const [p, s] = await Promise.all([
      supabase.from("products").select("*").eq("workspace_id", ws.id).order("name").limit(1000),
      supabase.from("suppliers").select("*").eq("workspace_id", ws.id).order("name").limit(500),
    ]);
    if (p.error) throw p.error;
    if (s.error) throw s.error;
    return { products: (p.data ?? []) as Product[], suppliers: (s.data ?? []) as Supplier[] };
  }, [ws.id]);

  function openMode(m: Mode) {
    setError("");
    setPaidNow(true);
    if (m?.kind === "product") {
      const p = m.p;
      setF({
        name: p?.name ?? "",
        sku: p?.sku ?? "",
        unit: p?.unit ?? "pcs",
        kind: p?.kind ?? (tracksInventory(ws.business_type) ? "product" : "service"),
        cost: String(p?.cost_price ?? ""),
        price: String(p?.sell_price ?? ""),
        stock: String(p?.stock_qty ?? ""),
        reorder: String(p?.reorder_level ?? ""),
        supplier: p?.supplier_id ?? "",
      });
    } else if (m?.kind === "buy") setF({ qty: "", cost: String(m.p.cost_price || ""), supplier: m.p.supplier_id ?? "", due: "", note: "" });
    else if (m?.kind === "adjust") setF({ qty: String(m.p.stock_qty), note: "" });
    else if (m?.kind === "supplier") setF({ name: m.s?.name ?? "", phone: m.s?.phone ?? "", note: m.s?.note ?? "" });
    setMode(m);
  }

  const n = (k: string, empty = 0) => (f[k]?.trim() ? parseNum(f[k]) : empty);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mode) return;
    setError("");
    setBusy(true);
    let err: unknown = null;
    try {
      if (mode.kind === "product") {
        if (!f.name?.trim()) throw new Error("name");
        const cost = n("cost");
        const price = n("price");
        const stock = n("stock");
        const reorder = n("reorder");
        if (![cost, price, stock, reorder].every((x) => Number.isFinite(x) && x >= 0)) throw new Error("num");
        const row = {
          name: f.name.trim(),
          sku: (f.sku ?? "").trim(),
          unit: (f.unit ?? "pcs").trim() || "pcs",
          kind: f.kind === "service" ? "service" : "product",
          cost_price: cost,
          sell_price: price,
          reorder_level: reorder,
          supplier_id: f.supplier || null,
        };
        if (mode.p) {
          // stock of an existing product changes only through purchases/adjustments so history stays correct
          ({ error: err } = await supabase.from("products").update(row).eq("id", mode.p.id));
        } else {
          ({ error: err } = await supabase.from("products").insert({ ...row, workspace_id: ws.id, stock_qty: row.kind === "product" ? stock : 0 }));
        }
      } else if (mode.kind === "buy") {
        const qty = n("qty", NaN);
        const cost = n("cost", NaN);
        if (!(qty > 0) || !(cost > 0)) throw new Error("num");
        ({ error: err } = await supabase.rpc("purchase_stock", {
          p_ws: ws.id,
          p_product: mode.p.id,
          p_qty: qty,
          p_unit_cost: cost,
          p_supplier: f.supplier || null,
          p_paid: paidNow,
          p_date: today(),
          p_due_date: !paidNow && f.due ? f.due : null,
          p_note: (f.note ?? "").trim(),
        }));
      } else if (mode.kind === "adjust") {
        const q = n("qty", NaN);
        if (!(q >= 0)) throw new Error("num");
        ({ error: err } = await supabase.rpc("adjust_stock", { p_product: mode.p.id, p_new_qty: q, p_note: (f.note ?? "").trim() }));
      } else {
        if (!f.name?.trim()) throw new Error("name");
        const row = { name: f.name.trim(), phone: cleanPhone(f.phone ?? ""), note: (f.note ?? "").trim() };
        ({ error: err } = mode.s
          ? await supabase.from("suppliers").update(row).eq("id", mode.s.id)
          : await supabase.from("suppliers").insert({ ...row, workspace_id: ws.id }));
      }
    } catch (x) {
      err = x;
      if (x instanceof Error && (x.message === "name" || x.message === "num")) {
        setBusy(false);
        return setError(x.message === "name" ? t("inv.errName") : t("sale.errAmount"));
      }
    }
    setBusy(false);
    if (err) return setError(errMsg(err, t));
    setMode(null);
    reload();
  }

  async function removeProduct(p: Product) {
    if (!window.confirm(t("inv.confirmDelete"))) return;
    // products already used in orders cannot be deleted by the database; deactivate instead
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      const { error: e2 } = await supabase.from("products").update({ active: false }).eq("id", p.id);
      if (e2) return setError(errMsg(e2, t));
    }
    reload();
  }

  const products = data?.products ?? [];
  const title =
    mode?.kind === "product" ? (mode.p ? t("common.edit") : t("inv.addProduct")) : mode?.kind === "buy" ? t("inv.buy") : mode?.kind === "adjust" ? t("inv.adjust") : mode?.kind === "supplier" ? t("inv.supplier") : "";

  return (
    <>
      <PageTitle
        title={t("inv.title")}
        right={
          canManage && (
            <button type="button" className="btn btn-primary" onClick={() => openMode(tab === "products" ? { kind: "product" } : { kind: "supplier" })}>
              + {tab === "products" ? t("inv.addProduct") : t("inv.addSupplier")}
            </button>
          )
        }
      />
      <Tabs value={tab} onChange={setTab} items={[{ id: "products", label: t("inv.products") }, { id: "suppliers", label: t("inv.suppliers") }]} />
      <ErrorBox message={mode ? "" : error} />

      {loading && !data ? (
        <Skeleton />
      ) : loadErr || !data ? (
        <LoadError onRetry={reload} />
      ) : tab === "products" ? (
        products.length === 0 ? (
          <Empty title={t("inv.emptyTitle")} text={t("inv.emptyText")} />
        ) : (
          <ul className="space-y-2">
            {products.map((p) => {
              const low = p.kind === "product" && p.active && p.stock_qty <= p.reorder_level;
              return (
                <li key={p.id} className="card space-y-2 !p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold">{p.name}</div>
                      <div className="text-xs text-muted">{p.sku || "—"}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold">{money(Number(p.sell_price))}</div>
                      {canManage && <div className="text-xs text-muted">{t("inv.costN", { amt: money(Number(p.cost_price)) })}</div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {p.kind === "product" ? (
                      <Badge tone={p.stock_qty <= 0 ? "bad" : low ? "warn" : "good"}>
                        {t("inv.stockN", { n: num(Number(p.stock_qty), 2), unit: p.unit })}
                      </Badge>
                    ) : (
                      <Badge>{t("inv.service")}</Badge>
                    )}
                    {!p.active && <Badge tone="bad">{t("inv.inactive")}</Badge>}
                    {low && p.stock_qty > 0 && <span className="text-xs text-warn">{t("inv.low")}</span>}
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      {p.kind === "product" && (
                        <>
                          <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={() => openMode({ kind: "buy", p })}>
                            {t("inv.buy")}
                          </button>
                          <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={() => openMode({ kind: "adjust", p })}>
                            {t("inv.adjust")}
                          </button>
                        </>
                      )}
                      <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={() => openMode({ kind: "product", p })}>
                        {t("common.edit")}
                      </button>
                      <button type="button" className="btn btn-danger !py-1.5 text-sm" onClick={() => void removeProduct(p)}>
                        {t("common.delete")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : data.suppliers.length === 0 ? (
        <Empty title={t("inv.noSuppliers")} />
      ) : (
        <ul className="space-y-2">
          {data.suppliers.map((s) => (
            <li key={s.id} className="card flex items-center justify-between !p-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{s.name}</div>
                <div className="text-sm text-muted">{s.phone || "—"}</div>
              </div>
              {canManage && (
                <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={() => openMode({ kind: "supplier", s })}>
                  {t("common.edit")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">{date(today())}</p>

      <Sheet open={!!mode} onClose={() => setMode(null)} title={title}>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {mode?.kind === "product" && (
            <>
              <Field label={t("inv.name")} htmlFor="pn">
                <input id="pn" className="input" value={f.name ?? ""} maxLength={160} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("inv.kind")} htmlFor="pk">
                  <select id="pk" className="input" value={f.kind} disabled={!!mode.p} onChange={(e) => set("kind", e.target.value)}>
                    <option value="product">{t("inv.physical")}</option>
                    <option value="service">{t("inv.service")}</option>
                  </select>
                </Field>
                <Field label="SKU" htmlFor="ps">
                  <input id="ps" className="input" value={f.sku ?? ""} maxLength={60} onChange={(e) => set("sku", e.target.value)} />
                </Field>
                <Field label={t("inv.cost")} htmlFor="pc">
                  <input id="pc" className="input" inputMode="decimal" value={f.cost ?? ""} onChange={(e) => set("cost", e.target.value)} />
                </Field>
                <Field label={t("inv.price")} htmlFor="pp">
                  <input id="pp" className="input" inputMode="decimal" value={f.price ?? ""} onChange={(e) => set("price", e.target.value)} />
                </Field>
                {!mode.p && f.kind !== "service" && (
                  <Field label={t("inv.openingStock")} htmlFor="pst">
                    <input id="pst" className="input" inputMode="decimal" value={f.stock ?? ""} onChange={(e) => set("stock", e.target.value)} />
                  </Field>
                )}
                {f.kind !== "service" && (
                  <Field label={t("inv.reorderLevel")} htmlFor="pr">
                    <input id="pr" className="input" inputMode="decimal" value={f.reorder ?? ""} onChange={(e) => set("reorder", e.target.value)} />
                  </Field>
                )}
                <Field label={t("inv.unit")} htmlFor="pu">
                  <input id="pu" className="input" value={f.unit ?? ""} maxLength={20} onChange={(e) => set("unit", e.target.value)} />
                </Field>
              </div>
              <Field label={t("inv.supplier")} htmlFor="psu">
                <select id="psu" className="input" value={f.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)}>
                  <option value="">—</option>
                  {data?.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {mode?.kind === "buy" && (
            <>
              <p className="text-sm text-muted">{mode.p.name}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("sale.qty")} htmlFor="bq">
                  <input id="bq" className="input" inputMode="decimal" value={f.qty ?? ""} onChange={(e) => set("qty", e.target.value)} />
                </Field>
                <Field label={t("inv.unitCost")} htmlFor="bc">
                  <input id="bc" className="input" inputMode="decimal" value={f.cost ?? ""} onChange={(e) => set("cost", e.target.value)} />
                </Field>
              </div>
              <Field label={t("inv.supplier")} htmlFor="bs">
                <select id="bs" className="input" value={f.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)}>
                  <option value="">—</option>
                  {data?.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} />
                {t("inv.paidNow")}
              </label>
              {!paidNow && (
                <Field label={t("inv.dueDate")} htmlFor="bd">
                  <input id="bd" className="input" type="date" value={f.due ?? ""} onChange={(e) => set("due", e.target.value)} />
                </Field>
              )}
              <p className="text-xs text-muted">{t("inv.buyNote")}</p>
            </>
          )}
          {mode?.kind === "adjust" && (
            <>
              <p className="text-sm text-muted">{mode.p.name}</p>
              <Field label={t("inv.newQty")} htmlFor="aq">
                <input id="aq" className="input" inputMode="decimal" value={f.qty ?? ""} onChange={(e) => set("qty", e.target.value)} />
              </Field>
              <Field label={t("sale.note")} htmlFor="an">
                <input id="an" className="input" value={f.note ?? ""} maxLength={300} onChange={(e) => set("note", e.target.value)} />
              </Field>
            </>
          )}
          {mode?.kind === "supplier" && (
            <>
              <Field label={t("inv.name")} htmlFor="sn">
                <input id="sn" className="input" value={f.name ?? ""} maxLength={120} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label={t("cust.phone")} htmlFor="sp">
                <input id="sp" className="input" inputMode="tel" value={f.phone ?? ""} maxLength={30} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label={t("cust.note")} htmlFor="sno">
                <input id="sno" className="input" value={f.note ?? ""} maxLength={500} onChange={(e) => set("note", e.target.value)} />
              </Field>
            </>
          )}
          <ErrorBox message={error} />
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? t("common.wait") : t("common.save")}
          </button>
        </form>
      </Sheet>
    </>
  );
}
