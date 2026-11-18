"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { bn, en } from "./dict";

export type Lang = "bn" | "en";
type Vars = Record<string, string | number>;

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
  num: (n: number, digits?: number) => string;
  date: (s: string) => string;
  pct: (ratio: number) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sm-lang");
      if (saved === "en" || saved === "bn") setLangState(saved);
    } catch {
      /* storage blocked: keep default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("sm-lang", l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const locale = lang === "bn" ? "bn-BD" : "en-US";
    const dict = lang === "bn" ? bn : en;
    return {
      lang,
      setLang,
      t: (key, vars) => {
        let s = dict[key] ?? en[key] ?? key;
        if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
        return s;
      },
      num: (n, digits = 0) => (Number.isFinite(n) ? n : 0).toLocaleString(locale, { maximumFractionDigits: digits }),
      date: (s) => {
        const [y, m, d] = s.slice(0, 10).split("-").map(Number);
        if (!y) return s;
        return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
      },
      pct: (r) => (Number.isFinite(r) ? r : 0).toLocaleString(locale, { style: "percent", maximumFractionDigits: 0 }),
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
