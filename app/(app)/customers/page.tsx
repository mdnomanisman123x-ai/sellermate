"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CustomerForm from "@/components/CustomerForm";
import Sheet from "@/components/Sheet";
import { Badge, Empty, LoadError, PageTitle, Skeleton, Tabs } from "@/components/ui";
import { daysBetween } from "@/lib/calc";
import { useI18n } from "@/lib/i18n";
import { waLink } from "@/lib/nums";
import type { Customer } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { useWorkspace } from "@/lib/workspace";

type Filter = "all" | "follow" | "leads" | "vip";

export default function CustomersPage() {
  const { t, num, date } = useI18n();
  const { supabase, ws, canWrite, today } = useWorkspace();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);

  const { data, loading, error, reload } = useLoad<Customer[]>(async () => {
    const { data, error } = await supabase.from("customers").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(1000);
    if (error) throw error;
    return (data ?? []) as Customer[];
  }, [ws.id]);

  const list = useMemo(() => {
    const now = today();
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (needle && !(c.name.toLowerCase().includes(needle) || c.phone.includes(needle))) return false;
      if (filter === "follow") return !!c.follow_up && c.follow_up <= now;
      if (filter === "leads") return c.is_lead;
      if (filter === "vip") return c.segment === "vip";
      return true;
    });
  }, [data, q, filter, today]);

  return (
    <>
      <PageTitle
        title={t("cust.title")}
        right={
          canWrite && (
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              + {t("cust.add")}
            </button>
          )
        }
      />
      <input className="input" placeholder={t("cust.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("cust.search")} />
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: t("cust.fAll") },
          { id: "follow", label: t("cust.fFollow") },
          { id: "leads", label: t("cust.fLeads") },
          { id: "vip", label: t("seg.vip") },
        ]}
      />

      {loading && !data ? (
        <Skeleton />
      ) : error ? (
        <LoadError onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty
          title={data && data.length > 0 ? t("common.noResults") : t("cust.emptyTitle")}
          text={data && data.length > 0 ? undefined : t("cust.emptyText")}
          action={canWrite && (!data || data.length === 0) ? <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>{t("cust.add")}</button> : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const due = c.follow_up && c.follow_up <= today();
            return (
              <li key={c.id} className="card flex items-center gap-3 !p-3">
                <Link href={`/customers/${c.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-bold">{c.name}</span>
                    <Badge>{t(`seg.${c.segment}`)}</Badge>
                    {c.is_lead && <Badge tone="warn">{t("cust.lead")}</Badge>}
                  </div>
                  <div className="truncate text-sm text-muted">{c.phone || "—"}</div>
                  {c.follow_up && (
                    <div className={`text-xs ${due ? "font-semibold text-danger" : "text-muted"}`}>
                      {t("cust.followOn", { d: date(c.follow_up), n: due ? num(daysBetween(c.follow_up, today())) : "0" })}
                    </div>
                  )}
                </Link>
                {c.phone && (
                  <div className="flex shrink-0 gap-2">
                    <a className="btn btn-ghost !px-3" href={`tel:${c.phone}`} aria-label={t("cust.call")}>
                      📞
                    </a>
                    <a className="btn btn-ghost !px-3" href={waLink(c.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                      💬
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data && data.length >= 1000 && <p className="text-xs text-muted">{t("common.limit1000")}</p>}

      <Sheet open={open} onClose={() => setOpen(false)} title={t("cust.add")}>
        <CustomerForm
          onSaved={() => {
            setOpen(false);
            reload();
          }}
        />
      </Sheet>
    </>
  );
}
