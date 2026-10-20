"use client";

import { useEffect } from "react";
import { connectRealtime, useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { GlobalOverlays } from "./GlobalOverlays";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ready = useStore((s) => s.ready);
  const theme = useStore((s) => s.db.settings.theme);

  useEffect(() => {
    // Retry with backoff so a restarting server doesn't leave the app stuck on the loader.
    let cancelled = false;
    const load = async (attempt: number) => {
      try {
        await useStore.getState().hydrate();
      } catch {
        if (!cancelled) setTimeout(() => void load(attempt + 1), Math.min(5000, 500 * 2 ** attempt));
      }
    };
    void load(0);
    connectRealtime();
    return () => {
      cancelled = true;
    };
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
