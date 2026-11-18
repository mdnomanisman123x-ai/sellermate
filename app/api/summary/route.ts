import { NextResponse } from "next/server";
import { getMembership, safeToday } from "@/lib/session";
import { loadSummary } from "@/lib/summary";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sb = createClient();
  const m = await getMembership(sb);
  if (!m) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const today = safeToday(new URL(req.url).searchParams.get("today"));
    const summary = await loadSummary(sb, m.workspace, m.role, today);
    return NextResponse.json({ summary }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
