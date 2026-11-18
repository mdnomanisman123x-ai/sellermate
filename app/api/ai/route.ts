import { NextResponse } from "next/server";
import { ADVISORS, allowedScopes, buildContext, buildSystemPrompt, buildUserMessage, type Advisor } from "@/lib/ai";
import { getMembership, safeToday } from "@/lib/session";
import { loadSummary } from "@/lib/summary";
import { createClient } from "@/lib/supabase/server";
import { FINANCE_ROLES, MANAGE_ROLES, type AiSettings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLANS_WITH_AI = ["business", "growth"];
const MAX_PER_HOUR = 20;

/** Tells the page whether AI can be used (no secrets are returned). */
export async function GET() {
  const sb = createClient();
  const m = await getMembership(sb);
  if (!m) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    configured: !!process.env.ANTHROPIC_API_KEY,
    planOk: PLANS_WITH_AI.includes(m.workspace.plan),
    plan: m.workspace.plan,
  });
}

export async function POST(req: Request) {
  const sb = createClient();
  const m = await getMembership(sb);
  if (!m) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!MANAGE_ROLES.includes(m.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { advisor?: string; question?: string; today?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const advisor = body.advisor as Advisor;
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!ADVISORS.includes(advisor) || question.length < 3 || question.length > 1000) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const lang = body.lang === "en" ? "en" : "bn";
  const ws = m.workspace;

  const log = async (status: "ok" | "blocked" | "error", scopes: string[], contextChars: number, detail = "") => {
    await sb.from("ai_access_log").insert({
      workspace_id: ws.id,
      user_id: m.userId,
      advisor_role: advisor,
      scopes,
      question_chars: question.length,
      context_chars: contextChars,
      status,
      detail: detail.slice(0, 300),
    });
  };

  if (!PLANS_WITH_AI.includes(ws.plan)) return NextResponse.json({ error: "plan" }, { status: 402 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data: settings } = await sb.from("ai_settings").select("*").eq("workspace_id", ws.id).maybeSingle();
  const st = settings as AiSettings | null;
  if (!st || !st.enabled) {
    await log("blocked", [], 0, "ai disabled");
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await sb
    .from("ai_access_log")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws.id)
    .eq("status", "ok")
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return NextResponse.json({ error: "rate" }, { status: 429 });

  try {
    const scopes = allowedScopes(st, FINANCE_ROLES.includes(m.role));
    const summary = await loadSummary(sb, ws, m.role, safeToday(body.today ?? null));
    const ctx = buildContext(summary, scopes, ws.currency);
    const userMsg = buildUserMessage(question, ctx);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-sonnet-5-5",
        max_tokens: 1200,
        system: buildSystemPrompt(advisor, lang, ws.business_type),
        messages: [{ role: "user", content: userMsg }],
      }),
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok) {
      await log("error", scopes, userMsg.length, `provider status ${res.status}`);
      return NextResponse.json({ error: "provider" }, { status: 502 });
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
    await log("ok", scopes, userMsg.length);
    return NextResponse.json({ answer: text, scopes });
  } catch (e) {
    await log("error", [], 0, e instanceof Error ? e.name : "error");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
