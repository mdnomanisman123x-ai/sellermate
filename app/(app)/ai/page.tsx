"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Empty, ErrorBox, LoadError, Notice, PageTitle, Skeleton } from "@/components/ui";
import { ADVISORS, type Advisor } from "@/lib/ai";
import { useI18n } from "@/lib/i18n";
import type { AiSettings } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { useWorkspace } from "@/lib/workspace";

const ICON: Record<Advisor, string> = { ceo: "👔", cfo: "💼", marketing: "📣", sales: "🤝", strategy: "🧭" };

export default function AiPage() {
  const { t, lang } = useI18n();
  const { supabase, ws, canManage, today } = useWorkspace();
  const [advisor, setAdvisor] = useState<Advisor>("ceo");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { data, loading, error: loadErr, reload } = useLoad(async () => {
    const [s, st] = await Promise.all([
      supabase.from("ai_settings").select("*").eq("workspace_id", ws.id).maybeSingle(),
      fetch("/api/ai", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("status")))),
    ]);
    if (s.error) throw s.error;
    return { settings: s.data as AiSettings | null, status: st as { configured: boolean; planOk: boolean } };
  }, [ws.id]);

  if (!canManage) return <Empty title={t("err.forbidden")} />;
  if (loading && !data) return <Skeleton />;
  if (loadErr || !data) return <LoadError onRetry={reload} />;

  const enabled = !!data.settings?.enabled;
  const ready = enabled && data.status.configured && data.status.planOk;

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAnswer("");
    if (question.trim().length < 3) return setError(t("ai.errQuestion"));
    setBusy(true);
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ advisor, question: question.trim(), today: today(), lang }),
      });
      const j = (await r.json().catch(() => ({}))) as { answer?: string; scopes?: string[]; error?: string };
      if (!r.ok || !j.answer) {
        const key = ["plan", "not_configured", "disabled", "rate", "provider"].includes(j.error ?? "") ? `ai.err.${j.error}` : "ai.err.failed";
        setError(t(key));
      } else {
        setAnswer(j.answer);
        setScopes(j.scopes ?? []);
      }
    } catch {
      setError(t("err.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={t("ai.title")} />
      <p className="text-sm text-muted">{t("ai.intro")}</p>

      {!enabled && (
        <div className="card space-y-2">
          <p className="text-sm">{t("ai.off")}</p>
          <Link href="/privacy" className="btn btn-primary">
            {t("ai.openPrivacy")}
          </Link>
        </div>
      )}
      {enabled && !data.status.planOk && <Notice tone="warn" message={t("ai.err.plan")} />}
      {enabled && data.status.planOk && !data.status.configured && <Notice tone="warn" message={t("ai.err.not_configured")} />}

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {ADVISORS.map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={advisor === a}
            onClick={() => setAdvisor(a)}
            className={`chip whitespace-nowrap ${advisor === a ? "bg-brand text-white dark:text-bg" : "bg-card text-muted ring-1 ring-line"}`}
          >
            {ICON[a]} {t(`ai.role.${a}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{t(`ai.roleDesc.${advisor}`)}</p>

      <form onSubmit={ask} className="card space-y-3" noValidate>
        <label className="label" htmlFor="q">
          {t("ai.question")}
        </label>
        <textarea id="q" className="input min-h-[90px]" value={question} maxLength={1000} placeholder={t("ai.placeholder")} onChange={(e) => setQuestion(e.target.value)} />
        <ErrorBox message={error} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !ready}>
          {busy ? t("ai.thinking") : t("ai.ask")}
        </button>
      </form>

      {answer && (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="good">
              {ICON[advisor]} {t(`ai.role.${advisor}`)}
            </Badge>
            {scopes.length === 0 ? <Badge tone="warn">{t("ai.noData")}</Badge> : scopes.map((s) => <Badge key={s}>{t(`priv.scope.${s}`)}</Badge>)}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
          <p className="text-xs text-muted">{t("ai.disclaimer")}</p>
        </div>
      )}
    </>
  );
}
