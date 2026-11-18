"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import Sheet from "@/components/Sheet";
import ThemeToggle, { LangToggle } from "@/components/ThemeToggle";
import { tracksInventory } from "@/lib/business";
import { useI18n } from "@/lib/i18n";
import { useWorkspace } from "@/lib/workspace";

interface Item {
  href: string;
  key: string;
  icon: string;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { ws, role, canFinance, canManage, supabase } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);

  const items: Item[] = [
    { href: "/dashboard", key: "nav.dashboard", icon: "▦" },
    { href: "/sales", key: "nav.sales", icon: "🧾" },
    { href: "/customers", key: "nav.customers", icon: "👥" },
    ...(tracksInventory(ws.business_type) ? [{ href: "/inventory", key: "nav.inventory", icon: "📦" }] : []),
    ...(canFinance ? [{ href: "/finance", key: "nav.finance", icon: "💰" }] : []),
    ...(canManage ? [{ href: "/ai", key: "nav.ai", icon: "✨" }] : []),
    ...(role === "owner" || role === "admin" ? [{ href: "/privacy", key: "nav.privacy", icon: "🔒" }] : []),
  ];
  const mobilePrimary = items.slice(0, 4);
  const mobileMore = items.slice(4);
  const active = (h: string) => pathname === h || pathname.startsWith(h + "/");

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-card p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white dark:text-bg">S</span>
          <span className="truncate">{ws.name}</span>
        </div>
        <nav className="flex-1 space-y-1" aria-label="Main">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active(i.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                active(i.href) ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-line/50"
              }`}
            >
              <span aria-hidden>{i.icon}</span>
              {t(i.key)}
            </Link>
          ))}
        </nav>
        <div className="space-y-2">
          <div className="flex gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
          <div className="truncate text-xs text-muted">{t(`role.${role}`)}</div>
          <button type="button" onClick={() => void logout()} className="btn btn-ghost w-full text-sm">
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur md:hidden">
          <div className="truncate font-bold">{ws.name}</div>
          <div className="flex gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-5xl space-y-4 px-4 pb-28 pt-4 md:pb-10 md:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {mobilePrimary.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active(i.href) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active(i.href) ? "text-brand" : "text-muted"}`}
          >
            <span className="text-lg" aria-hidden>
              {i.icon}
            </span>
            {t(i.key)}
          </Link>
        ))}
        <button type="button" onClick={() => setMore(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-muted">
          <span className="text-lg" aria-hidden>
            ☰
          </span>
          {t("nav.more")}
        </button>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title={t("nav.more")}>
        <div className="space-y-2">
          {mobileMore.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setMore(false)} className="card flex items-center gap-3 !p-3 font-semibold">
              <span aria-hidden>{i.icon}</span>
              {t(i.key)}
            </Link>
          ))}
          <div className="text-xs text-muted">{t(`role.${role}`)}</div>
          <button type="button" onClick={() => void logout()} className="btn btn-ghost w-full">
            {t("nav.logout")}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
