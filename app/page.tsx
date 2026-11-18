"use client";
import Link from "next/link";
import { LangToggle } from "@/components/ThemeToggle";
import { isSupabaseConfigured } from "@/lib/env";
import { useI18n } from "@/lib/i18n";

const features = ["land.f1", "land.f2", "land.f3", "land.f4", "land.f5", "land.f6"];

export default function Landing() {
  const { t } = useI18n();
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white dark:text-bg">S</span>
          SellerMate
        </div>
        <LangToggle />
      </header>

      <section className="py-14 text-center">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{t("land.title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{t("land.sub")}</p>

        {configured ? (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn btn-primary !px-6 !py-3">
              {t("auth.signup")}
            </Link>
            <Link href="/login" className="btn btn-ghost !px-6 !py-3">
              {t("auth.login")}
            </Link>
          </div>
        ) : (
          <div className="card mx-auto mt-8 max-w-xl space-y-2 text-left" role="alert">
            <div className="font-bold">{t("setup.title")}</div>
            <p className="text-sm text-muted">{t("setup.text")}</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>{t("setup.s1")}</li>
              <li>{t("setup.s2")}</li>
              <li>{t("setup.s3")}</li>
            </ol>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f} className="card text-sm">
            {t(f)}
          </div>
        ))}
      </section>
    </main>
  );
}
