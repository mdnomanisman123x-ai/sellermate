"use client";
import Link from "next/link";
import { LangToggle } from "@/components/ThemeToggle";
import { isSupabaseConfigured } from "@/lib/env";
import { useI18n } from "@/lib/i18n";

const features = ["land.f1", "land.f2", "land.f3", "land.f4", "land.f5", "land.f6"];
const BARS = [38, 52, 30, 64, 46, 78, 58];

function PhoneMock() {
  const { t, num } = useI18n();
  return (
    <div className="relative mx-auto w-[17.5rem] rotate-[-2deg] rounded-[2.4rem] border border-white/15 bg-[#06221A] p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]" aria-hidden>
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/15" />
      <div className="rounded-3xl bg-white/[0.07] p-4">
        <div className="text-xs text-white/60">{t("land.mockToday")}</div>
        <div className="mt-0.5 text-4xl font-bold tracking-tight text-white">৳{num(12450)}</div>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {BARS.map((h, i) => (
            <div key={i} className={`flex-1 rounded-md ${i === BARS.length - 1 ? "bg-gold" : "bg-white/25"}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-2.5 space-y-2">
        <div className="flex items-center justify-between rounded-2xl bg-white/[0.07] px-3.5 py-2.5">
          <div>
            <div className="text-[11px] text-white/60">{t("land.mockDue")}</div>
            <div className="text-sm font-bold text-gold">৳{num(3200)} · {t("land.mockDueN")}</div>
          </div>
          <span className="rounded-full bg-[#25D366] px-3 py-1 text-[11px] font-bold text-[#06221A]">💬 {t("land.remind")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/[0.07] px-3.5 py-2.5">
            <div className="text-[11px] text-white/60">{t("land.mockProfit")}</div>
            <div className="text-sm font-bold text-white">৳{num(18900)}</div>
          </div>
          <div className="rounded-2xl bg-white/[0.07] px-3.5 py-2.5">
            <div className="text-[11px] text-white/60">{t("land.mockStock")}</div>
            <div className="text-sm font-bold text-white">{t("land.mockStockN")}</div>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 -top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-[#2B1D00]">{t("land.sample")}</div>
    </div>
  );
}

export default function Landing() {
  const { t } = useI18n();
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-bg">
      <section className="hero-surface overflow-hidden pb-14">
        <div className="mx-auto max-w-3xl px-5 pt-5">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-[#2B1D00]">S</span>
              SellerMate
            </div>
            <div className="[&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white">
              <LangToggle />
            </div>
          </header>

          {!configured && (
            <div role="status" className="mt-5 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-white/90">
              <span className="font-bold text-gold">{t("setup.title")}.</span> {t("setup.text")}
            </div>
          )}

          <div className="grid items-center gap-10 pt-10 md:grid-cols-2">
            <div className="text-center md:text-left">
              <h1 className="text-[2.6rem] font-bold leading-[1.15] text-white sm:text-5xl">{t("land.title")}</h1>
              <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/75 md:mx-0">{t("land.sub")}</p>
              {configured && (
                <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
                  <Link href="/signup" className="btn btn-gold !px-7 !py-3.5 !text-base">
                    {t("auth.signup")}
                  </Link>
                  <Link href="/login" className="btn !px-7 !py-3.5 !text-base border border-white/25 text-white hover:bg-white/10">
                    {t("auth.login")}
                  </Link>
                </div>
              )}
            </div>
            <PhoneMock />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-10">
        <ul className="grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="card !p-4 text-[0.95rem] font-semibold leading-snug">
              {t(f)}
            </li>
          ))}
        </ul>

        {!configured && (
          <div className="card mt-8 space-y-2" role="note">
            <div className="font-bold">{t("setup.title")}</div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>{t("setup.s1")}</li>
              <li>{t("setup.s2")}</li>
              <li>{t("setup.s3")}</li>
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
