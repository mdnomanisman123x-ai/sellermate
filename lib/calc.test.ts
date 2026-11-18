// Run with:  npx tsx lib/calc.test.ts
import assert from "node:assert/strict";
import { summarize, type CalcInput } from "./calc";

const o = (id: string, customer: string | null, status: any, date: string, total: number, paid: number) =>
  ({ id, customer_id: customer, status, order_date: date, total, paid_amount: paid });
const it = (order: string, product: string | null, name: string, qty: number, price: number, cost: number, date: string) =>
  ({ order_id: order, product_id: product, name, qty, unit_price: price, unit_cost: cost, order_date: date });
const tx = (type: any, category: string, amount: number, status: any, date: string) =>
  ({ type, category, amount, status, tx_date: date, paid_date: status === "paid" ? date : null });

const base: CalcInput = {
  today: "2026-11-17",
  openingCash: 5000,
  monthlyTarget: 100000,
  financeVisible: true,
  orders: [
    o("o1", "c1", "delivered", "2026-11-05", 1510, 1510),
    o("o2", "c1", "confirmed", "2026-11-10", 1000, 400),
    o("o3", "c1", "cancelled", "2026-11-11", 9999, 0),
    o("o4", "c2", "delivered", "2026-10-20", 2000, 2000),
    o("o5", "c2", "delivered", "2026-11-17", 500, 0),
    o("o6", "c3", "delivered", "2026-08-01", 100, 100),
  ],
  items: [
    it("o1", "p1", "Sneaker", 5, 300, 150, "2026-11-05"),
    it("o1", "pS", "Delivery", 1, 60, 0, "2026-11-05"),
    it("o2", null, "Custom", 1, 1000, 400, "2026-11-10"),
    it("o3", "p1", "Sneaker", 1, 9999, 1, "2026-11-11"),
    it("o4", "p1", "Sneaker", 10, 200, 100, "2026-10-20"),
    it("o5", "p1", "Sneaker", 1, 500, 150, "2026-11-17"),
  ],
  txns: [
    tx("expense", "rent", 700, "paid", "2026-11-02"),
    tx("expense", "purchase", 2000, "due", "2026-11-01"),
    tx("expense", "purchase", 1000, "paid", "2026-11-01"),
    tx("income", "sales", 1510, "paid", "2026-11-05"),
    tx("income", "sales", 400, "paid", "2026-11-10"),
    tx("income", "sales", 2000, "paid", "2026-10-20"),
    tx("income", "sales", 100, "paid", "2026-08-01"),
    tx("income", "other_income", 100, "paid", "2026-11-12"),
    tx("expense", "refund", 50, "paid", "2026-11-11"),
    tx("expense", "marketing", 300, "paid", "2026-10-15"),
  ],
  products: [
    { id: "p1", name: "Sneaker", kind: "product", cost_price: 150, stock_qty: 8, reorder_level: 10, active: true },
    { id: "p2", name: "Bag", kind: "product", cost_price: 100, stock_qty: 0, reorder_level: 0, active: true },
    { id: "pS", name: "Delivery", kind: "service", cost_price: 0, stock_qty: 0, reorder_level: 0, active: true },
  ],
  customers: [
    { id: "c1", name: "Rina", created_at: "2026-11-01T00:00:00Z", is_lead: false, follow_up: null },
    { id: "c2", name: "Karim", created_at: "2026-10-01T00:00:00Z", is_lead: false, follow_up: null },
    { id: "c3", name: "Old Customer", created_at: "2026-08-01T00:00:00Z", is_lead: false, follow_up: null },
    { id: "c4", name: "New Lead", created_at: "2026-11-15T00:00:00Z", is_lead: true, follow_up: "2026-11-16" },
  ],
};

let n = 0;
const check = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log("PASS:", name);
};

const s = summarize(base);

