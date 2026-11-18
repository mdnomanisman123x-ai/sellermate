import type { SupabaseClient } from "@supabase/supabase-js";
import { summarize, type CustomerRow, type ItemRow, type OrderRow, type ProductRow, type Summary, type TxnRow } from "./calc";
import { FINANCE_ROLES, type Role, type Workspace } from "./types";

type Page = (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

async function fetchAll<T>(build: Page, max = 20000): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; from < max; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw new Error(error.message);
    if (!data) break;
    out.push(...(data as T[]));
    if (data.length < size) break;
  }
  return out;
}

function monthsAgo(today: string, n: number): string {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return d.toISOString().slice(0, 10);
}

/** Loads the rows the user is allowed to see (Row Level Security) and runs the deterministic calculations. */
export async function loadSummary(
  sb: SupabaseClient,
  ws: Pick<Workspace, "id" | "opening_cash" | "monthly_target">,
  role: Role,
  today: string
): Promise<Summary> {
  const finance = FINANCE_ROLES.includes(role);
  const since = monthsAgo(today, 7);

  const [orders, items, txns, products, customers] = await Promise.all([
    fetchAll<OrderRow>((f, t) =>
      sb.from("orders").select("id,customer_id,status,order_date,total,paid_amount").eq("workspace_id", ws.id).order("id").range(f, t)
    ),
    fetchAll<ItemRow>((f, t) =>
      sb
        .from("order_items")
        .select("order_id,product_id,name,qty,unit_price,unit_cost,order_date")
        .eq("workspace_id", ws.id)
        .gte("order_date", since)
        .order("id")
        .range(f, t)
    ),
    finance
      ? fetchAll<TxnRow>((f, t) =>
          sb.from("transactions").select("type,category,amount,status,tx_date,paid_date").eq("workspace_id", ws.id).order("id").range(f, t)
        )
      : Promise.resolve([] as TxnRow[]),
    fetchAll<ProductRow>((f, t) =>
      sb.from("products").select("id,name,kind,cost_price,stock_qty,reorder_level,active").eq("workspace_id", ws.id).order("id").range(f, t)
    ),
    fetchAll<CustomerRow>((f, t) =>
      sb.from("customers").select("id,name,created_at,is_lead,follow_up").eq("workspace_id", ws.id).order("id").range(f, t)
    ),
  ]);

  return summarize({
    today,
    openingCash: Number(ws.opening_cash) || 0,
    monthlyTarget: Number(ws.monthly_target) || 0,
    orders,
    items,
    txns,
    products,
    customers,
    financeVisible: finance,
  });
}
