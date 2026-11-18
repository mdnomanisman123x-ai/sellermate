import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role, Workspace } from "./types";

export interface Membership {
  userId: string;
  email: string;
  role: Role;
  workspace: Workspace;
}

/** Server-side: who is calling, and which workspace/role do they have? Never trusts the client. */
export async function getMembership(sb: SupabaseClient): Promise<Membership | null> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("workspace_members")
    .select("role, workspaces(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as { role: Role; workspaces: Workspace | Workspace[] | null };
  const ws = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
  if (!ws) return null;
  return { userId: user.id, email: user.email ?? "", role: row.role, workspace: ws };
}

/** Accepts only a plausible YYYY-MM-DD (the client's local date); falls back to server date. */
export function safeToday(input: string | null): string {
  const server = new Date().toISOString().slice(0, 10);
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return server;
  const diff = Math.abs(Date.parse(input + "T00:00:00Z") - Date.parse(server + "T00:00:00Z")) / 86_400_000;
  return diff <= 2 ? input : server;
}
