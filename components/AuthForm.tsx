"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBox, Field, Notice } from "@/components/ui";
import { LangToggle } from "@/components/ThemeToggle";
import { isSupabaseConfigured } from "@/lib/env";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const isSignup = mode === "signup";

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-md p-6">
        <div className="card space-y-2" role="alert">
          <div className="font-bold">{t("setup.title")}</div>
          <p className="text-sm text-muted">{t("setup.text")}</p>
        </div>
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError(t("auth.errEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.errPassword"));
      return;
    }
    if (isSignup && password !== confirm) {
      setError(t("auth.errMatch"));
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (err) {
          setError(err.message.toLowerCase().includes("already") ? t("auth.errExists") : t("auth.errGeneric"));
        } else if (data.session) {
          router.replace("/onboarding");
          router.refresh();
        } else {
          setInfo(t("auth.checkEmail"));
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (err) {
          setError(err.message.toLowerCase().includes("confirm") ? t("auth.errConfirm") : t("auth.errCredentials"));
        } else {
          router.replace("/dashboard");
          router.refresh();
        }
      }
    } catch {
      setError(t("err.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white dark:text-bg">S</span>
          SellerMate
        </Link>
        <LangToggle />
      </div>
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <h1 className="text-2xl font-bold">{isSignup ? t("auth.signup") : t("auth.login")}</h1>
        <Field label={t("auth.email")} htmlFor="email">
          <input
            id="email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" hint={isSignup ? t("auth.passwordHint") : undefined}>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {isSignup && (
          <Field label={t("auth.confirm")} htmlFor="confirm">
            <input
              id="confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        )}
        <ErrorBox message={error} />
        <Notice message={info} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? t("common.wait") : isSignup ? t("auth.signup") : t("auth.login")}
        </button>
        <p className="text-center text-sm text-muted">
          {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-brand underline">
            {isSignup ? t("auth.login") : t("auth.signup")}
          </Link>
        </p>
      </form>
    </main>
  );
}
