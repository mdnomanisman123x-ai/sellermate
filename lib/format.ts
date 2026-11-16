const BN = "০১২৩৪৫৬৭৮৯";

/** Converts Bengali digits to English digits (so users can type either). */
export function toEn(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

export function bn(n: number): string {
  return n.toLocaleString("bn-BD");
}

export function taka(n: number): string {
  return "৳" + Math.round(Math.abs(n)).toLocaleString("bn-BD");
}

export function parseAmount(s: string): number {
  const n = Number(toEn(s).replace(/[,\s৳]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function fmtDate(s: string): string {
  return parseDay(s).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

export function followLabel(date: string): { text: string; late: boolean } {
  const diff = daysBetween(todayStr(), date);
  if (diff === 0) return { text: "আজ", late: false };
  if (diff < 0) return { text: `${bn(-diff)} দিন দেরি`, late: true };
  if (diff === 1) return { text: "আগামীকাল", late: false };
  return { text: fmtDate(date), late: false };
}

export function cleanPhone(s: string): string {
  return toEn(s).replace(/[^\d+]/g, "");
}

export function isValidPhone(s: string): boolean {
  const digits = cleanPhone(s).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** Turns a Bangladeshi (or +country code) number into the format wa.me needs. */
export function waNumber(phone: string): string {
  const raw = cleanPhone(phone);
  if (raw.startsWith("+")) return raw.replace(/\D/g, "");
  const p = raw.replace(/\D/g, "");
  if (p.startsWith("00")) return p.slice(2);
  if (p.startsWith("880")) return p;
  if (p.startsWith("0")) return "88" + p;
  return "880" + p;
}

export function waLink(phone: string, text?: string): string {
  const base = `https://wa.me/${waNumber(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function initial(name: string): string {
  return Array.from(name.trim())[0] ?? "?";
}

const TONES = [
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
];

export function tone(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return TONES[h % TONES.length];
}
