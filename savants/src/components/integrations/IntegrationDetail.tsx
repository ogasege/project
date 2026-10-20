"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Copy, ExternalLink } from "lucide-react";
import { applyOps } from "@/lib/ops";
import { useStore } from "@/lib/store";
import type { IntegrationConnection } from "@/lib/types";
import { CAPABILITY_LABEL, type CatalogApp } from "@/lib/integrations-catalog";
import { relativeTime } from "@/lib/workspace";
import { Avatar, Button, PageHeader } from "@/components/ui";
import { AppTile, sourceNote } from "./AppTile";

// One page per app, like Linear's integration detail: back link, the app with its maker and a
// single primary action, then About, setup or the live connection, and who turned it on.

interface Field {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  help?: React.ReactNode;
}

const FIELDS: Record<string, Field[]> = {
  github: [
    {
      key: "token",
      label: "Personal access token",
      placeholder: "github_pat_…",
      secret: true,
      help: (
        <>
          A fine-grained token with <em>Issues</em> and <em>Pull requests</em> read/write on the repositories the savants should see. It stays on the Savants server and is
          never sent back to the browser.
        </>
      ),
    },
  ],
  slack: [{ key: "webhookUrl", label: "Incoming webhook URL", placeholder: "https://hooks.slack.com/services/…", secret: true, help: "Savants post updates to the channel this webhook belongs to." }],
  webhook: [{ key: "url", label: "Endpoint URL", placeholder: "https://example.com/savants-hook", help: "Savants POST a JSON payload here when they run the webhook action." }],
};

const TESTS: Record<string, { action: string; field?: { key: string; label: string; placeholder: string }; build: (v: string) => Record<string, unknown> }> = {
  github: { action: "list_issues", field: { key: "repo", label: "Repository", placeholder: "owner/name" }, build: (v) => ({ repo: v }) },
  slack: { action: "post_message", field: { key: "text", label: "Message", placeholder: "Hello from Savants" }, build: (v) => ({ text: v || "Hello from Savants" }) },
  webhook: { action: "send", build: () => ({ payload: { source: "savants", event: "test", at: new Date().toISOString() } }) },
};

