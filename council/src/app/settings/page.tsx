"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, PageHeader } from "@/components/ui";

export default function SettingsPage() {
  const db = useStore((s) => s.db);
  const dispatch = useStore((s) => s.dispatch);
  const [name, setName] = useState(db.settings.workspaceName);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="mx-auto w-full max-w-2xl space-y-8 overflow-y-auto p-8">
        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">Workspace</h2>
          <label className="block text-muted" htmlFor="ws-name">Name</label>
          <div className="flex gap-2">
            <input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 flex-1 rounded-md border border-line bg-panel px-2 outline-none focus:border-accent"
            />
            <Button variant="primary" onClick={() => void dispatch([{ type: "settings", patch: { workspaceName: name.trim() || "Council" } }])}>
              Save
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">Appearance</h2>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <Button key={t} variant={db.settings.theme === t ? "primary" : "subtle"} onClick={() => void dispatch([{ type: "settings", patch: { theme: t } }])}>
                {t === "dark" ? "Dark" : "Light"}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">Models</h2>
          <p className="text-muted">
            Each agent chooses its own model on its profile. Set <code className="rounded bg-panel px-1">ANTHROPIC_API_KEY</code> in{" "}
            <code className="rounded bg-panel px-1">.env.local</code> to run real models; without it the council runs on the built-in simulator.
          </p>
          <ModelStatus />
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">Audit log</h2>
          <p className="text-muted">
            Every change is an operation appended to <code className="rounded bg-panel px-1">.data/oplog.ndjson</code>. Every agent proposal, approval and rejection is on record.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold text-danger">Danger zone</h2>
          <p className="text-muted">Reset the workspace to the seeded demo data.</p>
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm("Reset all workspace data to the demo seed?")) return;
              await fetch("/api/reset", { method: "POST" });
              await useStore.getState().hydrate();
              setStatus("Workspace reset.");
            }}
          >
            Reset workspace
          </Button>
          {status && <p className="text-success">{status}</p>}
        </section>
      </div>
    </>
  );
}

function ModelStatus() {
  const [info, setInfo] = useState<null | { live: boolean; defaultModel: string }>(null);
  useEffect(() => {
    void fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setInfo(j));
  }, []);
  if (!info) return null;
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <span className={info.live ? "text-success" : "text-warning"}>●</span> {info.live ? `Live models (default ${info.defaultModel})` : "Simulator mode (no API key)"}
    </div>
  );
}
