// Deterministic business calculations. No AI, no guessing: plain arithmetic on
// the rows stored in the database. Money is added in integer minor units
// (paisa/cents) so floating-point errors cannot creep in.

import type { OrderStatus } from "./types";

export interface OrderRow {
  id: string;
  customer_id: string | null;
  status: OrderStatus;
  order_date: string;
  total: number;
  paid_amount: number;
}
export interface ItemRow {
  order_id: string;
  product_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  order_date: string;
}
export interface TxnRow {
  type: "income" | "expense";
  category: string;
  amount: number;
  status: "paid" | "due";
  tx_date: string;
  paid_date: string | null;
}
export interface ProductRow {
  id: string;
  name: string;
  kind: "product" | "service";
  cost_price: number;
  stock_qty: number;
  reorder_level: number;
  active: boolean;
}
export interface CustomerRow {
  id: string;
  name: string;
  created_at: string;
  is_lead: boolean;
  follow_up: string | null;
}

export interface CalcInput {
  today: string; // YYYY-MM-DD in the business owner's local time
  openingCash: number;
  monthlyTarget: number;
  orders: OrderRow[];
  items: ItemRow[];
  txns: TxnRow[];
  products: ProductRow[];
  customers: CustomerRow[];
  financeVisible: boolean;
}

export interface MonthPoint {
  month: string; // YYYY-MM
  revenue: number;
  costs: number; // cost of goods + operating expenses
  profit: number;
}

export interface HealthComponent {
  key: "profit" | "cash" | "collections" | "inventory" | "target";
  score: number; // 0..100
  weight: number;
}

export interface Summary {
  financeVisible: boolean;
  today: string;
  month: string;
  todaySales: number;
  todayOrders: number;
  monthRevenue: number;
  monthOrders: number;
  monthCogs: number;
  monthOpex: number;
  monthOtherIncome: number;
  monthNetProfit: number;
  opexByCategory: { category: string; amount: number }[];
  cashBalance: number;
  monthCashIn: number;
  monthCashOut: number;
  receivables: number;
  receivableCount: number;
  topReceivables: { customer_id: string | null; amount: number }[];
  payables: number;
  payableCount: number;
  series: MonthPoint[];
  target: { target: number; progress: number | null; expectedPace: number };
  topProducts: { name: string; qty: number; revenue: number }[];
  inventory: {
    tracked: number;
    valuation: number;
    lowStock: { id: string; name: string; stock: number; reorderLevel: number }[];
    outOfStock: number;
    reorder: { id: string; name: string; suggestQty: number; basis: "sales" | "level" }[];
  };
  customers: {
    total: number;
    newThisMonth: number;
    repeat: number;
    leads: number;
    followUpsDue: number;
    lost: { id: string; name: string; daysSince: number }[];
  };
  health: { score: number | null; label: "good" | "watch" | "risk" | "unknown"; components: HealthComponent[] };
}

const toMinor = (n: number): number => Math.round(n * 100);
const fromMinor = (m: number): number => m / 100;
const live = (s: OrderStatus): boolean => s !== "cancelled" && s !== "returned";
const clamp = (n: number, lo = 0, hi = 100): number => Math.min(hi, Math.max(lo, n));

