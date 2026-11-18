/** Turns database / network errors into a short, translated message. Never exposes raw SQL text. */
export function errMsg(e: unknown, t: (k: string, v?: Record<string, string | number>) => string): string {
  const raw = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (raw.includes("plan_limit_reached")) return t("err.plan");
  if (raw.includes("insufficient stock")) {
    const name = raw.split("insufficient stock:")[1]?.trim() ?? "";
    return t("err.stock", { name });
  }
  if (raw.includes("forbidden") || raw.includes("row-level security") || raw.includes("permission denied")) return t("err.forbidden");
  if (raw.includes("payment exceeds") || raw.includes("paid amount exceeds")) return t("err.overpay");
  if (raw.includes("order is closed")) return t("err.closed");
  if (raw.includes("discount exceeds")) return t("err.discount");
  if (raw.includes("workspace already exists")) return t("err.workspaceExists");
  if (raw.toLowerCase().includes("fetch") || raw.toLowerCase().includes("network")) return t("err.network");
  return t("err.generic");
}
