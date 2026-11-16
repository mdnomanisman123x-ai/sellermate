"use client";
import { useEffect, useRef, useState } from "react";
import { bn, todayStr } from "@/lib/format";
import { sanitizeData, useStore } from "@/lib/store";

export default function SettingsPage() {
  const { ready, data, setShopName, replaceAll } = useStore();
  const [shop, setShop] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready) setShop(data.shopName);
  }, [ready, data.shopName]);

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-ink/5" aria-busy="true" />;
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellermate-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMsg({ ok: true, text: "ব্যাকআপ ফাইল ডাউনলোড হয়েছে। ফাইলটি নিরাপদ জায়গায় রাখুন।" });
  }

  async function importBackup(file: File) {
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("big");
      const clean = sanitizeData(JSON.parse(await file.text()));
      if (!clean) throw new Error("bad");
      const ok = window.confirm(
        `ব্যাকআপে ${bn(clean.customers.length)} জন গ্রাহক আছে। এখনকার সব ডেটা মুছে এটা বসানো হবে। নিশ্চিত?`
      );
      if (!ok) return;
      replaceAll(clean);
      setMsg({ ok: true, text: "ব্যাকআপ ফিরিয়ে আনা হয়েছে।" });
    } catch {
      setMsg({ ok: false, text: "এই ফাইলটি সঠিক SellerMate ব্যাকআপ নয়।" });
    }
  }

  function wipe() {
    if (
      window.confirm("সব গ্রাহক ও হিসাব মুছে যাবে এবং ফেরানো যাবে না। আগে ব্যাকআপ নিয়েছেন তো?") &&
      window.confirm("শেষবার জিজ্ঞাসা: সত্যিই সব মুছবেন?")
    ) {
      replaceAll({ shopName: data.shopName, customers: [], txns: [] });
      setMsg({ ok: true, text: "সব ডেটা মুছে ফেলা হয়েছে।" });
    }
  }

  return (
    <div className="animate-rise space-y-5">
      <h1 className="font-display text-2xl font-bold">সেটিংস</h1>

      <section className="card space-y-3">
        <h2 className="font-display text-lg font-bold">দোকানের নাম</h2>
        <p className="text-sm text-ink/60">তাগাদার মেসেজে এই নাম যাবে।</p>
        <div className="flex gap-2">
          <input
            aria-label="দোকানের নাম"
            className="input"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            maxLength={60}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShopName(shop);
              setMsg({ ok: true, text: "দোকানের নাম সেভ হয়েছে।" });
            }}
          >
            সেভ
          </button>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-lg font-bold">ব্যাকআপ</h2>
        <p className="text-sm text-ink/70">
          আপনার সব ডেটা <strong>এই ফোনের ব্রাউজারেই</strong> থাকে, কোনো সার্ভারে যায় না। তাই ফোন বদলালে বা ব্রাউজারের
          ডেটা মুছলে হিসাব হারিয়ে যাবে। নিয়মিত ব্যাকআপ নিন।
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary" onClick={exportBackup}>
            ⬇ ব্যাকআপ নিন
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            ⬆ ফিরিয়ে আনুন
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importBackup(f);
            e.target.value = "";
          }}
        />
      </section>

      <section className="card space-y-2">
        <h2 className="font-display text-lg font-bold">হোম স্ক্রিনে অ্যাপ বানান</h2>
        <p className="text-sm text-ink/70">
          Chrome-এর মেনু (⋮) খুলে <strong>&quot;Add to Home screen&quot;</strong> বা{" "}
          <strong>&quot;Install app&quot;</strong> চাপুন। তখন এটা সাধারণ অ্যাপের মতো খুলবে।
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-display text-lg font-bold text-rose-700">বিপজ্জনক এলাকা</h2>
        <button type="button" className="btn btn-ghost w-full !text-rose-700" onClick={wipe}>
          সব ডেটা মুছে ফেলুন
        </button>
      </section>

      {msg && (
        <div
          role="status"
          className={`rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
