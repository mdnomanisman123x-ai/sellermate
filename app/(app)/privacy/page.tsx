"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Empty, ErrorBox, LoadError, Notice, PageTitle, Skeleton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { AiSettings } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { useWorkspace } from "@/lib/workspace";

interface LogRow {
  id: string;
  advisor_role: string;
  scopes: string[];
  question_chars: number;
  context_chars: number;
  status: "ok" | "blocked" | "error";
  created_at: string;
}
interface AuditRow {
  id: string;
  action: string;
  entity: string;
  created_at: string;
}

const SCOPES: { key: keyof AiSettings; id: string }[] = [
  { key: "share_financials", id: "financials" },
  { key: "share_sales", id: "sales" },
  { key: "share_inventory", id: "inventory" },
  { key: "share_customer_stats", id: "customer_stats" },
  { key: "share_customer_pii", id: "customer_names" },
];

export default function PrivacyPage() {
  const { t, date } = useI18n();
  const router = useRouter();
  const { supabase, ws, role, isOwner, canManage } = useWorkspace();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  const { data, loading, error, reload } = useLoad(async () => {
    const [s, l, a] = await Promise.all([
      supabase.from("ai_settings").select("*").eq("workspace_id", ws.id).maybeSingle(),
      supabase.from("ai_access_log").select("id,advisor_role,scopes,question_chars,context_chars,status,created_at").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("audit_logs").select("id,action,entity,created_at").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(30),
    ]);
    if (s.error) throw s.error;
    if (l.error) throw l.error;
    if (a.error) throw a.error;
    return { settings: s.data as AiSettings | null, log: (l.data ?? []) as LogRow[], audit: (a.data ?? []) as AuditRow[] };
  }, [ws.id]);

  if (role !== "owner" && role !== "admin") return <Empty title={t("err.forbidden")} />;
  if (loading && !data) return <Skeleton />;
  if (error || !data) return <LoadError onRetry={reload} />;
  const st = data.settings;

  async function update(patch: Partial<AiSettings>) {
    if (!st) return;
    setErr("");
    setMsg("");
    const { error } = await supabase.from("ai_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", st.id);
    if (error) return setErr(t("err.forbidden"));
    reload();
  }

  async function revoke() {
    await update({
      enabled: false,
      share_financials: false,
      share_sales: false,
      share_inventory: false,
      share_customer_stats: false,
      share_customer_pii: false,
    });
    setMsg(t("priv.revoked"));
  }

  async function exportData() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/export", { cache: "no-store" });
      if (!r.ok) throw new Error("x");
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sellermate-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      setErr(t("err.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (confirm !== "DELETE") return setErr(t("priv.errConfirm"));
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm }) });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(j.error === "not_configured" ? t("priv.errNotConfigured") : t("err.generic"));
        setBusy(false);
        return;
      }
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setErr(t("err.network"));
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={t("priv.title")} />
      <p className="text-sm text-muted">{t("priv.intro")}</p>
      <ErrorBox message={err} />
      <Notice message={msg} />

      <section className="card space-y-3">
        <h2 className="font-bold">{t("priv.aiControl")}</h2>
        {!isOwner && <p className="text-sm text-warn">{t("priv.ownerOnly")}</p>}
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">{t("priv.enable")}</span>
          <input type="checkbox" className="h-5 w-5" disabled={!isOwner || !st} checked={!!st?.enabled} onChange={(e) => void update({ enabled: e.target.checked })} />
        </label>
        <div className="space-y-2 border-t border-line pt-3">
          <div className="text-xs font-semibold text-muted">{t("priv.scopes")}</div>
          {SCOPES.map((s) => (
            <label key={s.id} className="flex items-start justify-between gap-3">
              <span className="text-sm">
                {t(`priv.scope.${s.id}`)}
                <span className="block text-xs text-muted">{t(`priv.scopeDesc.${s.id}`)}</span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                disabled={!isOwner || !st || !st.enabled || (s.id === "customer_names" && !st.share_customer_stats)}
                checked={!!st?.[s.key]}
                onChange={(e) => void update({ [s.key]: e.target.checked } as Partial<AiSettings>)}
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">{t("priv.neverShared")}</p>
        <p className="text-xs text-muted">{t("priv.retention")}</p>
        {isOwner && (
          <button type="button" className="btn btn-ghost" onClick={() => void revoke()}>
            {t("priv.revoke")}
          </button>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">{t("priv.aiLog")}</h2>
        {data.log.length === 0 ? (
          <p className="text-sm text-muted">{t("priv.noLog")}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.log.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 last:border-0">
                <span>
                  {date(l.created_at)} · {t(`ai.role.${l.advisor_role}`)}
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  <Badge tone={l.status === "ok" ? "good" : l.status === "blocked" ? "warn" : "bad"}>{t(`priv.st.${l.status}`)}</Badge>
                  {l.scopes.map((s) => (
                    <Badge key={s}>{t(`priv.scope.${s}`)}</Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">{t("priv.audit")}</h2>
        {data.audit.length === 0 ? (
          <p className="text-sm text-muted">{t("priv.noAudit")}</p>
        ) : (
          <ul className="space-y-1 text-xs text-muted">
            {data.audit.map((a) => (
              <li key={a.id}>
                {date(a.created_at)} · {a.action} · {a.entity}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">{t("priv.yourData")}</h2>
        <p className="text-sm text-muted">{t("priv.exportText")}</p>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void exportData()}>
          {t("priv.export")}
        </button>
        {isOwner && canManage && (
          <div className="space-y-2 border-t border-line pt-3">
            <div className="font-semibold text-danger">{t("priv.deleteTitle")}</div>
            <p className="text-sm text-muted">{t("priv.deleteText")}</p>
            <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t("priv.typeDelete")} aria-label={t("priv.typeDelete")} />
            <button type="button" className="btn btn-danger" disabled={busy || confirm !== "DELETE"} onClick={() => void deleteAccount()}>
              {t("priv.delete")}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
