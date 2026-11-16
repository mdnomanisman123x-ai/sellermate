import Link from "next/link";
import type { Customer } from "@/lib/store";
import { followLabel, initial, taka, tone } from "@/lib/format";

export default function CustomerRow({ customer, due }: { customer: Customer; due: number }) {
  const fu = customer.followUp ? followLabel(customer.followUp) : null;
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="card flex items-center gap-3 !p-3 transition active:scale-[0.99]"
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${tone(customer.name)}`}
        aria-hidden="true"
      >
        {initial(customer.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{customer.name}</div>
        <div className="truncate text-xs text-ink/55">{customer.phone || customer.address || "—"}</div>
        {fu && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              fu.late ? "bg-rose-100 text-rose-700" : "bg-gold-soft/60 text-ink"
            }`}
          >
            ফলো-আপ: {fu.text}
          </span>
        )}
      </div>
      <div className="text-right">
        {due > 0 ? (
          <>
            <div className="font-display text-lg font-bold text-rose-700">{taka(due)}</div>
            <div className="text-[11px] text-ink/50">বাকি</div>
          </>
        ) : due < 0 ? (
          <>
            <div className="font-display text-lg font-bold text-emerald-700">{taka(due)}</div>
            <div className="text-[11px] text-ink/50">অগ্রিম</div>
          </>
        ) : (
          <div className="text-xs font-medium text-emerald-700">পরিশোধিত</div>
        )}
      </div>
    </Link>
  );
}