export function IntegrationDetail({ app }: { app: CatalogApp }) {
  const db = useStore((s) => s.db);
  const connection = Object.values(db.integrations).find((c) => c.appId === app.id);
  const enabler = connection ? db.members[connection.connectedBy] : undefined;
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const fields = FIELDS[app.id] ?? [];
  const test = TESTS[app.id];

  const apply = (conn: IntegrationConnection | null) =>
    useStore.setState((s) => ({
      db: applyOps(
        s.db,
        conn
          ? [{ type: "insert", coll: "integrations", doc: conn as unknown as IntegrationConnection & Record<string, unknown> }]
          : Object.values(s.db.integrations)
              .filter((c) => c.appId === app.id)
              .map((c) => ({ type: "delete" as const, coll: "integrations" as const, id: c.id })),
      ),
    }));

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId: app.id, config: values }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not connect");
      apply(json as IntegrationConnection);
      setValues({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/integrations/${app.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      apply(null);
      setTestOutput(null);
    } else setError("Could not turn it off");
  };

  const runTest = async () => {
    const t = test ?? { action: "search", build: (v: string) => ({ query: v || "test" }) };
    setBusy(true);
    setTestOutput(null);
    try {
      const res = await fetch(`/api/integrations/${app.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: t.action, input: t.build(testInput) }) });
      const json = await res.json();
      setTestOutput(res.ok ? json.output : `Error: ${json.error}`);
    } finally {
      setBusy(false);
    }
  };

  const missing = fields.some((f) => !values[f.key]?.trim());

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-1.5">
            <Link href="/integrations" className="text-faint hover:text-fg">
              Integrations
            </Link>
            <span className="text-disabled">›</span>
            <span>{app.name}</span>
          </span>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-6 pb-16 pt-8">
          <Link href="/integrations" className="inline-flex items-center gap-1 text-[12px] font-medium text-faint hover:text-fg">
            <ChevronLeft size={13} /> Integrations
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <AppTile app={app} size={56} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-fg">{app.name}</h2>
              <p className="mt-0.5 text-[13px] text-faint">
                {app.category} · {sourceNote(app.sources)} · {app.live ? "Live connector" : "Simulated in this build"}
              </p>
            </div>
            {connection ? (
              <Button variant="subtle" onClick={disconnect} disabled={busy}>
                Turn off
              </Button>
            ) : (
              <Button variant="primary" onClick={connect} disabled={busy || missing}>
                {busy ? "Connecting…" : "Turn on"}
              </Button>
            )}
          </div>

          {connection && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border-[0.5px] border-line bg-panel px-3 py-2.5 text-[13px]">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="font-medium text-fg">{connection.mode === "live" ? "On" : "On, simulated"}</span>
              <span className="text-faint">· {relativeTime(connection.connectedAt)}</span>
              {enabler && (
                <span className="ml-auto flex items-center gap-1.5 text-faint">
                  Turned on by <Avatar member={enabler} size={16} /> <span className="text-muted">{enabler.name}</span>
                </span>
              )}
            </div>
          )}

          <Block title="About">
            <p className="text-muted">{app.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {app.capabilities.map((c) => (
                <span key={c} className="rounded-full border-[0.5px] border-line-strong px-2 py-0.5 text-[12px] text-muted">
                  {CAPABILITY_LABEL[c]}
                </span>
              ))}
            </div>
            {!app.live && (
              <p className="mt-3 text-[12px] text-faint">
                In this build {app.name} runs in simulated mode: savants can call it and every action shows in the audit log, but nothing leaves Savants.
              </p>
            )}
          </Block>

          {app.id === "savants-mcp" && (
            <Block title="Connect an agent">
              <McpInstructions />
            </Block>
          )}

          {!connection && fields.length > 0 && (
            <Block title="Set up">
              <div className="space-y-4">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <label htmlFor={`f-${f.key}`} className="text-[12px] font-medium text-muted">
                      {f.label}
                    </label>
                    <input
                      id={`f-${f.key}`}
                      type={f.secret ? "password" : "text"}
                      autoComplete="off"
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="h-8 w-full rounded-lg border-[0.5px] border-line-strong bg-panel px-2.5 font-mono text-[12px] outline-none placeholder:text-disabled focus:border-accent"
                    />
                    {f.help && <p className="text-[12px] text-faint">{f.help}</p>}
                  </div>
                ))}
              </div>
            </Block>
          )}

          {connection && app.id !== "savants-mcp" && (
            <Block title="Try it">
              <div className="flex gap-2">
                {(test?.field || !test) && (
                  <input
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder={test?.field?.placeholder ?? "Search query"}
                    aria-label={test?.field?.label ?? "Search query"}
                    className="h-8 min-w-0 flex-1 rounded-lg border-[0.5px] border-line-strong bg-panel px-2.5 outline-none placeholder:text-disabled focus:border-accent"
                  />
                )}
                <Button onClick={runTest} disabled={busy}>
                  Run {(test?.action ?? "search").replace(/_/g, " ")}
                </Button>
              </div>
              {testOutput && <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border-[0.5px] border-line bg-panel p-2.5 font-mono text-[12px] text-muted">{testOutput}</pre>}
              {Object.keys(connection.config ?? {}).length > 0 && <p className="mt-2 text-[12px] text-faint">Stored credentials: {Object.keys(connection.config).join(", ")} (hidden)</p>}
              {connection.lastEvent && <p className="mt-1 text-[12px] text-faint">Last event: {connection.lastEvent}</p>}
            </Block>
          )}

          {error && <p className="mt-4 text-[12px] text-danger">{error}</p>}
        </div>
      </div>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t-[0.5px] border-line pt-6">
      <h3 className="mb-2 text-[13px] font-medium text-fg">{title}</h3>
      {children}
    </section>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px] text-faint">
        <span>{label}</span>
        <button
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-hover hover:text-fg"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg border-[0.5px] border-line bg-panel p-2.5 font-mono text-[12px] text-fg">{text}</pre>
    </div>
  );
}

function McpInstructions() {
  const [origin, setOrigin] = useState("http://localhost:3000");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/mcp`;
  const json = JSON.stringify({ mcpServers: { savants: { type: "http", url } } }, null, 2);
  return (
    <div className="space-y-3">
      <p className="text-muted">
        Any MCP client can read and search this workspace and propose issues, pages and comments. What outside agents write lands in <span className="text-fg">Approvals</span> as
        “External agent (MCP)”, so it passes the same human gate as the savants. Set <code className="rounded bg-panel px-1 font-mono text-[12px]">SAVANTS_MCP_TOKEN</code> to
        require a bearer token.
      </p>
      <CopyBlock label="Endpoint" text={url} />
      <CopyBlock label="Claude Code" text={`claude mcp add --transport http savants ${url}`} />
      <CopyBlock label="Claude Desktop or Cursor (mcp.json)" text={json} />
      <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline">
        About MCP <ExternalLink size={11} />
      </a>
    </div>
  );
}
