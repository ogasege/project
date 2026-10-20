"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { applyOps } from "@/lib/ops";
import { useStore } from "@/lib/store";
import type { IntegrationConnection } from "@/lib/types";
import { CAPABILITY_LABEL, CATALOG, CATEGORIES, type CatalogApp } from "@/lib/integrations-catalog";
import { clsx, PageHeader } from "@/components/ui";
import { ConnectModal } from "./ConnectModal";
import { AppTile, SourceBadges } from "./AppTile";

type SourceFilter = "all" | "linear" | "notion" | "both";

export function IntegrationsView() {
  const db = useStore((s) => s.db);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [source, setSource] = useState<SourceFilter>("all");
  const [open, setOpen] = useState<CatalogApp | null>(null);

  const connections = useMemo(() => {
    const m = new Map<string, IntegrationConnection>();
    for (const c of Object.values(db.integrations)) m.set(c.appId, c);
    return m;
  }, [db.integrations]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return CATALOG.filter((a) => {
      if (category !== "All" && a.category !== category) return false;
      const l = a.sources.includes("linear");
      const n = a.sources.includes("notion");
      if (source === "linear" && !l) return false;
      if (source === "notion" && !n) return false;
      if (source === "both" && !(l && n)) return false;
      if (query && !`${a.name} ${a.description} ${a.category} ${a.capabilities.join(" ")}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [q, category, source]);

  const connected = filtered.filter((a) => connections.has(a.id));
  const available = filtered.filter((a) => !connections.has(a.id));
  const counts = useMemo(
    () => ({
      linear: CATALOG.filter((a) => a.sources.includes("linear")).length,
      notion: CATALOG.filter((a) => a.sources.includes("notion")).length,
      both: CATALOG.filter((a) => a.sources.includes("linear") && a.sources.includes("notion")).length,
    }),
    [],
  );

  const applyConnection = (conn: IntegrationConnection | null, appId: string) => {
    useStore.setState((s) => ({
      db: applyOps(s.db, conn ? [{ type: "insert", coll: "integrations", doc: conn as unknown as IntegrationConnection & Record<string, unknown> }] : Object.values(s.db.integrations).filter((c) => c.appId === appId).map((c) => ({ type: "delete" as const, coll: "integrations" as const, id: c.id }))),
    }));
  };

  return (
    <>
      <PageHeader title="Integrations">
        <span className="text-[12px] text-faint">
          {CATALOG.length} apps · {connections.size} connected
        </span>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          <div className="mb-5">
            <h2 className="text-[20px] font-semibold tracking-tight">Everything Linear and Notion connect to, in one place</h2>
            <p className="mt-1 max-w-3xl text-muted">
              The catalog is the union of both products&apos; public integration directories ({counts.linear} listed by Linear, {counts.notion} by Notion, {counts.both} by both), plus
              Council&apos;s own MCP server so any agent tool can plug in. GitHub, Slack, Webhooks and MCP are live; every other app connects in{" "}
              <span className="text-fg">simulated mode</span> so agents can exercise the integration end to end until its real connector ships.
            </p>
          </div>

          <div className="sticky top-0 z-10 -mx-6 mb-4 flex flex-wrap items-center gap-2 border-b border-line bg-bg/90 px-6 py-3 backdrop-blur">
            <label className="flex h-8 w-64 items-center gap-2 rounded-md border border-line bg-panel px-2 focus-within:border-accent">
              <Search size={13} className="text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search integrations" aria-label="Search integrations" className="flex-1 bg-transparent outline-none placeholder:text-faint" />
            </label>
            <div role="radiogroup" aria-label="Source" className="flex h-8 items-center rounded-md border border-line bg-panel p-0.5">
              {(["all", "linear", "notion", "both"] as SourceFilter[]).map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={source === s}
                  onClick={() => setSource(s)}
                  className={clsx("h-full rounded px-2.5 text-[12px] capitalize", source === s ? "bg-active text-fg" : "text-muted hover:text-fg")}
                >
                  {s === "all" ? "All" : s === "both" ? "Both" : s === "linear" ? "Linear" : "Notion"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {["All", ...CATEGORIES].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={clsx("h-7 rounded-full border px-2.5 text-[12px]", category === c ? "border-accent bg-accent-soft text-fg" : "border-line text-muted hover:text-fg")}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {connected.length > 0 && (
            <section className="mb-8" aria-label="Connected">
              <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-faint">Connected</h3>
              <Grid apps={connected} connections={connections} onOpen={setOpen} />
            </section>
          )}

          <section aria-label="Available">
            <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-faint">{connected.length ? "Available" : "All integrations"}</h3>
            {available.length ? <Grid apps={available} connections={connections} onOpen={setOpen} /> : <p className="text-faint">No integrations match these filters.</p>}
          </section>
        </div>
      </div>

      {open && (
        <ConnectModal
          app={open}
          connection={connections.get(open.id)}
          onClose={() => setOpen(null)}
          onConnected={(c) => applyConnection(c, open.id)}
          onDisconnected={() => applyConnection(null, open.id)}
        />
      )}
    </>
  );
}

function Grid({ apps, connections, onOpen }: { apps: CatalogApp[]; connections: Map<string, IntegrationConnection>; onOpen: (a: CatalogApp) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {apps.map((a) => {
        const conn = connections.get(a.id);
        return (
          <button
            key={a.id}
            onClick={() => onOpen(a)}
            className="group flex flex-col gap-2 rounded-lg border border-line bg-elev p-3 text-left transition-colors hover:border-line-strong hover:bg-panel"
          >
            <div className="flex items-start gap-3">
              <AppTile app={a} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{a.name}</span>
                  {a.live && <span className="rounded bg-success/15 px-1 text-[10px] font-medium text-success">LIVE</span>}
                </div>
                <SourceBadges sources={a.sources} />
              </div>
              {conn && (
                <span className="flex items-center gap-1 text-[11px] text-success">
                  <Check size={12} /> {conn.mode === "simulated" ? "Simulated" : "Connected"}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-[12px] text-muted">{a.description}</p>
            <div className="flex flex-wrap gap-1">
              {a.capabilities.slice(0, 4).map((c) => (
                <span key={c} className="rounded border border-line px-1.5 text-[10px] text-faint">
                  {CAPABILITY_LABEL[c]}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
