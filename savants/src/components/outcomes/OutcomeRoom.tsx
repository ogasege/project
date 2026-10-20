"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Phone, RotateCw, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { identifier, relativeTime } from "@/lib/workspace";
import type { Outcome, Workstream } from "@/lib/types";
import type { PresenceState } from "@/lib/presence";
import { Button, clsx, PageHeader } from "@/components/ui";
import { Presence } from "@/components/presence/Presence";
import { ProposalCard } from "@/components/approvals/ProposalCard";
import { TeamStage, ViewPicker, type StageMember } from "./TeamStage";
import { deadlineNote, OUTCOME_STATUS, WORKSTREAM_STATUS } from "./status";

function stateOf(w: Workstream): PresenceState {
  if (w.status !== "working") return "idle";
  return w.phase === "writing" ? "speaking" : "thinking";
}

export function OutcomeRoom({ outcome: o }: { outcome: Outcome }) {
  const db = useStore((s) => s.db);
  const [error, setError] = useState<string | null>(null);
  const lead = db.members[o.leadId];
  const view = o.view ?? "orbit";
  const working = o.workstreams.some((w) => w.status === "working" || w.status === "queued") && o.status === "working";
  const pending = useMemo(() => {
    const items = new Set(o.workstreams.map((w) => w.itemId));
    return Object.values(db.proposals)
      .filter((p) => p.status === "pending" && p.itemId && items.has(p.itemId))
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [db.proposals, o.workstreams]);

  const post = async (body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch(`/api/outcomes/${o.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
  };

  // The lead's own stream drives the lead's state on the stage.
  const leadWs = o.workstreams.find((w) => w.agentId === o.leadId);
  const stageLead: StageMember = { id: o.leadId, name: lead?.name ?? "Lead", color: lead?.color ?? "#8b5cf6", status: "lead", thinking: leadWs?.status === "working" && leadWs.phase !== "writing" };
  // One node per savant, even when it owns several workstreams: busiest status wins.
  const rank: StageMember["status"][] = ["working", "needs-you", "queued", "failed", "done"];
  const stageReps: StageMember[] = o.repIds
    .filter((id) => id !== o.leadId)
    .map((id) => {
      const mine = o.workstreams.filter((w) => w.agentId === id);
      const status = rank.find((s) => mine.some((w) => w.status === s)) ?? "queued";
      const thinking = mine.some((w) => w.status === "working" && w.phase !== "writing");
      return { id, name: db.members[id]?.name ?? "Savant", color: db.members[id]?.color ?? "#888", status, thinking };
    });
  const status = OUTCOME_STATUS[o.status];
  const done = o.workstreams.filter((w) => w.status === "done").length;
  const callHref = `/call?agents=${o.repIds.join(",")}&context=${o.workstreams.map((w) => w.itemId).filter(Boolean).slice(0, 4).join(",")}`;

  return (
    <>
      <PageHeader
        icon={<Target size={14} className="text-muted" />}
        title={
          <span className="flex min-w-0 items-center gap-1.5">
            <Link href="/" className="text-faint hover:text-fg">
              Outcomes
            </Link>
            <span className="text-disabled">›</span>
            <span className="truncate">{o.title}</span>
          </span>
        }
      >
        <Link href={callHref} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-faint hover:bg-hover hover:text-fg">
          <Phone size={13} /> Talk it through
        </Link>
        <Button size="sm" onClick={() => void post({ action: "run" })} disabled={working}>
          <RotateCw size={12} /> {working ? "Working…" : "Another round"}
        </Button>
        {o.status !== "achieved" && (
          <Button size="sm" variant="ghost" onClick={() => void post({ action: "status", status: "achieved" })}>
            Mark achieved
          </Button>
        )}
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1080px] px-6 pb-20 pt-8">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-faint">
            <span className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-line-strong px-2 py-0.5 text-muted">
              <span className={clsx("h-1.5 w-1.5 rounded-full", o.status === "working" && "animate-pulse")} style={{ background: status.color }} />
              {status.label}
            </span>
            <span>{deadlineNote(o.deadline)}</span>
            <span>·</span>
            <span>Round {Math.max(1, o.rounds)}</span>
            <span>·</span>
            <span>{done} of {o.workstreams.length} reported back</span>
            <span>·</span>
            <span title={o.plannedBy === "model" ? "Planned by the model" : "Planned without the model (no working API key), by role"}>{o.plannedBy === "model" ? "Planned by the model" : "Planned by role"}</span>
          </div>
          <h1 className="mt-3 text-balance text-[26px] font-semibold tracking-[-0.015em] text-fg">{o.title}</h1>
          {o.strategy && <p className="mt-2 max-w-[75ch] text-muted">{o.strategy}</p>}
          {o.measure && <p className="mt-1 text-[12px] text-faint">Measure: {o.measure}</p>}
          {o.guardrails && <p className="mt-1 text-[12px] text-faint">Guardrails: {o.guardrails}</p>}
          {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}

          {/* The team, live */}
          <section data-theme="dark" className="mt-6 overflow-hidden rounded-xl border-[0.5px] border-line bg-[#0b0c0e]" aria-label="The team at work">
            <div className="flex flex-wrap items-center gap-2 border-b-[0.5px] border-white/10 px-3 py-2.5">
              <span className="mr-2 text-[12px] font-medium text-[#e6e7ea]">
                {lead?.name ?? "The lead"} and {stageReps.length} specialist{stageReps.length === 1 ? "" : "s"}
              </span>
              <span className="flex-1" />
              <ViewPicker value={view} onChange={(v) => void post({ action: "view", view: v })} />
            </div>
            <TeamStage view={view} lead={stageLead} reps={stageReps} height={360} />
          </section>

          {pending.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[13px] font-medium text-fg">Needs you</h2>
                <span className="text-[12px] text-faint">
                  {pending.length} decision{pending.length === 1 ? "" : "s"} before the team can act
                </span>
              </div>
              <div className="space-y-2">
                {pending.map((p) => (
                  <ProposalCard key={p.id} proposal={p} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-[13px] font-medium text-fg">Who is doing what</h2>
            <div className="space-y-2">
              {o.workstreams.map((w) => (
                <WorkstreamCard key={w.id} w={w} isLead={w.agentId === o.leadId} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function WorkstreamCard({ w, isLead }: { w: Workstream; isLead: boolean }) {
  const db = useStore((s) => s.db);
  const [open, setOpen] = useState(false);
  const agent = db.members[w.agentId];
  const item = w.itemId ? db.items[w.itemId] : undefined;
  const s = WORKSTREAM_STATUS[w.status];
  return (
    <div className="rounded-lg border-[0.5px] border-line bg-panel">
      <div className="flex items-start gap-3 p-3">
        <span data-theme="dark" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0b0c0e]">
          <Presence look={agent?.agent?.presence} color={agent?.color ?? "#888"} state={stateOf(w)} size={32} seedKey={w.agentId} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[13px] font-medium text-fg">{agent?.name}</span>
            <span className="text-[12px] text-faint">{agent?.agent?.role}{isLead ? " · lead" : ""}</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-faint">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {w.status === "working" ? (w.phase === "writing" ? "Writing" : "Thinking") : s.label}
            </span>
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            {item ? (
              <Link href={`/issue/${identifier(db, item)}`} className="hover:text-fg hover:underline">
                <span className="tabular-nums text-faint">{identifier(db, item)}</span> {w.title}
              </Link>
            ) : (
              w.title
            )}
          </div>
          {w.activity && <p className={clsx("mt-1 line-clamp-2 text-[12px]", w.status === "working" ? "text-fg" : "text-faint")}>{w.activity}</p>}
        </div>
        {w.log.length > 0 && (
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12px] text-faint hover:bg-hover hover:text-fg">
            {w.log.length} step{w.log.length === 1 ? "" : "s"} <ChevronDown size={12} className={clsx("transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      {open && (
        <ol className="space-y-1 border-t-[0.5px] border-line px-3 py-2.5 pl-[72px]">
          {w.log.map((l, i) => (
            <li key={i} className="flex gap-2 text-[12px]">
              <span className="w-16 shrink-0 text-faint">{relativeTime(l.at)}</span>
              <span className="text-muted">{l.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
