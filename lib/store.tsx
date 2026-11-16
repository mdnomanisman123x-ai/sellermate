"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  followUp: string; // YYYY-MM-DD or ""
  createdAt: string;
}

export interface Txn {
  id: string;
  customerId: string;
  type: "order" | "payment";
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
}

export interface Data {
  shopName: string;
  customers: Customer[];
  txns: Txn[];
}

export type CustomerInput = Omit<Customer, "id" | "createdAt">;

const KEY = "sellermate-v1";
const DEFAULT_SHOP = "আমার দোকান";

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Validates and cleans unknown data (used for stored data and imported backups). */
export function sanitizeData(x: unknown): Data | null {
  if (typeof x !== "object" || x === null) return null;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.customers) || !Array.isArray(o.txns)) return null;
  const customers: Customer[] = [];
  for (const raw of o.customers) {
    if (typeof raw !== "object" || raw === null) continue;
    const c = raw as Record<string, unknown>;
    if (typeof c.id !== "string" || typeof c.name !== "string") continue;
    customers.push({
      id: c.id,
      name: c.name,
      phone: str(c.phone),
      address: str(c.address),
      note: str(c.note),
      followUp: str(c.followUp),
      createdAt: str(c.createdAt) || new Date().toISOString(),
    });
  }
  const ids = new Set(customers.map((c) => c.id));
  const txns: Txn[] = [];
  for (const raw of o.txns) {
    if (typeof raw !== "object" || raw === null) continue;
    const t = raw as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.customerId !== "string") continue;
    if (!ids.has(t.customerId)) continue;
    if (t.type !== "order" && t.type !== "payment") continue;
    if (typeof t.amount !== "number" || !Number.isFinite(t.amount) || t.amount <= 0) continue;
    txns.push({
      id: t.id,
      customerId: t.customerId,
      type: t.type,
      amount: t.amount,
      note: str(t.note),
      date: str(t.date) || new Date().toISOString().slice(0, 10),
    });
  }
  return { shopName: str(o.shopName).trim() || DEFAULT_SHOP, customers, txns };
}

interface Store {
  ready: boolean;
  data: Data;
  addCustomer: (c: CustomerInput) => string;
  updateCustomer: (id: string, patch: Partial<CustomerInput>) => void;
  deleteCustomer: (id: string) => void;
  addTxn: (t: Omit<Txn, "id">) => void;
  deleteTxn: (id: string) => void;
  setShopName: (name: string) => void;
  replaceAll: (d: Data) => void;
  dueOf: (customerId: string) => number;
  lastActivity: (customerId: string) => string;
  saveError: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>({ shopName: DEFAULT_SHOP, customers: [], txns: [] });
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const clean = sanitizeData(JSON.parse(raw));
        if (clean) setData(clean);
      }
    } catch {
      /* corrupted or blocked storage: start empty */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [data, ready]);

  const addCustomer = useCallback((c: CustomerInput): string => {
    const id = uid();
    const customer: Customer = { ...c, id, createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, customers: [customer, ...d.customers] }));
    return id;
  }, []);

  const updateCustomer = useCallback((id: string, patch: Partial<CustomerInput>) => {
    setData((d) => ({
      ...d,
      customers: d.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      customers: d.customers.filter((c) => c.id !== id),
      txns: d.txns.filter((t) => t.customerId !== id),
    }));
  }, []);

  const addTxn = useCallback((t: Omit<Txn, "id">) => {
    setData((d) => ({ ...d, txns: [...d.txns, { ...t, id: uid() }] }));
  }, []);

  const deleteTxn = useCallback((id: string) => {
    setData((d) => ({ ...d, txns: d.txns.filter((t) => t.id !== id) }));
  }, []);

  const setShopName = useCallback((name: string) => {
    setData((d) => ({ ...d, shopName: name.trim() || DEFAULT_SHOP }));
  }, []);

  const replaceAll = useCallback((d: Data) => setData(d), []);

  const { dues, last } = useMemo(() => {
    const dues = new Map<string, number>();
    const last = new Map<string, string>();
    for (const t of data.txns) {
      dues.set(t.customerId, (dues.get(t.customerId) ?? 0) + (t.type === "order" ? t.amount : -t.amount));
      if (t.date > (last.get(t.customerId) ?? "")) last.set(t.customerId, t.date);
    }
    return { dues, last };
  }, [data.txns]);

  const dueOf = useCallback((id: string) => dues.get(id) ?? 0, [dues]);
  const lastActivity = useCallback(
    (id: string) => last.get(id) ?? data.customers.find((c) => c.id === id)?.createdAt.slice(0, 10) ?? "",
    [last, data.customers]
  );

  const value: Store = {
    ready,
    data,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addTxn,
    deleteTxn,
    setShopName,
    replaceAll,
    dueOf,
    lastActivity,
    saveError,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