function parseDay(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b) - parseDay(a)) / 86_400_000);
}
function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Inventory purchases are not an expense until the goods are sold (they reach
// the profit figure through cost of goods). Refunds reverse revenue instead.
const NON_OPEX = new Set(["purchase", "refund", "sales"]);

export function summarize(input: CalcInput): Summary {
  const { today, orders, items, txns, products, customers } = input;
  const month = today.slice(0, 7);
  const liveOrders = orders.filter((o) => live(o.status));
  const liveIds = new Set(liveOrders.map((o) => o.id));
  const orderDate = new Map(orders.map((o) => [o.id, o.order_date]));

  // ---- Revenue / cost of goods per month ----
  const revenueByMonth = new Map<string, number>();
  const cogsByMonth = new Map<string, number>();
  for (const o of liveOrders) {
    const k = o.order_date.slice(0, 7);
    revenueByMonth.set(k, (revenueByMonth.get(k) ?? 0) + toMinor(o.total));
  }
  for (const it of items) {
    if (!liveIds.has(it.order_id)) continue;
    const k = (orderDate.get(it.order_id) ?? it.order_date).slice(0, 7);
    cogsByMonth.set(k, (cogsByMonth.get(k) ?? 0) + toMinor(it.qty * it.unit_cost));
  }

  // ---- Operating expenses and other income per month (accrual: by entry date) ----
  const opexByMonth = new Map<string, number>();
  const otherIncomeByMonth = new Map<string, number>();
  const opexCat = new Map<string, number>();
  if (input.financeVisible) {
    for (const t of txns) {
      const k = t.tx_date.slice(0, 7);
      if (t.type === "expense" && !NON_OPEX.has(t.category)) {
        opexByMonth.set(k, (opexByMonth.get(k) ?? 0) + toMinor(t.amount));
        if (k === month) opexCat.set(t.category, (opexCat.get(t.category) ?? 0) + toMinor(t.amount));
      } else if (t.type === "income" && t.category !== "sales") {
        otherIncomeByMonth.set(k, (otherIncomeByMonth.get(k) ?? 0) + toMinor(t.amount));
      }
    }
  }

  const monthRevenue = revenueByMonth.get(month) ?? 0;
  const monthCogs = cogsByMonth.get(month) ?? 0;
  const monthOpex = opexByMonth.get(month) ?? 0;
  const monthOther = otherIncomeByMonth.get(month) ?? 0;
  const monthNet = monthRevenue - monthCogs - monthOpex + monthOther;

  const series: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const k = addMonths(month, -i);
    const rev = revenueByMonth.get(k) ?? 0;
    const costs = (cogsByMonth.get(k) ?? 0) + (opexByMonth.get(k) ?? 0);
    series.push({
      month: k,
      revenue: fromMinor(rev),
      costs: fromMinor(costs),
      profit: fromMinor(rev - costs + (otherIncomeByMonth.get(k) ?? 0)),
    });
  }

  // ---- Cash (money actually received / paid) ----
  let cash = toMinor(input.openingCash);
  let cashIn = 0;
  let cashOut = 0;
  let payables = 0;
  let payableCount = 0;
  if (input.financeVisible) {
    for (const t of txns) {
      if (t.status === "paid") {
        const date = t.paid_date ?? t.tx_date;
        const amt = toMinor(t.amount);
        cash += t.type === "income" ? amt : -amt;
        if (date.slice(0, 7) === month) {
          if (t.type === "income") cashIn += amt;
          else cashOut += amt;
        }
      } else if (t.type === "expense") {
        payables += toMinor(t.amount);
        payableCount += 1;
      }
    }
  }

  // ---- Receivables: unpaid part of live orders ----
  let receivables = 0;
  let receivableCount = 0;
  const recvByCustomer = new Map<string | null, number>();
  for (const o of liveOrders) {
    const due = toMinor(o.total) - toMinor(o.paid_amount);
    if (due > 0) {
      receivables += due;
      receivableCount += 1;
      recvByCustomer.set(o.customer_id, (recvByCustomer.get(o.customer_id) ?? 0) + due);
    }
  }
  const topReceivables = [...recvByCustomer.entries()]
    .map(([customer_id, amount]) => ({ customer_id, amount: fromMinor(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // ---- Today / month sales ----
  const todayLive = liveOrders.filter((o) => o.order_date === today);
  const todaySales = todayLive.reduce((s, o) => s + toMinor(o.total), 0);
  const monthOrders = liveOrders.filter((o) => o.order_date.slice(0, 7) === month).length;

  // ---- Target ----
  const dim = daysInMonth(month);
  const day = Number(today.slice(8, 10)) || 1;
  const expectedPace = day / dim;
  const progress = input.monthlyTarget > 0 ? fromMinor(monthRevenue) / input.monthlyTarget : null;

  // ---- Top products this month ----
  const prodAgg = new Map<string, { qty: number; revenue: number }>();
  for (const it of items) {
    if (!liveIds.has(it.order_id)) continue;
    if ((orderDate.get(it.order_id) ?? it.order_date).slice(0, 7) !== month) continue;
    const a = prodAgg.get(it.name) ?? { qty: 0, revenue: 0 };
    a.qty += it.qty;
    a.revenue += toMinor(it.qty * it.unit_price);
    prodAgg.set(it.name, a);
  }
  const topProducts = [...prodAgg.entries()]
    .map(([name, a]) => ({ name, qty: a.qty, revenue: fromMinor(a.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ---- Inventory ----
  const tracked = products.filter((p) => p.kind === "product" && p.active);
  const valuation = tracked.reduce((s, p) => s + toMinor(p.stock_qty * p.cost_price), 0);
  const lowStock = tracked
    .filter((p) => p.reorder_level > 0 && p.stock_qty <= p.reorder_level)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock_qty, reorderLevel: p.reorder_level }))
    .sort((a, b) => a.stock - b.stock);
  const outOfStock = tracked.filter((p) => p.stock_qty <= 0).length;
  const sold30 = new Map<string, number>();
  for (const it of items) {
    if (!it.product_id || !liveIds.has(it.order_id)) continue;
    const d = orderDate.get(it.order_id) ?? it.order_date;
    const age = daysBetween(d, today);
    if (age >= 0 && age < 30) sold30.set(it.product_id, (sold30.get(it.product_id) ?? 0) + it.qty);
  }
  const reorder: Summary["inventory"]["reorder"] = [];
  for (const p of tracked) {
    const sold = sold30.get(p.id) ?? 0;
    if (sold > 0) {
      // Enough stock to cover the next 30 days at the last-30-days sales rate.
      const need = Math.ceil(sold - p.stock_qty);
      if (need > 0) reorder.push({ id: p.id, name: p.name, suggestQty: need, basis: "sales" });
    } else if (p.reorder_level > 0 && p.stock_qty <= p.reorder_level) {
      reorder.push({ id: p.id, name: p.name, suggestQty: Math.ceil(p.reorder_level * 2 - p.stock_qty), basis: "level" });
    }
  }
  reorder.sort((a, b) => b.suggestQty - a.suggestQty);

  // ---- Customers ----
  const ordersByCustomer = new Map<string, OrderRow[]>();
  for (const o of liveOrders) {
    if (!o.customer_id) continue;
    const arr = ordersByCustomer.get(o.customer_id) ?? [];
    arr.push(o);
    ordersByCustomer.set(o.customer_id, arr);
  }
  let repeat = 0;
  const lost: Summary["customers"]["lost"] = [];
  for (const c of customers) {
    const os = ordersByCustomer.get(c.id) ?? [];
    if (os.length >= 2) repeat += 1;
    if (os.length >= 1) {
      const last = os.reduce((m, o) => (o.order_date > m ? o.order_date : m), "");
      const since = daysBetween(last, today);
      if (since >= 60) lost.push({ id: c.id, name: c.name, daysSince: since });
    }
  }
  lost.sort((a, b) => b.daysSince - a.daysSince);
  const customersSummary: Summary["customers"] = {
    total: customers.length,
    newThisMonth: customers.filter((c) => c.created_at.slice(0, 7) === month).length,
    repeat,
    leads: customers.filter((c) => c.is_lead).length,
    followUpsDue: customers.filter((c) => c.follow_up && c.follow_up <= today).length,
    lost: lost.slice(0, 20),
  };

  // ---- Business health score (documented, deterministic) ----
  const components: HealthComponent[] = [];
  if (input.financeVisible && monthRevenue > 0) {
    const margin = monthNet / monthRevenue;
    components.push({ key: "profit", weight: 30, score: clamp(((margin + 0.1) / 0.3) * 100) });
  }
  if (input.financeVisible) {
    let costSum = 0;
    let costMonths = 0;
    for (let i = 1; i <= 3; i++) {
      const k = addMonths(month, -i);
      const c = (cogsByMonth.get(k) ?? 0) + (opexByMonth.get(k) ?? 0);
      if (c > 0) {
        costSum += c;
        costMonths += 1;
      }
    }
    if (costMonths > 0) {
      const avg = costSum / costMonths;
      components.push({ key: "cash", weight: 25, score: cash <= 0 ? 0 : clamp((cash / avg / 3) * 100) });
    }
  }
  if (monthRevenue > 0) {
    const ratio = receivables / monthRevenue;
    components.push({ key: "collections", weight: 20, score: clamp(100 - ratio * 200) });
  }
  if (tracked.length > 0) {
    const bad = new Set([...lowStock.map((l) => l.id), ...tracked.filter((p) => p.stock_qty <= 0).map((p) => p.id)]);
    components.push({ key: "inventory", weight: 15, score: clamp((1 - bad.size / tracked.length) * 100) });
  }
  if (progress !== null) {
    components.push({ key: "target", weight: 10, score: clamp((progress / Math.max(expectedPace, 0.05)) * 100) });
  }
  let healthScore: number | null = null;
  if (components.length >= 2) {
    const w = components.reduce((s, c) => s + c.weight, 0);
    healthScore = Math.round(components.reduce((s, c) => s + c.score * c.weight, 0) / w);
  }

  const result: Summary = {
    financeVisible: input.financeVisible,
    today,
    month,
    todaySales: fromMinor(todaySales),
    todayOrders: todayLive.length,
    monthRevenue: fromMinor(monthRevenue),
    monthOrders,
    monthCogs: fromMinor(monthCogs),
    monthOpex: fromMinor(monthOpex),
    monthOtherIncome: fromMinor(monthOther),
    monthNetProfit: fromMinor(monthNet),
    opexByCategory: [...opexCat.entries()]
      .map(([category, amount]) => ({ category, amount: fromMinor(amount) }))
      .sort((a, b) => b.amount - a.amount),
    cashBalance: fromMinor(cash),
    monthCashIn: fromMinor(cashIn),
    monthCashOut: fromMinor(cashOut),
    receivables: fromMinor(receivables),
    receivableCount,
    topReceivables,
    payables: fromMinor(payables),
    payableCount,
    series,
    target: { target: input.monthlyTarget, progress, expectedPace },
    topProducts,
    inventory: { tracked: tracked.length, valuation: fromMinor(valuation), lowStock, outOfStock, reorder: reorder.slice(0, 10) },
    customers: customersSummary,
    health: {
      score: healthScore,
      label: healthScore === null ? "unknown" : healthScore >= 70 ? "good" : healthScore >= 40 ? "watch" : "risk",
      components,
    },
  };

  // Roles without finance access must never receive profit, cash or cost figures.
  if (!input.financeVisible) {
    result.cashBalance = 0;
    result.monthCogs = 0;
    result.monthOpex = 0;
    result.monthOtherIncome = 0;
    result.monthNetProfit = 0;
    result.monthCashIn = 0;
    result.monthCashOut = 0;
    result.payables = 0;
    result.payableCount = 0;
    result.opexByCategory = [];
    result.series = result.series.map((p) => ({ ...p, costs: 0, profit: 0 }));
  }
  return result;
}
