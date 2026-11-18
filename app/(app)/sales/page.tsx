"use client";
import { useState } from "react";
import OrderForm from "@/components/OrderForm";
import Sheet from "@/components/Sheet";
import { Badge, Empty, ErrorBox, Field, LoadError, PageTitle, Skeleton, Tabs } from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { parseNum } from "@/lib/nums";
import type { Customer, Order, OrderStatus, Product } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { useWorkspace } from "@/lib/workspace";

type Filter = "all" | "open" | "due";
const NEXT: Record<string, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export default function SalesPage() {
  const { t, date } = useI18n();
  const { supabase, ws, canWrite, canManage, money, today } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [pay, setPay] = useState<Order | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const [o, c, p] = await Promise.all([
      supabase.from("orders").select("*").eq("workspace_id", ws.id).order("order_date", { ascending: false }).order("created_at", { ascending: false }).limit(300),
      supabase.from("customers").select("*").eq("workspace_id", ws.id).order("name").limit(1000),
      supabase.from("products").select("*").eq("workspace_id", ws.id).eq("active", true).order("name").limit(1000),
    ]);
    if (o.error) throw o.error;
    if (c.error) throw c.error;
    if (p.error) throw p.error;
    return { orders: (o.data ?? []) as Order[], customers: (c.data ?? []) as Customer[], products: (p.data ?? []) as Product[] };
  }, [ws.id]);

  async function setStatus(o: Order, s: OrderStatus) {
    const warn = s === "cancelled" || s === "returned" ? t("sale.confirmCancel") : null;
    if (warn && !window.confirm(warn)) return;
    setErr("");
    const { error } = await supabase.rpc("set_order_status", { p_order: o.id, p_status: s });
    if (error) return setErr(errMsg(error, t));
    reload();
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!pay) return;
    const amt = parseNum(payAmt);
    if (!Number.isFinite(amt) || amt <= 0) return setErr(t("sale.errAmount"));
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc("add_order_payment", { p_order: pay.id, p_amount: amt, p_date: today() });
    setBusy(false);
    if (error) return setErr(errMsg(error, t));
    setPay(null);
    setPayAmt("");
    reload();
  }

  const nameOf = (id: string | null) => (id ? data?.customers.find((c) => c.id === id)?.name ?? "—" : t("sale.walkIn"));
  const orders = (data?.orders ?? []).filter((o) => {
    if (filter === "open") return o.status === "pending" || o.status === "confirmed" || o.status === "shipped";
    if (filter === "due") return o.status !== "cancelled" && o.status !== "returned" && Number(o.paid_amount) < Number(o.total);
    return true;
  });

  return (
    <>
      <PageTitle
        title={t("sale.title")}
        right={
          canWrite && (
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              + {t("sale.new")}
            </button>
          )
        }
      />
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: t("cust.fAll") },
          { id: "open", label: t("sale.fOpen") },
          { id: "due", label: t("sale.fDue") },
        ]}
      />
      <ErrorBox message={err} />
      {loading && !data ? (
        <Skeleton />
      ) : error || !data ? (
        <LoadError onRetry={reload} />
      ) : orders.length === 0 ? (
        <Empty
          title={data.orders.length ? t("common.noResults") : t("sale.emptyTitle")}
          text={data.orders.length ? undefined : t("sale.emptyText")}
          action={canWrite && !data.orders.length ? <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>{t("sale.new")}</button> : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => {
            const due = Number(o.total) - Number(o.paid_amount);
            const closed = o.status === "cancelled" || o.status === "returned";
            return (
              <li key={o.id} className="card space-y-2 !p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{nameOf(o.customer_id)}</div>
                    <div className="text-xs text-muted">{date(o.order_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{money(Number(o.total))}</div>
                    <Badge tone={closed ? "bad" : o.status === "delivered" ? "good" : "default"}>{t(`status.${o.status}`)}</Badge>
                  </div>
                </div>
                {!closed && due > 0 && <div className="text-sm text-warn">{t("sale.dueN", { amt: money(due) })}</div>}
                {canWrite && !closed && (
                  <div className="flex flex-wrap gap-2">
                    {canManage && due > 0 && (
                      <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={() => { setPay(o); setPayAmt(String(due)); setErr(""); }}>
                        {t("sale.addPayment")}
                      </button>
                    )}
                    {NEXT[o.status].filter((s) => canManage || s !== "returned").map((s) => (
                      <button key={s} type="button" className={`btn !py-1.5 text-sm ${s === "cancelled" || s === "returned" ? "btn-danger" : "btn-ghost"}`} onClick={() => void setStatus(o, s)}>
                        {t(`status.to.${s}`)}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data && data.orders.length >= 300 && <p className="text-xs text-muted">{t("sale.limit300")}</p>}

      <Sheet open={open} onClose={() => setOpen(false)} title={t("sale.new")}>
        {data && (
          <OrderForm
            customers={data.customers}
            products={data.products}
            onSaved={() => {
              setOpen(false);
              reload();
            }}
          />
        )}
      </Sheet>
      <Sheet open={!!pay} onClose={() => setPay(null)} title={t("sale.addPayment")}>
        <form onSubmit={addPayment} className="space-y-3" noValidate>
          <Field label={t("sale.amount")} htmlFor="pa">
            <input id="pa" className="input" inputMode="decimal" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
          </Field>
          <ErrorBox message={err} />
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? t("common.wait") : t("common.save")}
          </button>
        </form>
      </Sheet>
    </>
  );
}
