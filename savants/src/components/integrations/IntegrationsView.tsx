"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { IntegrationConnection } from "@/lib/types";
import { CATALOG, CATEGORIES, type CatalogApp } from "@/lib/integrations-catalog";
import { clsx, PageHeader } from "@/components/ui";
import { AppTile, sourceNote } from "./AppTile";

// Laid out like Linear's integrations settings (structure recovered with REA from the web app):
// one centred column, a title and one-line pitch, search, a strip of what is already on,
// a short list of essentials, then every category with a "View all".

type SourceFilter = "all" | "linear" | "notion";

const ESSENTIALS = ["savants-mcp", "github", "slack", "claude", "figma", "google-drive", "sentry", "zendesk"];
const CATEGORY_ORDER = ["Agents & AI", "Engineering", "Communication", "Customer", "Project management", "Files & docs", "Design", "Product", "Data & analytics", "Automation", "Productivity", "Forms", "Support", "Identity", "Embeds"];
const ORDERED_CATEGORIES = [...CATEGORY_ORDER.filter((c) => CATEGORIES.includes(c)), ...CATEGORIES.filter((c) => !CATEGORY_ORDER.includes(c))];
const PREVIEW = 4;

export function IntegrationsView() {
  const db = useStore((s) => s.db);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState<SourceFilter>("all");

  const connections = useMemo(() => {
    const m = new Map<string, IntegrationConnection>();
    for (const c of Object.values(db.integrations)) m.set(c.appId, c);
    return m;
  }, [db.integrations]);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return CATALOG.filter((a) => {
      if (source !== "all" && !a.sources.includes(source)) return false;
      if (query && !`${a.name} ${a.description} ${a.category}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [q, source]);

  const connected = CATALOG.filter((a) => connections.has(a.id));
  const searching = q.trim().length > 0;
  const browsing = !searching && !category;

  return (
    <>
      <PageHeader title="Integrations">
        <span className="text-[12px] text-faint">
          {connections.size} of {CATALOG.length} on
        </span>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[800px] px-6 pb-16 pt-10">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-fg">Integrations</h2>
          <p className="mt-1 text-muted">Every tool Linear and Notion connect to, in one place, so you and the savants can work where the work already lives.</p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border-[0.5px] border-line-strong bg-panel px-2.5 focus-within:border-accent">
              <Search size={14} className="shrink-0 text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search integrations…" aria-label="Search integrations" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-disabled" />
              {q && (
                <button onClick={() => setQ("")} aria-label="Clear search" className="text-faint hover:text-fg">
                  <X size={13} />
                </button>
              )}
            </label>
            <div role="radiogroup" aria-label="Listed by" className="flex h-8 items-center gap-0.5 rounded-lg border-[0.5px] border-line-strong bg-panel p-0.5">
              {(["all", "linear", "notion"] as SourceFilter[]).map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={source === s}
                  onClick={() => setSource(s)}
                  className={clsx("h-full rounded-md px-2.5 text-[12px] font-medium transition-colors", source === s ? "bg-active text-fg" : "text-faint hover:text-muted")}
                >
                  {s === "all" ? "All" : s === "linear" ? "Linear" : "Notion"}
                </button>
              ))}
            </div>
          </div>

          {browsing ? (
            <>
              {connected.length > 0 && <EnabledStrip apps={connected} connections={connections} />}
              <Section title="Essentials" note="Where most teams start">
                <Grid apps={ESSENTIALS.map((id) => visible.find((a) => a.id === id)).filter((a): a is CatalogApp => !!a)} connections={connections} />
              </Section>
              {ORDERED_CATEGORIES.map((c) => {
                const apps = visible.filter((a) => a.category === c);
                if (!apps.length) return null;
                return (
                  <Section
                    key={c}
                    title={c}
                    action={
                      apps.length > PREVIEW && (
                        <button onClick={() => setCategory(c)} className="flex items-center gap-0.5 text-[12px] font-medium text-faint hover:text-fg">
                          View all {apps.length} <ChevronRight size={12} />
                        </button>
                      )
                    }
                  >
                    <Grid apps={apps.slice(0, PREVIEW)} connections={connections} />
                  </Section>
                );
              })}
            </>
          ) : (
            <Section
              title={searching ? `Results for “${q.trim()}”` : category!}
              action={
                !searching && (
                  <button onClick={() => setCategory(null)} className="flex items-center gap-0.5 text-[12px] font-medium text-faint hover:text-fg">
                    <ChevronLeft size={12} /> All integrations
                  </button>
                )
              }
            >
              {(() => {
                const apps = searching ? visible : visible.filter((a) => a.category === category);
                return apps.length ? <Grid apps={apps} connections={connections} /> : <p className="py-6 text-faint">Nothing matches. Try a broader search, or ask a savant on a call to connect it for you.</p>;
              })()}
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, note, action, children }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10" aria-label={title}>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-[13px] font-medium text-fg">{title}</h3>
        {note && <span className="text-[12px] text-faint">{note}</span>}
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </section>
  );
}

function Status({ app, conn }: { app: CatalogApp; conn?: IntegrationConnection }) {
  if (conn)
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        {conn.mode === "simulated" ? "On · simulated" : "On"}
      </span>
    );
  return <span className="text-[12px] text-faint">{sourceNote(app.sources)}</span>;
}

function Grid({ apps, connections }: { apps: CatalogApp[]; connections: Map<string, IntegrationConnection> }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {apps.map((a) => (
        <Link
          key={a.id}
          href={`/integrations/${a.id}`}
          className="group flex items-start gap-3 rounded-lg border-[0.5px] border-line bg-panel p-3 transition-colors duration-100 hover:border-line-strong hover:bg-hover"
        >
          <AppTile app={a} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-[13px] font-medium text-fg">{a.name}</span>
              <Status app={a} conn={connections.get(a.id)} />
            </div>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.45] text-faint">{a.description}</p>
          </div>
          <ChevronRight size={14} className="mt-2 shrink-0 text-disabled transition-colors group-hover:text-muted" />
        </Link>
      ))}
    </div>
  );
}

// What is already on, as a scrolling strip with arrows (Linear shows its enabled apps this way).
function EnabledStrip({ apps, connections }: { apps: CatalogApp[]; connections: Map<string, IntegrationConnection> }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  return (
    <Section
      title="On in this workspace"
      note={`${apps.length}`}
      action={
        apps.length > 3 && (
          <span className="flex gap-1">
            <button onClick={() => scroll(-1)} aria-label="Scroll left" className="flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-hover hover:text-fg">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => scroll(1)} aria-label="Scroll right" className="flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-hover hover:text-fg">
              <ChevronRight size={14} />
            </button>
          </span>
        )
      }
    >
      <div ref={ref} className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {apps.map((a) => {
          const conn = connections.get(a.id);
          return (
            <Link
              key={a.id}
              href={`/integrations/${a.id}`}
              className="flex w-[200px] shrink-0 snap-start items-center gap-2.5 rounded-lg border-[0.5px] border-line bg-panel p-2.5 transition-colors hover:border-line-strong hover:bg-hover"
            >
              <AppTile app={a} size={28} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-fg">{a.name}</div>
                <Status app={a} conn={conn} />
              </div>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
