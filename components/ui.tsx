"use client";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const color = tone === "good" ? "text-ok" : tone === "bad" ? "text-danger" : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div className="card !p-3.5">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className={`mt-1 break-words text-xl font-bold leading-tight ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}

export function Notice({ message, tone = "ok" }: { message: string; tone?: "ok" | "warn" }) {
  if (!message) return null;
  const c = tone === "ok" ? "border-ok/30 bg-ok/10 text-ok" : "border-warn/30 bg-warn/10 text-warn";
  return (
    <div role="status" className={`rounded-xl border px-3 py-2 text-sm ${c}`}>
      {message}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card space-y-2 py-8 text-center">
      <div className="text-base font-bold">{title}</div>
      {text && <p className="mx-auto max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-line/60" />
      ))}
    </div>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card space-y-3 text-center" role="alert">
      <p className="text-sm">{t("err.load")}</p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        {t("common.retry")}
      </button>
    </div>
  );
}

export function Badge({ tone = "default", children }: { tone?: "default" | "good" | "bad" | "warn"; children: ReactNode }) {
  const c =
    tone === "good"
      ? "bg-ok/15 text-ok"
      : tone === "bad"
        ? "bg-danger/15 text-danger"
        : tone === "warn"
          ? "bg-warn/15 text-warn"
          : "bg-line text-muted";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string }[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          role="tab"
          aria-selected={value === i.id}
          onClick={() => onChange(i.id)}
          className={`chip whitespace-nowrap ${value === i.id ? "bg-brand text-white dark:text-bg" : "bg-card text-muted ring-1 ring-line"}`}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function PageTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {right}
    </div>
  );
}
