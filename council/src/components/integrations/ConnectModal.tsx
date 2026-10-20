"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, X } from "lucide-react";
import type { IntegrationConnection } from "@/lib/types";
import { CAPABILITY_LABEL, type CatalogApp } from "@/lib/integrations-catalog";
import { relativeTime } from "@/lib/workspace";
import { Button, Modal } from "@/components/ui";
import { AppTile, SourceBadges } from "./AppTile";

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
          Create a fine-grained token with <em>Issues</em> and <em>Pull requests</em> read/write on the repositories you want agents to see. It is stored on the
          Council server and never sent back to the browser.
        </>
      ),
    },
  ],
  slack: [{ key: "webhookUrl", label: "Incoming webhook URL", placeholder: "https://hooks.slack.com/services/…", secret: true, help: "Agents post updates to the channel this webhook belongs to." }],
  webhook: [{ key: "url", label: "Endpoint URL", placeholder: "https://example.com/council-hook", help: "Council POSTs JSON payloads here when agents run the webhook action." }],
};

const TESTS: Record<string, { action: string; field?: { key: string; label: string; placeholder: string }; build: (v: string) => Record<string, unknown> }> = {
  github: { action: "list_issues", field: { key: "repo", label: "Repository", placeholder: "owner/name" }, build: (v) => ({ repo: v }) },
  slack: { action: "post_message", field: { key: "text", label: "Message", placeholder: "Hello from Council ◆" }, build: (v) => ({ text: v || "Hello from Council ◆" }) },
  webhook: { action: "send", build: () => ({ payload: { source: "council", event: "test", at: new Date().toISOString() } }) },
};

export function ConnectModal({
  app,
  connection,
  onClose,
  onConnected,
  onDisconnected,
}: {
  app: CatalogApp;
  connection?: IntegrationConnection;
  onClose: () => void;
  onConnected: (c: IntegrationConnection) => void;
  onDisconnected: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const fields = FIELDS[app.id] ?? [];

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId: app.id, config: values }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not connect");
      onConnected(json as IntegrationConnection);
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
    if (res.ok) onDisconnected();
    else setError("Could not disconnect");
  };

  const runTest = async () => {
    const t = TESTS[app.id] ?? { action: "search", build: (v: string) => ({ query: v || "test" }) };
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

  const test = TESTS[app.id];

  return (
    <Modal open onClose={onClose} label={`${app.name} integration`} className="w-[560px]">
      <div className="flex items-start gap-3 border-b border-line p-4">
        <AppTile app={app} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold">{app.name}</h2>
            {app.live ? <span className="rounded bg-success/15 px-1 text-[10px] font-medium text-success">LIVE</span> : <span className="rounded bg-warning/15 px-1 text-[10px] font-medium text-warning">SIMULATED</span>}
          </div>
          <SourceBadges sources={app.sources} />
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:bg-hover hover:text-fg">
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[65vh] space-y-4 overflow-y-auto p-4">
        <p className="text-muted">{app.description}</p>
        <div className="flex flex-wrap gap-1">
          {app.capabilities.map((c) => (
            <span key={c} className="rounded border border-line px-1.5 py-0.5 text-[11px] text-muted">
              {CAPABILITY_LABEL[c]}
            </span>
          ))}
        </div>

        {app.id === "council-mcp" && <McpInstructions />}

        {connection ? (
          <div className="space-y-3">
            <div className="rounded-md border border-line bg-panel p-3 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="font-medium text-fg">{connection.mode === "live" ? "Connected" : "Connected (simulated)"}</span>
                <span className="text-faint">· {relativeTime(connection.connectedAt)}</span>
              </div>
              {connection.lastEvent && <p className="mt-1 text-muted">{connection.lastEvent}</p>}
              {Object.keys(connection.config ?? {}).length > 0 && (
                <p className="mt-1 text-faint">
                  Stored credentials: {Object.keys(connection.config).join(", ")} (hidden)
                </p>
              )}
            </div>

            {app.id !== "council-mcp" && (
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-muted">Test the connection</div>
                <div className="flex gap-2">
                  {(test?.field || !test) && (
                    <input
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder={test?.field?.placeholder ?? "Search query"}
                      aria-label={test?.field?.label ?? "Search query"}
                      className="h-8 flex-1 rounded-md border border-line bg-panel px-2 outline-none focus:border-accent"
                    />
                  )}
                  <Button onClick={runTest} disabled={busy}>
                    Run {test?.action ?? "search"}
                  </Button>
                </div>
                {testOutput && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-panel p-2 font-mono text-[12px] text-muted">{testOutput}</pre>}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
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
                  className="h-8 w-full rounded-md border border-line bg-panel px-2 font-mono text-[12px] outline-none focus:border-accent"
                />
                {f.help && <p className="text-[12px] text-faint">{f.help}</p>}
              </div>
            ))}
            {!app.live && (
              <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-[12px] text-muted">
                {app.name} connects in simulated mode in this prototype: agents can call it and you&apos;ll see the actions in the audit log, but no data leaves Council.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-[12px] text-danger">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line p-3">
        {connection ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
            <Button variant="danger" onClick={disconnect} disabled={busy}>
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={connect} disabled={busy || fields.some((f) => !values[f.key]?.trim())}>
              {busy ? "Connecting…" : app.live ? "Connect" : "Connect (simulated)"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px] text-muted">
        <span>{label}</span>
        <button
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-hover hover:text-fg"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md border border-line bg-panel p-2 font-mono text-[12px] text-fg">{text}</pre>
    </div>
  );
}

function McpInstructions() {
  const [origin, setOrigin] = useState("http://localhost:3000");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/mcp`;
  const json = JSON.stringify({ mcpServers: { council: { type: "http", url } } }, null, 2);
  return (
    <div className="space-y-3 rounded-md border border-accent/30 bg-accent-soft p-3">
      <p className="text-[12px] text-muted">
        Any MCP client can read and search this workspace and propose issues, pages and comments. Writes from external agents land in{" "}
        <span className="text-fg">Approvals</span> as the “External agent (MCP)” member, so they pass the same human gate as the council. Set{" "}
        <code className="rounded bg-panel px-1">COUNCIL_MCP_TOKEN</code> to require a bearer token.
      </p>
      <CopyBlock label="Endpoint" text={url} />
      <CopyBlock label="Claude Code" text={`claude mcp add --transport http council ${url}`} />
      <CopyBlock label="Claude Desktop / Cursor (mcp.json)" text={json} />
      <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline">
        About MCP <ExternalLink size={11} />
      </a>
    </div>
  );
}
