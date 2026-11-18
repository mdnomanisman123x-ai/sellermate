"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import CustomerForm from "@/components/CustomerForm";
import Sheet from "@/components/Sheet";
import { Badge, Empty, ErrorBox, LoadError, Skeleton, Stat } from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { waLink } from "@/lib/nums";
import type { Customer, Order } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { useWorkspace } from "@/lib/workspace";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, date, num } = useI18n();
  const router = useRouter();
  const { supabase, ws, canWrite, canManage, money } = useWorkspace();
  const [edit, setEdit] = useState(false);
  const [err, setErr] = useState("");

  const { data, loading, error, reload } = useLoad<{ c: Customer | null; orders: Order[] }>(async () => {
    const [c, o] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).eq("workspace_id", ws.id).maybeSingle(),
      supabase.from("orders").select("*").eq("customer_id", id).eq("workspace_id", ws.id).order("order_date", { ascending: false }).limit(200),
    ]);
    if (c.error) throw c.error;
    if (o.error) throw o.error;
    return { c: (c.data as Customer | null) ?? null, orders: (o.data ?? []) as Order[] };
  }, [id, ws.id]);

  async function remove() {
    if (!window.confirm(t("cust.confirmDelete"))) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return setErr(errMsg(error, t));
    router.replace("/customers");
  }

  if (loading && !data) return <Skeleton />;
  if (error) return <LoadError onRetry={reload} />;
  if (!data?.c) return <Empty title={t("common.notFound")} action={<Link href="/customers" className="btn btn-primary">{t("common.back")}</Link>} />;
  const c = data.c;
  const live = data.orders.filter((o) => o.status !== "cancelled" && o.status !== "returned");
  const total = live.reduce((a, o) => a + Number(o.total), 0);
  const due = live.reduce((a, o) => a + (Number(o.total) - Number(o.paid_amount)), 0);

  return (
    <>
      <Link href="/customers" className="text-sm text-muted underline">
        ← {t("common.back")}
      </Link>
      <div className="card space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <Badge>{t(`seg.${c.segment}`)}</Badge>
          {c.is_lead && <Badge tone="warn">{t("cust.lead")}</Badge>}
        </div>
        {c.phone && <div className="text-sm">{c.phone}</div>}
        {c.address && <div className="text-sm text-muted">{c.address}</div>}
        {c.note && <div className="whitespace-pre-wrap text-sm text-muted">{c.note}</div>}
        {c.follow_up && <div className="text-sm">{t("cust.followOn", { d: date(c.follow_up), n: "0" })}</div>}
        <div className="flex flex-wrap gap-2 pt-1">
          {c.phone && (
            <>
              <a className="btn btn-ghost" href={`tel:${c.phone}`}>
                📞 {t("cust.call")}
              </a>
              <a className="btn btn-ghost" href={waLink(c.phone)} target="_blank" rel="noopener noreferrer">
                💬 WhatsApp
              </a>
              {due > 0 && (
                <a
                  className="btn btn-ghost"
                  href={waLink(c.phone, t("cust.reminderText", { name: c.name, amt: money(due) }))}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔔 {t("cust.reminder")}
                </a>
              )}
            </>
          )}
          {canWrite && (
            <button type="button" className="btn btn-ghost" onClick={() => setEdit(true)}>
              {t("common.edit")}
            </button>
          )}
          {canManage && (
            <button type="button" className="btn btn-danger" onClick={() => void remove()}>
              {t("common.delete")}
            </button>
          )}
        </div>
        <ErrorBox message={err} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("cust.orders")} value={num(live.length)} />
        <Stat label={t("cust.totalBought")} value={money(total)} />
        <Stat label={t("cust.due")} value={money(due)} tone={due > 0 ? "warn" : "default"} />
      </div>

      <h2 className="font-bold">{t("cust.history")}</h2>
      {data.orders.length === 0 ? (
        <Empty title={t("cust.noOrders")} />
      ) : (
        <ul className="space-y-2">
          {data.orders.map((o) => (
            <li key={o.id} className="card flex items-center justify-between !p-3 text-sm">
              <div>
                <div className="font-semibold">{date(o.order_date)}</div>
                <Badge>{t(`status.${o.status}`)}</Badge>
              </div>
              <div className="text-right">
                <div className="font-bold">{money(Number(o.total))}</div>
                {Number(o.paid_amount) < Number(o.total) && <div className="text-xs text-warn">{t("cust.dueN", { amt: money(Number(o.total) - Number(o.paid_amount)) })}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={edit} onClose={() => setEdit(false)} title={t("common.edit")}>
        <CustomerForm
          existing={c}
          onSaved={() => {
            setEdit(false);
            reload();
          }}
        />
      </Sheet>
    </>
  );
}
