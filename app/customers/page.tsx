"use client";
import { useState } from "react";
import AddCustomerSheet from "@/components/AddCustomerSheet";
import CustomerRow from "@/components/CustomerRow";
import { bn, cleanPhone, todayStr } from "@/lib/format";
import { useStore } from "@/lib/store";

type Filter = "all" | "due" | "follow";

export default function CustomersPage() {
  const { ready, data, dueOf, lastActivity } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);

  if (!ready) {
    return <div className="h-24 animate-pulse rounded-2xl bg-ink/5" aria-busy="true" />;
  }

  const today = todayStr();
  const term = q.trim().toLowerCase();
  const termDigits = cleanPhone(q).replace(/\D/g, "");

  const rows = data.customers
    .map((c) => ({ c, due: dueOf(c.id), last: lastActivity(c.id) }))
    .filter((r) => {
      if (filter === "due" && r.due <= 0) return false;
      if (filter === "follow" && !(r.c.followUp && r.c.followUp <= today)) return false;
      if (!term) return true;
      return (
        r.c.name.toLowerCase().includes(term) ||
        r.c.address.toLowerCase().includes(term) ||
        (termDigits.length >= 3 && cleanPhone(r.c.phone).includes(termDigits))
      );
    })
    .sort((a, b) => b.last.localeCompare(a.last));

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "সব" },
    { id: "due", label: "বাকি আছে" },
    { id: "follow", label: "ফলো-আপ" },
  ];

  return (
    <div className="animate-rise space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-2xl font-bold">গ্রাহক</h1>
        <span className="text-sm text-ink/55">{bn(data.customers.length)} জন</span>
      </div>

      <div>
        <label htmlFor="search" className="sr-only">
          গ্রাহক খুঁজুন
        </label>
        <input
          id="search"
          className="input"
          type="search"
          placeholder="নাম, নম্বর বা ঠিকানা দিয়ে খুঁজুন"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex gap-2" role="tablist" aria-label="ফিল্টার">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={filter === c.id}
            onClick={() => setFilter(c.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === c.id ? "bg-ink text-cream" : "bg-white text-ink/70 ring-1 ring-ink/10"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card text-center text-sm text-ink/60">
          {data.customers.length === 0 ? "এখনো কোনো গ্রাহক নেই। নিচের + বাটনে চাপ দিন।" : "কোনো গ্রাহক পাওয়া যায়নি।"}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <CustomerRow key={r.c.id} customer={r.c} due={r.due} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setAdding(true)}
        aria-label="নতুন গ্রাহক যোগ করুন"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-3xl font-light text-ink shadow-[0_12px_24px_-8px_rgba(14,43,37,0.5)] transition active:scale-90"
      >
        +
      </button>

      <AddCustomerSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