check("month revenue excludes cancelled orders", () => assert.equal(s.monthRevenue, 3010));
check("month order count", () => assert.equal(s.monthOrders, 3));
check("cost of goods = 750 + 0 + 400 + 150", () => assert.equal(s.monthCogs, 1300));
check("operating expenses exclude purchases and refunds", () => assert.equal(s.monthOpex, 700));
check("other income counted, sales payments not double counted", () => assert.equal(s.monthOtherIncome, 100));
check("net profit = 3010 - 1300 - 700 + 100", () => assert.equal(s.monthNetProfit, 1110));
check("cash balance = opening + paid in - paid out", () => assert.equal(s.cashBalance, 7060));
check("month cash in/out", () => {
  assert.equal(s.monthCashIn, 2010);
  assert.equal(s.monthCashOut, 1750);
});
check("receivables ignore cancelled and fully paid", () => {
  assert.equal(s.receivables, 1100);
  assert.equal(s.receivableCount, 2);
});
check("payables are unpaid expenses", () => {
  assert.equal(s.payables, 2000);
  assert.equal(s.payableCount, 1);
});
check("today sales", () => {
  assert.equal(s.todaySales, 500);
  assert.equal(s.todayOrders, 1);
});
check("target progress and pace", () => {
  assert.ok(Math.abs((s.target.progress ?? 0) - 0.0301) < 1e-9);
  assert.ok(Math.abs(s.target.expectedPace - 17 / 30) < 1e-9);
});
check("top products by revenue", () => {
  assert.deepEqual(s.topProducts.map((p) => [p.name, p.qty, p.revenue]), [
    ["Sneaker", 6, 2000],
    ["Custom", 1, 1000],
    ["Delivery", 1, 60],
  ]);
});
check("6-month series", () => {
  assert.equal(s.series.length, 6);
  assert.equal(s.series[5].month, "2026-11");
  assert.equal(s.series[5].profit, 1110);
  assert.equal(s.series[4].month, "2026-10");
  assert.deepEqual([s.series[4].revenue, s.series[4].costs, s.series[4].profit], [2000, 1300, 700]);
  assert.equal(s.series[2].month, "2026-08");
  assert.equal(s.series[2].revenue, 100);
});
check("inventory valuation, low and out-of-stock", () => {
  assert.equal(s.inventory.tracked, 2);
  assert.equal(s.inventory.valuation, 1200);
  assert.equal(s.inventory.lowStock.length, 1);
  assert.equal(s.inventory.outOfStock, 1);
});
check("reorder suggestion covers 30 days of sales", () => {
  assert.deepEqual(s.inventory.reorder, [{ id: "p1", name: "Sneaker", suggestQty: 8, basis: "sales" }]);
});
check("customer stats", () => {
  assert.equal(s.customers.total, 4);
  assert.equal(s.customers.newThisMonth, 2);
  assert.equal(s.customers.repeat, 2);
  assert.equal(s.customers.leads, 1);
  assert.equal(s.customers.followUpsDue, 1);
  assert.deepEqual(s.customers.lost, [{ id: "c3", name: "Old Customer", daysSince: 108 }]);
});
check("health score (hand-calculated 61 = watch)", () => {
  assert.equal(s.health.score, 61);
  assert.equal(s.health.label, "watch");
  assert.equal(s.health.components.length, 5);
});

check("no floating point drift: 0.1 + 0.2 = 0.3", () => {
  const r = summarize({
    ...base,
    orders: [o("a", null, "delivered", "2026-11-01", 0.1, 0), o("b", null, "delivered", "2026-11-02", 0.2, 0)],
    items: [],
    txns: [],
    products: [],
    customers: [],
  });
  assert.equal(r.monthRevenue, 0.3);
  assert.equal(r.receivables, 0.3);
});

check("empty business: zeros, no NaN, health unknown", () => {
  const r = summarize({ ...base, orders: [], items: [], txns: [], products: [], customers: [], openingCash: 0, monthlyTarget: 0 });
  const flat = JSON.stringify(r);
  assert.ok(!flat.includes("null,\"label\"") || r.health.score === null);
  assert.equal(r.health.score, null);
  assert.equal(r.health.label, "unknown");
  assert.equal(r.monthRevenue, 0);
  assert.equal(r.cashBalance, 0);
  assert.equal(r.target.progress, null);
  for (const v of [r.todaySales, r.monthNetProfit, r.receivables, r.inventory.valuation]) assert.ok(Number.isFinite(v));
});

check("roles without finance access get no cost/profit/cash figures", () => {
  const r = summarize({ ...base, financeVisible: false, txns: [] });
  assert.equal(r.monthNetProfit, 0);
  assert.equal(r.cashBalance, 0);
  assert.equal(r.monthCogs, 0);
  assert.equal(r.payables, 0);
  assert.ok(r.series.every((p) => p.costs === 0 && p.profit === 0));
  assert.ok(!r.health.components.some((c) => c.key === "profit" || c.key === "cash"));
  assert.equal(r.monthRevenue, 3010); // sales figures stay visible
});

check("month boundary: a different month does not leak into this month", () => {
  const r = summarize({ ...base, today: "2026-12-01" });
  assert.equal(r.monthRevenue, 0);
  assert.equal(r.series[4].revenue, 3010);
});

console.log(`\nALL ${n} CALC CHECKS PASSED`);
