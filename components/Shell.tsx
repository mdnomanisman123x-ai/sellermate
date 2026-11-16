"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

const icons = {
  home: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  users:
    "M16 11a3 3 0 1 0-2.9-3.7M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0 2c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4zm7.5.2c2.2.5 3.5 1.9 3.5 3.8v2h-3",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
};

const tabs = [
  { href: "/", label: "হোম", icon: icons.home },
  { href: "/customers", label: "গ্রাহক", icon: icons.users },
  { href: "/settings", label: "সেটিংস", icon: icons.gear },
];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { data, saveError } = useStore();

  return (
    <div className="mx-auto min-h-screen max-w-xl">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-cream/85 px-4 py-3 backdrop-blur">
        <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="10" fill="#0E2B25" />
          <rect x="7" y="8" width="18" height="16" rx="3" fill="none" stroke="#C8A24A" strokeWidth="2" />
          <path d="M11 14h10M11 18h6" stroke="#C8A24A" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="min-w-0 leading-tight">
          <div className="font-display text-lg font-bold">SellerMate</div>
          <div className="truncate text-xs text-ink/55">{data.shopName}</div>
        </div>
      </header>

      {saveError && (
        <div role="alert" className="mx-4 mb-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          ডেটা সেভ করা যাচ্ছে না (ফোনের স্টোরেজ বন্ধ বা ভর্তি)। সেটিংস থেকে ব্যাকআপ নিন।
        </div>
      )}

      <main className="px-4 pb-32 pt-2">{children}</main>

      <nav
        aria-label="প্রধান মেনু"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto flex max-w-xl">
          {tabs.map((t) => {
            const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
                  active ? "text-ink" : "text-ink/45"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                    active ? "bg-gold/25" : ""
                  }`}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={t.icon} />
                  </svg>
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
