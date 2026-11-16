"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CustomerForm from "@/components/CustomerForm";
import Sheet from "@/components/Sheet";
import TxnForm from "@/components/TxnForm";
import { cleanPhone, followLabel, fmtDate, initial, taka, todayStr, tone, waLink } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function CustomerPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { ready, data, dueOf, updateCustomer, deleteCustomer, addTxn, deleteTxn } = useStore();
  const [txnType, setTxnType] = useState<"order" | "payment" | null>(null);
  const [editing, setEditing] = useState(false);
  const [fu, setFu] = useState("");

  const customer = data.customers.find((c) => c.id === id);

  useEffect(() => {
    setFu(customer?.followUp ?? "");
  }, [customer?.followUp]);

  const ledger = useMemo(() => {
    const list = data.txns
      .filter((t) => t.customerId === id)
      .map((t, i) => ({ t, i }))
      .sort((a, b) => a.t.date.localeCompare(b.t.date) || a.i - b.i);
    let run = 0;
    const withBalance = list.map(({ t }) => {
      run += t.type === "order" ? t.amount : -t.amount;
      return { t, balance: run };
    });
    return withBalance.reverse();
  }, [data.txns, id]);

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-ink/5" aria-busy="true" />;
  }
  if (!customer) {
    return (
      <div className="card space-y-3 text-center">
        <p>এই গ্রাহককে পাওয়া যায়নি।</p>
        <Link href="/customers" className="btn btn-primary">
          গ্রাহকের তালিকায় ফিরুন
        </Link>
      </div>
    );
  }

  const due = dueOf(customer.id);
  const hasPhone = cleanPhone(customer.phone).replace(/\D/g, "").length >= 10;
  const reminder = `আসসালামু আলাইকুম ${customer.name}, ${data.shopName} থেকে বলছি। আপনার ${taka(due)} বাকি আছে। সুবিধামতো পরিশোধ করলে খুশি হব। ধন্যবাদ।`;
  const fuInfo = customer.followUp ? followLabel(customer.followUp) : null;

  function remove() {
    if (window.confirm(`"${customer?.name}" এবং তার সব হিসাব মুছে যাবে। নিশ্চিত?`)) {
      deleteCustomer(id);
      router.push("/customers");
    }
  }

  return (
    <div className="animate-rise space-y-4">
      <Link href="/customers" className="inline-block text-sm font-semibold text-ink/60">
        ← গ্রাহক
      </Link>

      <section className="card flex items-center gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${tone(customer.name)}`}
          aria-hidden="true"
        >
          {initial(customer.name)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold">{customer.name}</h1>
          <div className="truncate text-sm text-ink/60">{customer.phone || "নম্বর দেওয়া নেই"}</div>
          {customer.address && <div className="truncate text-xs text-ink/50">{customer.address}</div>}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {hasPhone ? (
          <a href={`tel:${cleanPhone(customer.phone)}`} className="btn btn-ghost">
            📞 কল
          </a>
        ) : (
          <span className="btn btn-ghost opacity-40">📞 কল</span>
        )}
        {hasPhone ? (
          <a href={waLink(customer.phone)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            💬 WhatsApp
          </a>
        ) : (
          <span className="btn btn-ghost opacity-40">💬 WhatsApp</span>
        )}
        {hasPhone && due > 0 ? (
          <a
            href={waLink(customer.phone, reminder)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gold"
          >
            ⏰ তাগাদা
          </a>
        ) : (
          <span className="btn btn-gold opacity-40">⏰ তাগাদা</span>
        )}
      </section>

      <section className="rounded-3xl bg-ink p-5 text-cream">
        <div className="text-sm text-cream/70">{due < 0 ? "অগ্রিম জমা" : "বাকি আছে"}</div>
        <div className={`font-display text-4xl font-bold ${due > 0 ? "text-gold" : "text-emerald-300"}`}>
          {due === 0 ? "৳০" : taka(due)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn bg-white/10 text-cream hover:bg-white/20" onClick={() => setTxnType("order")}>
            + বিক্রি
          </button>
          <button type="button" className="btn btn-gold" onClick={() => setTxnType("payment")}>
            + টাকা পেলাম
          </button>
        </div>
      </section>

      <section className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">ফলো-আপ</h2>
          {fuInfo && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                fuInfo.late ? "bg-rose-100 text-rose-700" : "bg-gold-soft/60"
              }`}
            >
              {fuInfo.text}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            aria-label="ফলো-আপের তারিখ"
            className="input"
            type="date"
            min={todayStr()}
            value={fu}
            onChange={(e) => setFu(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => updateCustomer(customer.id, { followUp: fu })}
            disabled={fu === customer.followUp}
          >
            সেট
          </button>
        </div>
        {customer.followUp && (
          <button
            type="button"
            className="text-sm font-semibold text-emerald-700 underline"
            onClick={() => updateCustomer(customer.id, { followUp: "" })}
          >
            ফলো-আপ হয়ে গেছে (মুছুন)
          </button>
        )}
        {customer.note && (
          <p className="rounded-xl bg-cream p-3 text-sm text-ink/75">📝 {customer.note}</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold">হিসাবের খাতা</h2>
        {ledger.length === 0 ? (
          <div className="card text-sm text-ink/60">এখনো কোনো লেনদেন নেই।</div>
        ) : (
          <ul className="space-y-2">
            {ledger.map(({ t, balance }) => (
              <li key={t.id} className="card flex items-center gap-3 !p-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                    t.type === "order" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                  aria-hidden="true"
                >
                  {t.type === "order" ? "↑" : "↓"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {t.type === "order" ? "বিক্রি" : "টাকা পেয়েছি"}
                    {t.note ? ` · ${t.note}` : ""}
                  </div>
                  <div className="text-xs text-ink/50">
                    {fmtDate(t.date)} · বাকি {balance < 0 ? `(অগ্রিম) ${taka(balance)}` : taka(balance)}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-display font-bold ${t.type === "order" ? "text-rose-700" : "text-emerald-700"}`}
                  >
                    {t.type === "order" ? "+" : "−"}
                    {taka(t.amount)}
                  </div>
                  <button
                    type="button"
                    aria-label="এই লেনদেন মুছুন"
                    className="text-xs text-ink/40 underline"
                    onClick={() => {
                      if (window.confirm("এই লেনদেনটি মুছে ফেলবেন?")) deleteTxn(t.id);
                    }}
                  >
                    মুছুন
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex gap-2 pt-2">
        <button type="button" className="btn btn-ghost flex-1" onClick={() => setEditing(true)}>
          ✏️ তথ্য বদলান
        </button>
        <button type="button" className="btn btn-ghost flex-1 !text-rose-700" onClick={remove}>
          🗑 গ্রাহক মুছুন
        </button>
      </section>

      <Sheet
        open={txnType !== null}
        onClose={() => setTxnType(null)}
        title={txnType === "order" ? "নতুন বিক্রি" : "টাকা পেলাম"}
      >
        {txnType && (
          <TxnForm
            type={txnType}
            onSubmit={(v) => {
              addTxn({ customerId: customer.id, type: txnType, ...v });
              setTxnType(null);
            }}
          />
        )}
      </Sheet>

      <Sheet open={editing} onClose={() => setEditing(false)} title="তথ্য বদলান">
        <CustomerForm
          initial={{
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            note: customer.note,
            followUp: customer.followUp,
          }}
          submitLabel="আপডেট করুন"
          onSubmit={(v) => {
            updateCustomer(customer.id, v);
            setEditing(false);
          }}
        />
      </Sheet>
    </div>
  );
}
