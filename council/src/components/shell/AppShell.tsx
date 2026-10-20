"use client";

import { useEffect } from "react";
import { connectRealtime, useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { GlobalOverlays } from "./GlobalOverlays";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ready = useStore((s) => s.ready);
  const theme = useStore((s) => s.db.settings.theme);

  useEffect(() => {
    void useStore.getState().hydrate();
    connectRealtime();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-accent" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">{children}</main>
      <GlobalOverlays />
    </div>
  );
}
