"use client";

import { PageIcon } from "@/components/PageIcon";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Mic, Phone, Plus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { agents as listAgents, identifier, issues, pages, relativeTime } from "@/lib/workspace";
import type { Item } from "@/lib/types";
import { Avatar, Button, clsx, Menu, PageHeader } from "@/components/ui";
import { voiceSupport } from "./voice";

export function Lobby() {
  const router = useRouter();
  const params = useSearchParams();
  const db = useStore((s) => s.db);
  const savants = useMemo(() => listAgents(db), [db]);
  const [selected, setSelected] = useState<string[]>([]);
  const [context, setContext] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [mic, setMic] = useState<"unknown" | "granted" | "denied" | "checking">("unknown");
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [support, setSupport] = useState({ stt: true, tts: true });

  useEffect(() => {
    const fromQuery = params.get("agents")?.split(",").filter((id) => db.members[id]?.kind === "agent");
    setSelected(fromQuery?.length ? fromQuery : savants.map((a) => a.id));
    const ctx = params.get("context")?.split(",").filter((id) => db.items[id]);
    if (ctx?.length) setContext(ctx);
    setSupport(voiceSupport());
    // Only on first render of the lobby for these params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const contextOptions = useMemo(
    () =>
      [...pages(db), ...issues(db)]
        .filter((it) => !context.includes(it.id))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((it: Item) => ({ value: it.id, label: it.kind === "issue" ? `${identifier(db, it)} ${it.title}` : it.title || "Untitled", icon: <span className="w-4 text-center">{it.kind === "issue" ? "◇" : it.icon ?? "📄"}</span> })),
    [db, context],
  );

  const recent = useMemo(() => Object.values(db.calls).sort((a, b) => b.startedAt - a.startedAt).slice(0, 8), [db.calls]);

  const checkMic = async () => {
    setMic("checking");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setMic("granted");
    } catch {
      setMic("denied");
    }
  };

  const start = async () => {
    setStarting(true);
    setErr(null);
    const res = await fetch("/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds: selected, contextItemIds: context, title: title.trim() || undefined }),
    });
    const j = (await res.json()) as { id?: string; error?: string };
    if (!res.ok || !j.id) {
      setErr(j.error ?? "Couldn't start the call");
      setStarting(false);
      return;
    }
    router.push(`/call/${j.id}`);
  };

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <PageHeader title="Call the savants" icon={<Phone size={14} className="text-muted" />} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded border border-line bg-bg p-8">
            <div className="mono-label">VOICE CALL · SAVANTS</div>
            <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Think out loud with the savants</h1>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
              Talk like you would on a call. Agents with different roles reason with you, disagree with each other, raise a hand when they have something important, pin notes to a shared board, and propose work that waits for your approval.
            </p>

            <div className="mt-6">
              <div className="mb-2 text-[12px] font-medium text-faint">Who&apos;s on the call</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {savants.map((a) => {
                  const on = selected.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggle(a.id)}
                      aria-pressed={on}
                      className={clsx("flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors", on ? "border-accent bg-accent-soft" : "border-line bg-panel hover:bg-hover")}
                    >
                      <div className="flex w-full items-center gap-2">
                        <Avatar member={a} size={26} />
                        <span className={clsx("ml-auto flex h-4 w-4 items-center justify-center rounded border", on ? "border-accent bg-accent text-accent-fg" : "border-line-strong")}>{on && <Check size={11} />}</span>
                      </div>
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-[11px] text-faint">{a.agent?.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[12px] font-medium text-faint">What are we talking about</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {context.map((id) => {
                  const it = db.items[id];
                  if (!it) return null;
                  return (
                    <span key={id} className="flex items-center gap-1 rounded border border-line bg-panel py-0.5 pr-1 pl-2.5 text-[12px]">
                      {it.kind === "issue" ? identifier(db, it) : <PageIcon icon={it.icon} size={12} className="inline text-current" />} {it.title || "Untitled"}
                      <button aria-label={`Remove ${it.title}`} onClick={() => setContext((c) => c.filter((x) => x !== id))} className="rounded p-0.5 text-faint hover:bg-hover hover:text-fg">
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
                <Menu
                  trigger={
                    <span className="flex h-6 items-center gap-1 rounded border border-dashed border-line-strong px-2.5 text-[12px] text-muted hover:text-fg">
                      <Plus size={12} /> Add a page or issue
                    </span>
                  }
                  options={contextOptions}
                  onSelect={(id) => setContext((c) => [...c, id])}
                  placeholder="Search pages and issues…"
                />
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Call title (optional)"
                aria-label="Call title"
                className="mt-3 h-9 w-full rounded-lg border border-line bg-panel px-3 outline-none focus:border-accent"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="primary" className="h-10 px-5 text-[14px]" disabled={!selected.length || starting} onClick={() => void start()}>
                <Phone size={15} /> {starting ? "Connecting…" : "Start call"}
              </Button>
              <Button variant="ghost" onClick={() => void checkMic()} disabled={mic === "checking"}>
                <Mic size={14} />
                {mic === "granted" ? "Mic ready" : mic === "denied" ? "Mic blocked — check browser permissions" : mic === "checking" ? "Checking…" : "Test microphone"}
              </Button>
              {!support.stt && <span className="text-xs text-warning">Voice input needs Chrome or Edge; typing works everywhere.</span>}
              {err && <span className="text-xs text-danger">{err}</span>}
            </div>
          </div>

          <div className="mt-10">
            <h2 className="mb-2 text-[13px] font-medium">Recent calls</h2>
            {!recent.length && <p className="text-muted">No calls yet. Your first one is a click away.</p>}
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link href={c.status === "ended" && c.summaryPageId ? `/page/${c.summaryPageId}` : `/call/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-hover">
                    <span className={clsx("h-2 w-2 rounded", c.status === "live" ? "bg-danger" : "bg-faint")} />
                    <span className="flex-1 truncate">{c.title}</span>
                    <span className="flex -space-x-1">
                      {c.participantIds.map((id) => <Avatar key={id} member={db.members[id]} size={16} ring />)}
                    </span>
                    <span className="w-28 text-right text-xs text-faint">{c.notes.length} notes · {relativeTime(c.startedAt)}</span>
                    <span className="w-16 text-right text-xs text-muted">{c.status === "live" ? "Rejoin" : "Notes"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
