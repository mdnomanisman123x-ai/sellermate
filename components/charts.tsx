"use client";
import { useI18n } from "@/lib/i18n";
import type { MonthPoint } from "@/lib/calc";

export function BarChart({ data, labelRevenue, labelCosts }: { data: MonthPoint[]; labelRevenue: string; labelCosts: string }) {
  const { num, lang } = useI18n();
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue, d.costs]));
  const W = 320;
  const H = 150;
  const slot = W / data.length;
  const bw = Math.min(16, slot / 3);
  const short = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { month: "short" });
  };
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={`${labelRevenue} / ${labelCosts}`}>
        <line x1="0" x2={W} y1={H} y2={H} stroke="rgb(var(--line))" />
        {data.map((d, i) => {
          const x = i * slot + slot / 2;
          const hr = (d.revenue / max) * (H - 8);
          const hc = (d.costs / max) * (H - 8);
          return (
            <g key={d.month}>
              <rect x={x - bw - 1} y={H - hr} width={bw} height={hr} rx="3" fill="rgb(var(--brand))">
                <title>{`${labelRevenue}: ${num(d.revenue)}`}</title>
              </rect>
              <rect x={x + 1} y={H - hc} width={bw} height={hc} rx="3" fill="rgb(var(--warn))" opacity="0.8">
                <title>{`${labelCosts}: ${num(d.costs)}`}</title>
              </rect>
              <text x={x} y={H + 15} textAnchor="middle" fontSize="10" fill="rgb(var(--muted))">
                {short(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" />
          {labelRevenue}
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-warn" />
          {labelCosts}
        </span>
      </figcaption>
    </figure>
  );
}

export function Gauge({ score }: { score: number | null }) {
  const { num } = useI18n();
  const r = 52;
  const c = Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const color = score === null ? "rgb(var(--line))" : score >= 70 ? "rgb(var(--ok))" : score >= 40 ? "rgb(var(--warn))" : "rgb(var(--danger))";
  return (
    <svg viewBox="0 0 120 70" className="mx-auto w-40" role="img" aria-label={score === null ? "—" : String(score)}>
      <path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke="rgb(var(--line))" strokeWidth="10" strokeLinecap="round" />
      <path
        d="M8 62 A52 52 0 0 1 112 62"
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
      />
      <text x="60" y="56" textAnchor="middle" fontSize="24" fontWeight="700" fill="rgb(var(--fg))">
        {score === null ? "—" : num(score)}
      </text>
    </svg>
  );
}

export function ProgressBar({ value, marker }: { value: number; marker?: number }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="relative h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${w}%` }} />
      {marker !== undefined && (
        <div className="absolute top-0 h-full w-0.5 bg-fg/60" style={{ left: `${Math.max(0, Math.min(1, marker)) * 100}%` }} />
      )}
    </div>
  );
}
