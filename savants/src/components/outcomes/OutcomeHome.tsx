"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, Palette, Plus, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { LOOK_BY_ID, type PresenceLook } from "@/lib/presence";
import { REP_TEMPLATES, STANDING_LOOKS, suggestTeam, type TeamPick } from "@/lib/reps";
import type { Member, Outcome } from "@/lib/types";
import { Avatar, Button, clsx, PageHeader } from "@/components/ui";
import { Presence } from "@/components/presence/Presence";
import { LookPicker } from "./LookPicker";
import { TeamStage, ViewPicker, type StageMember } from "./TeamStage";
import { deadlineNote, OUTCOME_STATUS } from "./status";

const EXAMPLES = [
  "Grow revenue 20% by 31 December",
  "Sign 3 paying pilots before the end of November",
  "Cut churn below 3% this quarter",
  "Get 1,000 people on the waitlist by launch day",
];

function endOfYear(): string {
  return `${new Date().getFullYear()}-12-31`;
}

interface Candidate {
  key: string; // agent id or template key
  agentId?: string;
  template?: string;
  name: string;
  role: string;
  color: string;
  isNew: boolean;
  defaultLook: PresenceLook;
}

export function OutcomeHome() {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const [step, setStep] = useState<"ask" | "team">("ask");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(endOfYear());
  const [guardrails, setGuardrails] = useState("");
  const [showGuardrails, setShowGuardrails] = useState(false);
  const [picked, setPicked] = useState<Record<string, PresenceLook>>({});
  const [view, setView] = useState("orbit");
  const [lookFor, setLookFor] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo<Candidate[]>(() => {
    const savants = Object.values(db.members).filter((m): m is Member & { agent: NonNullable<Member["agent"]> } => m.kind === "agent" && !!m.agent && m.id !== "a_mcp");
    const fromSavants = savants.map((m) => ({
      key: m.id,
      agentId: m.id,
      name: m.name,
      role: m.agent.role,
      color: m.color,
      isNew: false,
      defaultLook: m.agent.presence ?? STANDING_LOOKS[m.id] ?? "signal",
    }));
    const fromTemplates = REP_TEMPLATES.filter((t) => !savants.some((m) => m.agent.role === t.role)).map((t) => ({
      key: t.key,
      template: t.key,
      name: t.name,
      role: t.role,
      color: t.color,
      isNew: true,
      defaultLook: t.look,
    }));
    return [...fromSavants, ...fromTemplates];
  }, [db.members]);

  const goTeam = () => {
    const suggested = suggestTeam(db, title);
    const next: Record<string, PresenceLook> = {};
    for (const s of suggested) next[s.agentId ?? s.template!] = s.look;
    setPicked(next);
    setStep("team");
  };

  const toggle = (c: Candidate) =>
    setPicked((p) => {
      const n = { ...p };
      if (n[c.key]) delete n[c.key];
      else n[c.key] = c.defaultLook;
      return n;
    });

  const team = candidates.filter((c) => picked[c.key]);
  const leadCandidate = team.find((c) => c.agentId && db.members[c.agentId]?.agent?.lead) ?? team[0];

  const start = async () => {
    setBusy(true);
    setError(null);
    const body: { title: string; deadline: string | null; guardrails?: string; view: string; team: TeamPick[] } = {
      title,
      deadline: deadline || null,
      guardrails: guardrails.trim() || undefined,
      view,
      team: team.map((c) => (c.agentId ? { agentId: c.agentId, look: picked[c.key] } : { template: c.template, look: picked[c.key] })),
    };
    try {
      const res = await fetch("/api/outcomes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start");
      router.push(`/outcome/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start");
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Outcomes" icon={<Target size={14} className="text-muted" />} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[820px] px-6 pb-20 pt-12">
          {step === "ask" ? (
            <AskStep
              title={title}
              setTitle={setTitle}
              deadline={deadline}
              setDeadline={setDeadline}
              guardrails={guardrails}
              setGuardrails={setGuardrails}
              showGuardrails={showGuardrails}
              setShowGuardrails={setShowGuardrails}
              onNext={goTeam}
            />
          ) : (
            <>
              <button onClick={() => setStep("ask")} className="inline-flex items-center gap-1 text-[12px] font-medium text-faint hover:text-fg">
                <ChevronLeft size={13} /> Change the outcome
              </button>
              <h2 className="mt-4 text-balance text-[24px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
              <p className="mt-1 text-[13px] text-faint">{deadlineNote(deadline)}{guardrails.trim() ? ` · Guardrails: ${guardrails.trim()}` : ""}</p>

              <section className="mt-10">
                <div className="mb-3 flex items-baseline gap-2">
                  <h3 className="text-[13px] font-medium text-fg">Who owns it</h3>
                  <span className="text-[12px] text-faint">Suggested from your outcome. Tap to add or remove; new reps are spun up when you start.</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {candidates.map((c) => (
                    <RepCard key={c.key} c={c} look={picked[c.key]} lead={leadCandidate?.key === c.key} onToggle={() => toggle(c)} onLook={() => setLookFor(c)} />
                  ))}
                </div>
              </section>

              {team.length > 0 && leadCandidate && (
                <section className="mt-10">
                  <div className="mb-3 flex items-baseline gap-2">
                    <h3 className="text-[13px] font-medium text-fg">How you watch them work</h3>
                    <span className="text-[12px] text-faint">You can switch any time from the outcome room.</span>
                  </div>
                  <div data-theme="dark" className="overflow-hidden rounded-xl border-[0.5px] border-line bg-[#0b0c0e] p-3">
                    <ViewPicker value={view} onChange={setView} />
                    <DemoStage view={view} lead={leadCandidate} reps={team.filter((c) => c.key !== leadCandidate.key)} />
                  </div>
                </section>
              )}

              <div className="mt-8 flex items-center justify-end gap-3">
                {error && <span className="text-[12px] text-danger">{error}</span>}
                <span className="text-[12px] text-faint">{team.length} on the team · anything that changes your workspace waits for your OK</span>
                <Button variant="primary" onClick={start} disabled={busy || !team.length}>
                  {busy ? "Planning…" : "Start working"} {!busy && <ArrowRight size={13} />}
                </Button>
              </div>
            </>
          )}

          {step === "ask" && <OutcomeList />}
        </div>
      </div>
      {lookFor && (
        <LookPicker
          name={lookFor.name}
          color={lookFor.color}
          value={picked[lookFor.key] ?? lookFor.defaultLook}
          onChange={(l) => setPicked((p) => ({ ...p, [lookFor.key]: l }))}
          onClose={() => setLookFor(null)}
        />
      )}
    </>
  );
}

function AskStep(p: {
  title: string;
  setTitle: (v: string) => void;
  deadline: string;
  setDeadline: (v: string) => void;
  guardrails: string;
  setGuardrails: (v: string) => void;
  showGuardrails: boolean;
  setShowGuardrails: (v: boolean) => void;
  onNext: () => void;
}) {
  const ready = p.title.trim().length >= 3;
  return (
    <>
      <h1 className="text-balance text-[28px] font-semibold tracking-[-0.015em] text-fg">What outcome do you want?</h1>
      <p className="mt-2 max-w-[60ch] text-muted">Say what should be true, and by when. The savants plan it, split it between them and get to work. Anything that changes your workspace waits for your OK.</p>
      <div className="mt-6 rounded-xl border-[0.5px] border-line-strong bg-panel shadow-[var(--shadow-panel)] focus-within:border-accent">
        <textarea
          autoFocus
          value={p.title}
          onChange={(e) => p.setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && ready) {
              e.preventDefault();
              p.onNext();
            }
          }}
          rows={2}
          placeholder="Grow revenue 20% by 31 December"
          aria-label="Outcome"
          className="block w-full resize-none bg-transparent px-4 pt-4 text-[17px] leading-snug text-fg outline-none placeholder:text-disabled"
        />
        {p.showGuardrails && (
          <textarea
            value={p.guardrails}
            onChange={(e) => p.setGuardrails(e.target.value)}
            rows={2}
            placeholder="Guardrails: no discounts over 15%, nothing sent to customers without my review…"
            aria-label="Guardrails"
            className="mx-4 mt-2 block w-[calc(100%-32px)] resize-none rounded-lg border-[0.5px] border-line bg-bg px-3 py-2 text-[13px] outline-none placeholder:text-disabled focus:border-accent"
          />
        )}
        <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-3">
          <label className="flex h-7 items-center gap-1.5 rounded-md border-[0.5px] border-line-strong bg-bg px-2 text-[12px] text-muted">
            By
            <input type="date" value={p.deadline} onChange={(e) => p.setDeadline(e.target.value)} aria-label="Deadline" className="bg-transparent text-fg outline-none" />
          </label>
          <button
            onClick={() => p.setShowGuardrails(!p.showGuardrails)}
            className={clsx("h-7 rounded-md border-[0.5px] px-2 text-[12px] transition-colors", p.showGuardrails ? "border-accent text-fg" : "border-line-strong text-muted hover:text-fg")}
          >
            {p.showGuardrails ? "Guardrails on" : "+ Guardrails"}
          </button>
          <span className="flex-1" />
          <Button variant="primary" onClick={p.onNext} disabled={!ready}>
            Choose the team <ArrowRight size={13} />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => p.setTitle(e)} className="h-7 rounded-full border-[0.5px] border-line px-3 text-[12px] text-faint transition-colors hover:border-line-strong hover:text-fg">
            {e}
          </button>
        ))}
      </div>
    </>
  );
}

function RepCard({ c, look, lead, onToggle, onLook }: { c: Candidate; look?: PresenceLook; lead: boolean; onToggle: () => void; onLook: () => void }) {
  const on = !!look;
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={clsx(
        "relative flex items-center gap-3 rounded-lg border-[0.5px] p-3 transition-colors",
        on ? "border-line-strong bg-panel" : "border-line bg-transparent opacity-70 hover:opacity-100",
      )}
    >
      <button onClick={onToggle} aria-pressed={on} aria-label={`${on ? "Remove" : "Add"} ${c.name}`} className="absolute inset-0 rounded-lg" />
      <span data-theme="dark" className="pointer-events-none flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0b0c0e]">
        <Presence look={look ?? c.defaultLook} color={c.color} state={on ? (hover ? "thinking" : "speaking") : "idle"} size={34} seedKey={c.key} />
      </span>
      <div className="pointer-events-none min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-fg">{c.name}</span>
          {lead && on && <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[11px] font-medium text-accent">Lead</span>}
        </div>
        <div className="truncate text-[12px] text-faint">
          {c.role}
          {c.isNew && " · new rep"}
        </div>
      </div>
      {on ? (
        <button onClick={onLook} title={`Change how ${c.name} looks (now: ${LOOK_BY_ID[look!]?.name})`} aria-label={`Change how ${c.name} looks`} className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint hover:bg-hover hover:text-fg">
          <Palette size={14} />
        </button>
      ) : (
        <Plus size={14} className="pointer-events-none text-faint" />
      )}
    </div>
  );
}

// A live preview of the chosen team view with work handed out and reported back on a loop.
function DemoStage({ view, lead, reps }: { view: string; lead: Candidate; reps: Candidate[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1600);
    return () => clearInterval(id);
  }, []);
  const statuses: StageMember["status"][] = ["queued", "working", "working", "done", "needs-you", "working"];
  const members: StageMember[] = reps.map((r, i) => ({ id: r.key, name: r.name, color: r.color, status: statuses[(tick + i * 2) % statuses.length], thinking: (tick + i) % 3 === 0 }));
  return <TeamStage view={view} lead={{ id: lead.key, name: lead.name, color: lead.color, status: "lead" }} reps={members} height={280} />;
}

function OutcomeList() {
  const db = useStore((s) => s.db);
  const outcomes = useMemo(() => Object.values(db.outcomes ?? {}).sort((a, b) => b.createdAt - a.createdAt), [db.outcomes]);
  if (!outcomes.length) return null;
  return (
    <section className="mt-16">
      <h3 className="mb-3 text-[13px] font-medium text-fg">Your outcomes</h3>
      <div className="overflow-hidden rounded-lg border-[0.5px] border-line">
        {outcomes.map((o) => (
          <OutcomeRow key={o.id} o={o} />
        ))}
      </div>
    </section>
  );
}

function OutcomeRow({ o }: { o: Outcome }) {
  const db = useStore((s) => s.db);
  const done = o.workstreams.filter((w) => w.status === "done").length;
  const working = o.workstreams.filter((w) => w.status === "working").length;
  const s = OUTCOME_STATUS[o.status];
  return (
    <Link href={`/outcome/${o.id}`} className="flex h-14 items-center gap-3 border-b-[0.5px] border-line-row px-4 last:border-b-0 hover:bg-hover">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-fg">{o.title}</div>
        <div className="truncate text-[12px] text-faint">
          {s.label}
          {working ? ` · ${working} working now` : ""} · {done} of {o.workstreams.length} done · {deadlineNote(o.deadline)}
        </div>
      </div>
      <div className="flex -space-x-1">
        {o.repIds.slice(0, 6).map((id) => (
          <Avatar key={id} member={db.members[id]} size={20} ring />
        ))}
      </div>
    </Link>
  );
}
