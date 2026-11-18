"use client";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { WorkspaceProvider } from "@/lib/workspace";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
