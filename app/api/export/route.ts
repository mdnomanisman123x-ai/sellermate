import { NextResponse } from "next/server";
import { getMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TABLES = ["customers", "suppliers", "products", "orders", "order_items", "transactions", "stock_movements"] as const;

/** Downloads every row the caller is allowed to read (Row Level Security applies, so staff never get finance data). */
export async function GET() {
  const sb = createClient();
  const m = await getMembership(sb);
  if (!m) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const out: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    role: m.role,
    workspace: m.workspace,
  };
  try {
    for (const table of TABLES) {
      const rows: unknown[] = [];
      for (let from = 0; from < 100_000; from += 1000) {
        const { data, error } = await sb
          .from(table)
          .select("*")
          .eq("workspace_id", m.workspace.id)
          .order("id")
          .range(from, from + 999);
        if (error) throw new Error(error.message);
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      out[table] = rows;
    }
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sellermate-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
