"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";
import { createClient } from "./supabase/client";
import { FINANCE_ROLES, MANAGE_ROLES, WRITE_ROLES, type Role, type Workspace } from "./types";

interface Ctx {
  supabase: SupabaseClient;
  userId: string;
  email: string;
  ws: Workspace;
  role: Role;
  reload: () => Promise<void>;
  canFinance: boolean;
  canWrite: boolean;
  canManage: boolean;
  isOwner: boolean;
  money: (n: number) => string;
  today: () => string;
}

const WsCtx = createContext<Ctx | null>(null);

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; userId: string; email: string; ws: Workspace; role: Role };

export function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { lang, t } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      router.replace("/login");
      return;
    }
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role, workspaces(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (error) {
      setState({ status: "error", message: error.message });
      return;
    }
    if (!data) {
      router.replace("/onboarding");
      return;
    }
    const row = data as unknown as { role: Role; workspaces: Workspace | Workspace[] | null };
    const ws = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
    if (!ws) {
      router.replace("/onboarding");
      return;
    }
    setState({ status: "ready", userId: user.id, email: user.email ?? "", ws, role: row.role });
  }, [supabase, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<Ctx | null>(() => {
    if (state.status !== "ready") return null;
    const locale = lang === "bn" ? "bn-BD" : "en-US";
    let fmt: Intl.NumberFormat;
    try {
      fmt = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: state.ws.currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } catch {
      fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    return {
      supabase,
      userId: state.userId,
      email: state.email,
      ws: state.ws,
      role: state.role,
      reload: load,
      canFinance: FINANCE_ROLES.includes(state.role),
      canWrite: WRITE_ROLES.includes(state.role),
      canManage: MANAGE_ROLES.includes(state.role),
      isOwner: state.role === "owner",
      money: (n) => fmt.format(Number.isFinite(n) ? n : 0),
      today: localToday,
    };
  }, [state, lang, supabase, load]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-xl space-y-3 p-4" aria-busy="true">
        <div className="h-12 animate-pulse rounded-2xl bg-line/60" />
        <div className="h-40 animate-pulse rounded-2xl bg-line/60" />
        <div className="h-24 animate-pulse rounded-2xl bg-line/60" />
      </div>
    );
  }
  if (state.status === "error" || !value) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="card space-y-3 text-center" role="alert">
          <p className="font-semibold">{t("err.loadWorkspace")}</p>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }
  return <WsCtx.Provider value={value}>{children}</WsCtx.Provider>;
}

export function useWorkspace(): Ctx {
  const v = useContext(WsCtx);
  if (!v) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return v;
}
