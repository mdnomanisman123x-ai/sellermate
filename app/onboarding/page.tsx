"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ErrorBox, Field } from "@/components/ui";
import { LangToggle } from "@/components/ThemeToggle";
import { BUSINESS_TYPES, COUNTRIES, CURRENCIES, SIZES } from "@/lib/business";
import { errMsg } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { parseNum } from "@/lib/nums";

export default function Onboarding() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState("online_seller");
  const [country, setCountry] = useState("BD");
  const [currency, setCurrency] = useState("BDT");
  const [size, setSize] = useState("micro");
  const [products, setProducts] = useState("");
  const [employees, setEmployees] = useState("0");
  const [target, setTarget] = useState("");
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // If this user already has a workspace, go straight to the dashboard.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (data) router.replace("/dashboard");
      else setChecking(false);
    })();
  }, [supabase, router]);

  function next() {
    setError("");
    if (step === 0 && !name.trim()) {
      setError(t("onb.errName"));
      return;
    }
    setStep((s) => s + 1);
  }

  async function finish() {
    setError("");
    const emp = parseNum(employees);
    const tgt = parseNum(target || "0");
    const opening = parseNum(cash || "0");
    if (!Number.isFinite(emp) || emp < 0 || !Number.isFinite(tgt) || tgt < 0 || !Number.isFinite(opening)) {
      setError(t("onb.errNumber"));
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.rpc("create_workspace", {
      p_name: name.trim(),
      p_business_type: type,
      p_country: country,
      p_currency: currency,
      p_size: size,
      p_products: products.trim().slice(0, 500),
      p_employees: Math.round(emp),
      p_target: tgt,
      p_opening_cash: opening,
      p_language: lang,
    });
    setBusy(false);
    if (err) {
      setError(errMsg(err, t));
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  if (checking) {
    return <div className="mx-auto max-w-md p-6"><div className="h-40 animate-pulse rounded-2xl bg-line/60" aria-busy="true" /></div>;
  }

  const steps = [t("onb.step1"), t("onb.step2"), t("onb.step3")];

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-bold">SellerMate</div>
        <LangToggle />
      </div>
      <div className="mb-4 flex gap-2" aria-label={t("onb.title")}>
        {steps.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>
      <div className="card space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{t("onb.title")}</h1>
          <p className="text-sm text-muted">
            {steps[step]} · {step + 1}/3
          </p>
        </div>

        {step === 0 && (
          <>
            <Field label={t("onb.name")} htmlFor="bn">
              <input id="bn" className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("onb.type")} htmlFor="bt">
              <select id="bt" className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {t(`type.${b.id}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("onb.size")} htmlFor="bs">
              <select id="bs" className="input" value={size} onChange={(e) => setSize(e.target.value)}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {t(`size.${s}`)}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label={t("onb.country")} htmlFor="bc">
              <select
                id="bc"
                className="input"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  const c = COUNTRIES.find((x) => x.code === e.target.value);
                  if (c) setCurrency(c.currency);
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {t(`country.${c.code}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("onb.currency")} htmlFor="bcur">
              <select id="bcur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("onb.products")} htmlFor="bp" hint={t("onb.productsHint")}>
              <textarea id="bp" className="input min-h-[80px]" value={products} maxLength={500} onChange={(e) => setProducts(e.target.value)} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={t("onb.employees")} htmlFor="be">
              <input id="be" className="input" inputMode="numeric" value={employees} onChange={(e) => setEmployees(e.target.value)} />
            </Field>
            <Field label={t("onb.target")} htmlFor="bt2" hint={t("onb.targetHint")}>
              <input id="bt2" className="input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <Field label={t("onb.cash")} htmlFor="bcash" hint={t("onb.cashHint")}>
              <input id="bcash" className="input" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} />
            </Field>
          </>
        )}

        <ErrorBox message={error} />
        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>
              {t("common.back")}
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="btn btn-primary flex-1" onClick={next}>
              {t("common.next")}
            </button>
          ) : (
            <button type="button" className="btn btn-primary flex-1" onClick={() => void finish()} disabled={busy}>
              {busy ? t("common.wait") : t("onb.finish")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
