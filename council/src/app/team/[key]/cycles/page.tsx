"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { issues as allIssues } from "@/lib/workspace";
import { EmptyState, clsx } from "@/components/ui";
import { IssueRow } from "@/components/issues/IssueRow";
import { TeamHeader, useTeam } from "@/components/issues/TeamViews";
import { sortIssues, statusProgress } from "@/components/issues/helpers";

function cycleState(startsAt: string, endsAt: string): "current" | "upcoming" | "past" {
  const today = new Date().toISOString().slice(0, 10);
  if (today < startsAt) return "upcoming";
  if (today > endsAt) return "past";
  return "current";
}

function fmt(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TeamCyclesPage() {
  const team = useTeam();
  const db = useStore((s) => s.db);
  const cycles = useMemo(
    () => (team ? Object.values(db.cycles).filter((c) => c.teamId === team.id).sort((a, b) => b.number - a.number) : []),
    [db.cycles, team],
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (!team) return <EmptyState title="Team not found" />;

  return (
    <>
      <TeamHeader team={team} />
      <div className="flex-1 overflow-y-auto">
        {!cycles.length && <EmptyState title="No cycles" body="Cycles are time-boxed sprints. This team doesn't have any yet." />}
        {cycles.map((c) => {
          const list = sortIssues(allIssues(db).filter((i) => i.cycleId === c.id));
          const prog = statusProgress(db, list);
          const st = cycleState(c.startsAt, c.endsAt);
          const isOpen = open[c.id] ?? st === "current";
          const daysLeft = Math.max(0, Math.ceil((new Date(c.endsAt + "T23:59:59").getTime() - Date.now()) / 86_400_000));
          return (
            <section key={c.id} className="border-b border-line">
              <button
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-hover/60"
                onClick={() => setOpen((o) => ({ ...o, [c.id]: !isOpen }))}
                aria-expanded={isOpen}
              >
                <ChevronRight size={13} className={clsx("text-faint transition-transform", isOpen && "rotate-90")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Cycle {c.number}
                      {c.name ? ` · ${c.name}` : ""}
                    </span>
                    <span
                      className={clsx(
                        "rounded-full px-2 text-[11px]",
                        st === "current" ? "bg-accent-soft text-accent" : st === "upcoming" ? "bg-panel text-muted" : "bg-panel text-faint",
                      )}
                    >
                      {st === "current" ? `Current · ${daysLeft}d left` : st === "upcoming" ? "Upcoming" : "Completed"}
                    </span>
                  </div>
                  <div className="text-[12px] text-faint">
                    {fmt(c.startsAt)} → {fmt(c.endsAt)}
                  </div>
                </div>
                <div className="w-56">
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>
                      {prog.done}/{prog.total} done
                    </span>
                    <span>{prog.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-active">
                    <div className="h-full rounded-full bg-success transition-all" style={{ width: `${prog.pct}%` }} />
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-line/60">
                  {list.length ? list.map((i) => <IssueRow key={i.id} item={i} />) : <div className="px-10 py-4 text-faint">No issues in this cycle.</div>}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
