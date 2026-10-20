"use client";

import { create } from "zustand";
import { applyOps, emptyDB } from "./ops";
import { uid } from "./id";
import type { DB, Op, OpEnvelope } from "./types";

// Client mirror of the server store. Ops apply optimistically, then POST to /api/ops.
// The SSE stream delivers everyone's ops (multiplayer); our own echoes are skipped by clientId.

const clientId = typeof window !== "undefined" ? uid("client") : "server";

interface UIState {
  paletteOpen: boolean;
  createIssue: null | { teamId?: string; projectId?: string; stateId?: string; assigneeId?: string; parentId?: string };
  shortcutsOpen: boolean;
}

interface Store {
  db: DB;
  ready: boolean;
  connected: boolean;
  ui: UIState;
  hydrate: () => Promise<void>;
  dispatch: (ops: Op[]) => Promise<void>;
  setUI: (patch: Partial<UIState>) => void;
}

export const useStore = create<Store>((set, get) => ({
  db: emptyDB(),
  ready: false,
  connected: false,
  ui: { paletteOpen: false, createIssue: null, shortcutsOpen: false },
  async hydrate() {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error(`state ${res.status}`);
    const db = (await res.json()) as DB;
    set({ db, ready: true });
  },
  async dispatch(ops) {
    if (!ops.length) return;
    set({ db: applyOps(get().db, ops) });
    const opId = uid("op");
    try {
      const res = await fetch("/api/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opId, clientId, ops }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error("[council] op failed, rehydrating", err);
      await get().hydrate();
    }
  },
  setUI(patch) {
    set({ ui: { ...get().ui, ...patch } });
  },
}));

let source: EventSource | null = null;

export function connectRealtime() {
  if (typeof window === "undefined" || source) return;
  source = new EventSource("/api/events");
  source.onopen = () => useStore.setState({ connected: true });
  source.onerror = () => useStore.setState({ connected: false });
  source.onmessage = (ev) => {
    const env = JSON.parse(ev.data) as OpEnvelope;
    if (env.opId === "reset") {
      void useStore.getState().hydrate();
      return;
    }
    if (env.clientId === clientId) return;
    useStore.setState((s) => ({ db: applyOps(s.db, env.ops) }));
  };
}

// Subscribe to the whole DB and derive with useMemo in components. (Selectors that build new
// arrays/objects on every call would loop under zustand v5's snapshot caching.)
export function useDB(): DB {
  return useStore((s) => s.db);
}

export function currentUserId(): string {
  return useStore.getState().db.settings.currentUserId;
}
