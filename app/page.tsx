"use client";
import Link from "next/link";
import { useState } from "react";
import AddCustomerSheet from "@/components/AddCustomerSheet";
import CustomerRow from "@/components/CustomerRow";
import { bn, taka, todayStr } from "@/lib/format";
import { useStore } from "@/lib/store";

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="h-44 animate-pulse rounded-3xl bg-ink/10" />
      <div className="h-20 animate-pulse rounded-2xl bg-ink/5" />
      <div className="h-20 animate-pulse rounded-2xl bg-ink/5" />
    </div>
  );
}

export default function Dashboard() {
  const { ready, data, dueOf } = useStore();
  const [adding, setAdding] = useState(false);

  if (!ready) return <Skeleton />;

  const today = todayStr();
  const month = today.slice(0, 7);
  const rows = data.customers.map((c) => ({ c, due: dueOf(c.id) }));
  const totalDue = rows.reduce((s, r) => s + Math.max(0, r.due), 0);
  const dueCount = rows.filter((r) => r.due > 0).length;
  const followups = rows
    .filter((r) => r.c.followUp && r.c.followUp <= today)
    .sort((a, b) => a.c.followUp.localeCompare(b.c.followUp));
  const top = rows
    .filter((r) => r.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);
  const monthSales = data.txns
    .filter((t) => t.type === "order" && t.date.startsWith(month))
    .reduce((s, t) => s + t.amount, 0);
  const monthPaid = data.txns
    .filter((t) => t.type === "payment" && t.date.startsWith(month))
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="animate-rise space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-5 text-cream shadow-[0_20px_40px_-20px_rgba(14,43,37,0.6)]">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold/20 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="text-sm text-cream/70">মোট বাকি পাওনা</div>
          <div className="mt-1 font-display text-4xl font-bold text-gold">{taka(totalDue)}</div>
          <div className="mt-1 text-sm text-cream/70">
            {bn(dueCount)} জন গ্রাহকের কাছে · মোট গ্রাহক {bn(data.customers.length)} জন
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs text-cream/70">এ মাসের বিক্রি</div>
              <div className="font-display text-xl font-bold">{taka(monthSales)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs text-cream/70">এ মাসে পেয়েছি</div>
              <div className="font-display text-xl font-bold">{taka(monthPaid)}</div>
            </div>
          </div>
        </div>
      </section>

      {data.customers.length === 0 ? (
        <section className="card space-y-3 text-center">
          <div className="text-4xl" aria-hidden="true">
            📒
          </div>
          <h2 className="font-display text-xl font-bold">আপনার খাতা এখনো খালি</h2>
          <p className="text-sm text-ink/65">
            প্রথম গ্রাহক যোগ করুন। তারপর বিক্রি আর টাকা পাওয়ার হিসাব তুলে রাখলে বাকি নিজে নিজেই হিসাব হবে।
          </p>
          <button type="button" className="btn btn-primary w-full" onClick={() => setAdding(true)}>
            + প্রথম গ্রাহক যোগ করুন
          </button>
        </section>
      ) : (
        <>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">আজকের ফলো-আপ</h2>
              <span className="text-xs text-ink/55">{bn(followups.length)} জন</span>
            </div>
            {followups.length === 0 ? (
              <div className="card text-sm text-ink/60">আজ কোনো ফলো-আপ বাকি নেই। 🎉</div>
            ) : (
              <div className="space-y-2">
                {followups.map((r) => (
                  <CustomerRow key={r.c.id} customer={r.c} due={r.due} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">সবচেয়ে বেশি বাকি</h2>
              <Link href="/customers" className="text-xs font-semibold text-ink/60 underline">
                সব গ্রাহক
              </Link>
            </div>
            {top.length === 0 ? (
              <div className="card text-sm text-ink/60">কারও কাছে বাকি নেই।</div>
            ) : (
              <div className="space-y-2">
                {top.map((r) => (
                  <CustomerRow key={r.c.id} customer={r.c} due={r.due} />
                ))}
              </div>
            )}
          </section>

          <button type="button" className="btn btn-gold w-full" onClick={() => setAdding(true)}>
            + নতুন গ্রাহক
          </button>
        </>
      )}

      <AddCustomerSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
