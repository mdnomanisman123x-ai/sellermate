"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function ThemeToggle() {
  const { t } = useI18n();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("sm-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" onClick={toggle} aria-label={t("common.theme")} className="btn btn-ghost !h-9 !w-9 !p-0">
      {dark ? "☀" : "☾"}
    </button>
  );
}

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      aria-label="Language"
      className="btn btn-ghost !h-9 !px-3 !py-0 text-xs"
    >
      {lang === "bn" ? "EN" : "বাং"}
    </button>
  );
}
