"use client";

import { useMemo } from "react";
import type { BoardNote, NoteKind, Proposal } from "@/lib/types";
import { useStore } from "@/lib/store";
import { clsx } from "@/components/ui";
import { ProposalCard } from "@/components/approvals/ProposalCard";

export const NOTE_STYLE: Record<NoteKind, { label: string; color: string }> = {
  decision: { label: "Decision", color: "#4cb782" },
  action: { label: "Action", color: "#f59e0b" },
  risk: { label: "Risk", color: "#f43f5e" },
  question: { label: "Question", color: "#38bdf8" },
  assumption: { label: "Assumption", color: "#a78bfa" },
  claim: { label: "Claim", color: "#e5e7eb" },
};

const ORDER: NoteKind[] = ["decision", "action", "risk", "question", "assumption", "claim"];

export function ReasoningBoard({ notes, proposals, freshIds }: { notes: BoardNote[]; proposals: Proposal[]; freshIds: Set<string> }) {
  const db = useStore((s) => s.db);
  const groups = useMemo(() => ORDER.map((k) => ({ kind: k, notes: notes.filter((n) => n.kind === k) })).filter((g) => g.notes.length), [notes]);
  const pending = proposals.filter((p) => p.status === "pending").length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Reasoning board</h2>
        <span className="ml-auto text-[11px] text-white/35">{notes.length} notes</span>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {!groups.length && <p className="text-xs leading-relaxed text-white/35">As the council talks, they pin claims, assumptions, questions, risks, decisions and actions here. This becomes the call&apos;s summary.</p>}
        {groups.map((g) => (
          <section key={g.kind}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: NOTE_STYLE[g.kind].color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: NOTE_STYLE[g.kind].color }} />
              {NOTE_STYLE[g.kind].label}s
            </div>
            <ul className="space-y-1.5">
              {g.notes.map((n) => {
                const author = db.members[n.authorId];
                return (
                  <li
                    key={n.id}
                    className={clsx("rounded-md border-l-2 bg-white/[0.04] px-2.5 py-1.5 text-[12.5px] leading-snug text-white/85", freshIds.has(n.id) && "animate-fade-in")}
                    style={{ borderColor: NOTE_STYLE[g.kind].color }}
                  >
                    {n.text}
                    <span className="ml-1.5 text-[10.5px] text-white/35">— {author?.name ?? "?"}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {proposals.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-white/60">
              Proposed actions {pending > 0 && <span className="rounded-full bg-amber-400/20 px-1.5 text-amber-300">{pending} waiting</span>}
            </div>
            <div className="space-y-2">
              {[...proposals].reverse().map((p) => (
                <ProposalCard key={p.id} proposal={p} compact tone="call" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
