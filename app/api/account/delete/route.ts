import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Permanently deletes the caller's account. If they own the workspace, the workspace
 * and all its data are deleted too. Needs SUPABASE_SERVICE_ROLE_KEY (server only).
 */
export async function POST(req: Request) {
  const sb = createClient();
  const m = await getMembership(sb);
  if (!m) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let confirm = "";
  try {
    confirm = String(((await req.json()) as { confirm?: string }).confirm ?? "");
  } catch {
    /* fall through */
  }
  if (confirm !== "DELETE") return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const admin = createAdmin(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    // workspaces owned by this user are removed with all their data (cascade)
    const { data: owned, error: e1 } = await admin.from("workspace_members").select("workspace_id").eq("user_id", m.userId).eq("role", "owner");
    if (e1) throw e1;
    const ids = (owned ?? []).map((r) => r.workspace_id as string);
    if (ids.length) {
      const { error: e2 } = await admin.from("workspaces").delete().in("id", ids);
      if (e2) throw e2;
      const { error: e3 } = await admin.from("audit_logs").delete().in("workspace_id", ids);
      if (e3) throw e3;
    }
    const { error: e4 } = await admin.auth.admin.deleteUser(m.userId);
    if (e4) throw e4;
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  await sb.auth.signOut();
  return NextResponse.json({ ok: true });
}
