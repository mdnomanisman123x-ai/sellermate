"use client";
import Link from "next/link";
import { BarChart, Gauge, ProgressBar } from "@/components/charts";
import { Badge, Empty, LoadError, PageTitle, Skeleton, Stat } from "@/components/ui";
import type { Summary } from "@/lib/calc";
import { useI18n } from "@/lib/i18n";
import { useLoad } from "@/lib/useLoad";
import { tracksInventory } from "@/lib/business";
import { useWorkspace } from "@/lib/workspace";

export default function Dashboard() {
  const { t, num, pct } = useI18n();
  const { ws, money, today, canFinance } = useWorkspace();
  const { data, loading, error, reload } = useLoad<Summary>(async () => {
    const r = await fetch(`/api/summary?today=${today()}`, { cache: "no-store" });
    if (!r.ok) throw new Error("load");
    return ((await r.json()) as { summary: Summary }).summary;
  }, []);

  if (loading && !data) return <Skeleton rows={5} />;
  if (error || !data) return <LoadError onRetry={reload} />;
  const s = data;
  const inv = tracksInventory(ws.business_type);
  const noData = s.monthOrders === 0 && s.customers.total === 0 && s.inventory.tracked === 0;
  const tone = s.health.label === "good" ? "good" : s.health.label === "watch" ? "warn" : s.health.label === "risk" ? "bad" : "default";

  return (
    <>
      <PageTitle title={t("dash.title")} />
      {noData && (
        <Empty
          title={t("dash.emptyTitle")}
          text={t("dash.emptyText")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/sales" className="btn btn-primary">
                {t("dash.addSale")}
              </Link>
              <Link href="/customers" className="btn btn-ghost">
                {t("dash.addCustomer")}
              </Link>
            </div>
          }
        />
      )}

      <div className="hero-surface rounded-3xl p-5 shadow-lg">
        <div className="text-sm text-white/70">{t("dash.todaySales")}</div>
        <div className="mt-1 break-words text-4xl font-bold tracking-tight text-white">{money(s.todaySales)}</div>
        <div className="mt-0.5 text-xs text-white/60">{t("dash.ordersN", { n: num(s.todayOrders) })}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-[11px] text-white/65">{t("dash.monthRevenue")}</div>
            <div className="text-base font-bold text-white">{money(s.monthRevenue)}</div>
          </div>
          {canFinance && (
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-[11px] text-white/65">{t("dash.netProfit")}</div>
              <div className={`text-base font-bold ${s.monthNetProfit < 0 ? "text-[#FF9A9A]" : "text-gold"}`}>{money(s.monthNetProfit)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {canFinance && (
          <>
            <Stat label={t("dash.cash")} value={money(s.cashBalance)} tone={s.cashBalance < 0 ? "bad" : "default"} />
            <Stat label={t("dash.expenses")} value={money(s.monthOpex)} />
            <Stat label={t("dash.receivables")} value={money(s.receivables)} hint={t("dash.countN", { n: num(s.receivableCount) })} />
            <Stat label={t("dash.payables")} value={money(s.payables)} hint={t("dash.countN", { n: num(s.payableCount) })} />
          </>
        )}
        <Stat label={t("dash.customers")} value={num(s.customers.total)} hint={t("dash.newN", { n: num(s.customers.newThisMonth) })} />
        {inv && <Stat label={t("dash.inventoryValue")} value={canFinance ? money(s.inventory.valuation) : num(s.inventory.tracked)} hint={t("dash.lowN", { n: num(s.inventory.lowStock.length) })} />}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card space-y-2">
          <div className="font-bold">{t("dash.target")}</div>
          {s.target.target > 0 && s.target.progress !== null ? (
            <>
              <ProgressBar value={s.target.progress} marker={s.target.expectedPace} />
              <div className="text-sm text-muted">
                {t("dash.targetText", { done: pct(s.target.progress), target: money(s.target.target), pace: pct(s.target.expectedPace) })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("dash.noTarget")}</p>
          )}
        </div>

        {canFinance && (
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold">{t("dash.health")}</div>
              <Badge tone={tone}>{t(`health.${s.health.label}`)}</Badge>
            </div>
            <Gauge score={s.health.score} />
            <p className="text-xs text-muted">{t("dash.healthNote")}</p>
          </div>
        )}
      </div>

      {canFinance && (
        <div className="card space-y-2">
          <div className="font-bold">{t("dash.trend")}</div>
          <BarChart data={s.series} labelRevenue={t("dash.revenue")} labelCosts={t("dash.costs")} />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card space-y-2">
          <div className="font-bold">{t("dash.attention")}</div>
          <ul className="space-y-1.5 text-sm">
            {s.customers.followUpsDue > 0 && (
              <li>
                <Link className="underline" href="/customers">
                  {t("dash.followUps", { n: num(s.customers.followUpsDue) })}
                </Link>
              </li>
            )}
            {s.customers.lost.length > 0 && (
              <li>
                <Link className="underline" href="/customers">
                  {t("dash.lostN", { n: num(s.customers.lost.length) })}
                </Link>
              </li>
            )}
            {inv && s.inventory.lowStock.length > 0 && (
              <li>
                <Link className="underline" href="/inventory">
                  {t("dash.lowStockN", { n: num(s.inventory.lowStock.length) })}
                </Link>
              </li>
            )}
            {canFinance && s.receivables > 0 && (
              <li>
                <Link className="underline" href="/finance">
                  {t("dash.collectN", { amt: money(s.receivables) })}
                </Link>
              </li>
            )}
            {s.customers.followUpsDue === 0 &&
              s.customers.lost.length === 0 &&
              s.inventory.lowStock.length === 0 &&
              (!canFinance || s.receivables === 0) && <li className="text-muted">{t("dash.allGood")}</li>}
          </ul>
        </div>

        <div className="card space-y-2">
          <div className="font-bold">{t("dash.topProducts")}</div>
          {s.topProducts.length === 0 ? (
            <p className="text-sm text-muted">{t("dash.noSalesYet")}</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {s.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between gap-3">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-muted">
                    {num(p.qty)} · {money(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
