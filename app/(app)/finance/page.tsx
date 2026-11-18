"use client";
import { useState } from "react";
import { BarChart } from "@/components/charts";
import Sheet from "@/components/Sheet";
import { Badge, Empty, ErrorBox, Field, LoadError, PageTitle, Skeleton, Stat, Tabs } from "@/components/ui";
import type { Summary } from "@/lib/calc";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/business";
import { errMsg } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { parseNum } from "@/lib/nums";
import type { Customer, Order, Txn } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { useWorkspace } from "@/lib/workspace";

type Tab = "overview" | "txns" | "recv" | "pay";

export default function FinancePage() {
  const { t, date, num } = useI18n();
  const { supabase, ws, canFinance, money, today } = useWorkspace();
  const [tab, setTab] = useState<Tab>("overview");
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("other");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(today());
  const [status, setStatus] = useState<"paid" | "due">("paid");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const { data, loading, error, reload } = useLoad(async () => {
    const r = await fetch(`/api/summary?today=${today()}`, { cache: "no-store" });
    if (!r.ok) throw new Error("load");
    const summary = ((await r.json()) as { summary: Summary }).summary;
    const [tx, o, c] = await Promise.all([
      supabase.from("transactions").select("*").eq("workspace_id", ws.id).order("tx_date", { ascending: false }).order("created_at", { ascending: false }).limit(300),
      supabase.from("orders").select("*").eq("workspace_id", ws.id).not("status", "in", "(cancelled,returned)").order("order_date").limit(1000),
      supabase.from("customers").select("id,name").eq("workspace_id", ws.id).limit(1000),
    ]);
    if (tx.error) throw tx.error;
    if (o.error) throw o.error;
    if (c.error) throw c.error;
    return { summary, txns: (tx.data ?? []) as Txn[], orders: (o.data ?? []) as Order[], customers: (c.data ?? []) as Pick<Customer, "id" | "name">[] };
  }, [ws.id]);

  if (!canFinance) return <Empty title={t("err.forbidden")} />;

  async function addTx(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const amt = parseNum(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setErr(t("sale.errAmount"));
    if (!txDate) return setErr(t("fin.errDate"));
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      workspace_id: ws.id,
      type,
      category,
      amount: amt,
      status: type === "income" ? "paid" : status,
      tx_date: txDate,
      due_date: type === "expense" && status === "due" && dueDate ? dueDate : null,
      paid_date: type === "income" || status === "paid" ? txDate : null,
      note: note.trim(),
      source: "manual",
    });
    setBusy(false);
    if (error) return setErr(errMsg(error, t));
    setOpen(false);
    setAmount("");
    setNote("");
    reload();
  }

  async function payDue(tx: Txn) {
    setErr("");
    const { error } = await supabase.rpc("pay_due", { p_tx: tx.id, p_date: today() });
    if (error) return setErr(errMsg(error, t));
    reload();
  }

  async function receive(o: Order) {
    const amtStr = window.prompt(t("fin.receivePrompt"), String(Number(o.total) - Number(o.paid_amount)));
    if (amtStr === null) return;
    const amt = parseNum(amtStr);
    if (!Number.isFinite(amt) || amt <= 0) return setErr(t("sale.errAmount"));
    setErr("");
    const { error } = await supabase.rpc("add_order_payment", { p_order: o.id, p_amount: amt, p_date: today() });
    if (error) return setErr(errMsg(error, t));
    reload();
  }

  async function removeTx(tx: Txn) {
    if (!window.confirm(t("fin.confirmDelete"))) return;
    const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
    if (error) return setErr(errMsg(error, t));
    reload();
  }

  const catLabel = (c: string) => {
    const k = `cat.${c}`;
    const v = t(k);
    return v === k ? c : v;
  };
  const nameOf = (id: string | null) => (id ? data?.customers.find((c) => c.id === id)?.name ?? "—" : t("sale.walkIn"));

  return (
    <>
      <PageTitle
        title={t("fin.title")}
        right={
          <button type="button" className="btn btn-primary" onClick={() => { setErr(""); setOpen(true); }}>
            + {t("fin.add")}
          </button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "overview", label: t("fin.overview") },
          { id: "txns", label: t("fin.txns") },
          { id: "recv", label: t("fin.recv") },
          { id: "pay", label: t("fin.pay") },
        ]}
      />
      <ErrorBox message={open ? "" : err} />

      {loading && !data ? (
        <Skeleton rows={4} />
      ) : error || !data ? (
        <LoadError onRetry={reload} />
      ) : tab === "overview" ? (
        <>
          <div className="card space-y-2">
            <div className="font-bold">{t("fin.pnl")}</div>
            <dl className="space-y-1.5 text-sm">
              {[
                [t("fin.revenue"), data.summary.monthRevenue],
                [t("fin.cogs"), -data.summary.monthCogs],
                [t("fin.gross"), data.summary.monthRevenue - data.summary.monthCogs],
                [t("fin.opex"), -data.summary.monthOpex],
                [t("fin.otherIncome"), data.summary.monthOtherIncome],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between">
                  <dt className="text-muted">{l}</dt>
                  <dd>{money(Number(v))}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-1.5 text-base font-bold">
                <dt>{t("fin.net")}</dt>
                <dd className={data.summary.monthNetProfit < 0 ? "text-danger" : "text-ok"}>{money(data.summary.monthNetProfit)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted">{t("fin.pnlNote")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t("dash.cash")} value={money(data.summary.cashBalance)} tone={data.summary.cashBalance < 0 ? "bad" : "default"} />
            <Stat label={t("fin.cashIn")} value={money(data.summary.monthCashIn)} />
            <Stat label={t("fin.cashOut")} value={money(data.summary.monthCashOut)} />
            <Stat label={t("fin.netCash")} value={money(data.summary.monthCashIn - data.summary.monthCashOut)} />
          </div>
          {data.summary.opexByCategory.length > 0 && (
            <div className="card space-y-2">
              <div className="font-bold">{t("fin.expenseBreakdown")}</div>
              <ul className="space-y-1 text-sm">
                {data.summary.opexByCategory.map((c) => (
                  <li key={c.category} className="flex justify-between">
                    <span className="text-muted">{catLabel(c.category)}</span>
                    <span>{money(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="card space-y-2">
            <div className="font-bold">{t("fin.monthly")}</div>
            <BarChart data={data.summary.series} labelRevenue={t("dash.revenue")} labelCosts={t("dash.costs")} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="py-1">{t("fin.month")}</th>
                    <th className="py-1 text-right">{t("dash.revenue")}</th>
                    <th className="py-1 text-right">{t("dash.costs")}</th>
                    <th className="py-1 text-right">{t("fin.net")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.series.map((m) => (
                    <tr key={m.month} className="border-t border-line">
                      <td className="py-1">{m.month}</td>
                      <td className="py-1 text-right">{money(m.revenue)}</td>
                      <td className="py-1 text-right">{money(m.costs)}</td>
                      <td className={`py-1 text-right ${m.revenue - m.costs < 0 ? "text-danger" : ""}`}>{money(m.revenue - m.costs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : tab === "txns" ? (
        data.txns.length === 0 ? (
          <Empty title={t("fin.emptyTitle")} text={t("fin.emptyText")} />
        ) : (
          <ul className="space-y-2">
            {data.txns.map((x) => (
              <li key={x.id} className="card flex items-center justify-between gap-3 !p-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{catLabel(x.category)}</div>
                  <div className="text-xs text-muted">
                    {date(x.tx_date)}
                    {x.note ? ` · ${x.note}` : ""}
                  </div>
                  <div className="mt-0.5 flex gap-1">
                    {x.status === "due" && <Badge tone="warn">{t("fin.due")}</Badge>}
                    {x.source === "system" && <Badge>{t("fin.auto")}</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${x.type === "income" ? "text-ok" : "text-danger"}`}>
                    {x.type === "income" ? "+" : "−"}
                    {money(Number(x.amount))}
                  </div>
                  {x.source === "manual" && (
                    <button type="button" className="text-xs text-muted underline" onClick={() => void removeTx(x)}>
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : tab === "recv" ? (
        (() => {
          const rows = data.orders.filter((o) => Number(o.paid_amount) < Number(o.total));
          if (rows.length === 0) return <Empty title={t("fin.noRecv")} />;
          return (
            <ul className="space-y-2">
              {rows.map((o) => (
                <li key={o.id} className="card flex items-center justify-between gap-3 !p-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{nameOf(o.customer_id)}</div>
                    <div className="text-xs text-muted">{date(o.order_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-warn">{money(Number(o.total) - Number(o.paid_amount))}</div>
                    <button type="button" className="text-xs underline" onClick={() => void receive(o)}>
                      {t("fin.receive")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          );
        })()
      ) : (
        (() => {
          const rows = data.txns.filter((x) => x.type === "expense" && x.status === "due");
          if (rows.length === 0) return <Empty title={t("fin.noPay")} />;
          return (
            <ul className="space-y-2">
              {rows.map((x) => (
                <li key={x.id} className="card flex items-center justify-between gap-3 !p-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{catLabel(x.category)}</div>
                    <div className="text-xs text-muted">{x.due_date ? t("fin.dueOn", { d: date(x.due_date) }) : date(x.tx_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{money(Number(x.amount))}</div>
                    <button type="button" className="text-xs underline" onClick={() => void payDue(x)}>
                      {t("fin.markPaid")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          );
        })()
      )}
      {data && data.txns.length >= 300 && tab === "txns" && <p className="text-xs text-muted">{t("fin.limit300", { n: num(300) })}</p>}

      <Sheet open={open} onClose={() => setOpen(false)} title={t("fin.add")}>
        <form onSubmit={addTx} className="space-y-3" noValidate>
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setType(k);
                  setCategory(k === "income" ? INCOME_CATEGORIES[0] : "other");
                }}
                className={`btn flex-1 ${type === k ? "btn-primary" : "btn-ghost"}`}
              >
                {t(`fin.${k}`)}
              </button>
            ))}
          </div>
          <Field label={t("fin.category")} htmlFor="fc">
            <select id="fc" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("sale.amount")} htmlFor="fa">
              <input id="fa" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={t("sale.date")} htmlFor="fd">
              <input id="fd" className="input" type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            </Field>
          </div>
          {type === "expense" && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={status === "due"} onChange={(e) => setStatus(e.target.checked ? "due" : "paid")} />
                {t("fin.notPaidYet")}
              </label>
              {status === "due" && (
                <Field label={t("inv.dueDate")} htmlFor="fdd">
                  <input id="fdd" className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
              )}
            </>
          )}
          <Field label={t("sale.note")} htmlFor="fn">
            <input id="fn" className="input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
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
