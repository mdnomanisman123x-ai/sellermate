const BN = "০১২৩৪৫৬৭৮৯";

/** Converts Bengali digits to English digits. */
export function toEn(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

/** Parses a number typed in English or Bengali digits. Returns NaN if invalid. */
export function parseNum(s: string): number {
  const cleaned = toEn(s).replace(/[,\s]/g, "");
  if (cleaned === "") return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export function cleanPhone(s: string): string {
  return toEn(s).replace(/[^\d+]/g, "");
}

export function isValidPhone(s: string): boolean {
  const digits = cleanPhone(s).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** Turns a Bangladeshi (or +country code) number into the format wa.me needs. */
export function waLink(phone: string, text?: string): string {
  const raw = cleanPhone(phone);
  let p = raw.replace(/\D/g, "");
  if (!raw.startsWith("+")) {
    if (p.startsWith("00")) p = p.slice(2);
    else if (p.startsWith("880")) p = p;
    else if (p.startsWith("0")) p = "88" + p;
    else p = "880" + p;
  }
  const base = `https://wa.me/${p}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
