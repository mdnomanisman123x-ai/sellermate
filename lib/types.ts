export type Role = "owner" | "admin" | "manager" | "staff" | "viewer";
export type Plan = "free" | "starter" | "business" | "growth";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";
export type BusinessType =
  | "online_seller"
  | "retail"
  | "wholesale"
  | "manufacturer"
  | "service"
  | "freelancer";

export interface Workspace {
  id: string;
  name: string;
  business_type: BusinessType;
  country: string;
  currency: string;
  business_size: "micro" | "small" | "medium";
  products_text: string;
  employee_count: number;
  monthly_target: number;
  opening_cash: number;
  language: "bn" | "en";
  plan: Plan;
  created_at: string;
}

export interface Customer {
  id: string;
  workspace_id: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  segment: "new" | "regular" | "vip" | "wholesale";
  is_lead: boolean;
  follow_up: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  workspace_id: string;
  name: string;
  phone: string;
  note: string;
}

export interface Product {
  id: string;
  workspace_id: string;
  name: string;
  sku: string;
  unit: string;
  kind: "product" | "service";
  cost_price: number;
  sell_price: number;
  stock_qty: number;
  reorder_level: number;
  supplier_id: string | null;
  active: boolean;
}

export interface Order {
  id: string;
  workspace_id: string;
  customer_id: string | null;
  status: OrderStatus;
  order_date: string;
  subtotal: number;
  discount: number;
  shipping_charge: number;
  total: number;
  paid_amount: number;
  note: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  order_date: string;
}

export interface Txn {
  id: string;
  workspace_id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  status: "paid" | "due";
  tx_date: string;
  due_date: string | null;
  paid_date: string | null;
  note: string;
  customer_id: string | null;
  supplier_id: string | null;
  order_id: string | null;
  source: "manual" | "system";
}

export interface StockMovement {
  id: string;
  product_id: string;
  qty_change: number;
  reason: string;
  unit_cost: number | null;
  note: string;
  created_at: string;
}

export interface AiSettings {
  id: string;
  workspace_id: string;
  enabled: boolean;
  share_financials: boolean;
  share_sales: boolean;
  share_inventory: boolean;
  share_customer_stats: boolean;
  share_customer_pii: boolean;
}

export const FINANCE_ROLES: Role[] = ["owner", "admin", "manager"];
export const WRITE_ROLES: Role[] = ["owner", "admin", "manager", "staff"];
export const MANAGE_ROLES: Role[] = ["owner", "admin", "manager"];
