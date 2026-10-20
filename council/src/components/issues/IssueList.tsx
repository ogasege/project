"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { EmptyState, StatusIcon, clsx } from "@/components/ui";
import { groupByStatus, issueHref, isTypingTarget } from "./helpers";
import { IssueRow } from "./IssueRow";

/**
 * Linear-style list grouped by workflow state. Groups collapse; empty groups are hidden
 * (except when `showEmpty`). j/k (or ↓/↑) move the selection, Enter opens.
 */
export function IssueList({
  issues,
  createDefaults,
  showEmpty = false,
  showProject = true,
  emptyTitle = "No issues",
  emptyBody,
}: {
  issues: Item[];
  createDefaults?: { teamId?: string; projectId?: string; assigneeId?: string };
  showEmpty?: boolean;
  showProject?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const db = useStore((s) => s.db);
  const setUI = useStore((s) => s.setUI);
  const router = useRouter();
  const groups = useMemo(() => groupByStatus(db, issues), [db, issues]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => ({ st_done: true, st_canceled: true }));
  const [selected, setSelected] = useState(-1);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const visible = useMemo(() => groups.filter((g) => !collapsed[g.state.id]).flatMap((g) => g.issues), [groups, collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[role=dialog],[data-menu-panel]")) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(visible.length - 1, s + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
      } else if (e.key === "Enter" && selected >= 0 && visible[selected] && !(e.target as HTMLElement).closest?.("button,a")) {
        e.preventDefault();
        router.push(issueHref(db, visible[selected]));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selected, router, db]);

  useEffect(() => {
    rowRefs.current[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!issues.length) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        action={
          <button className="mt-2 rounded-md bg-accent px-3 py-1.5 text-accent-fg hover:brightness-110" onClick={() => setUI({ createIssue: { ...createDefaults } })}>
            Create issue <span className="ml-1 opacity-70">C</span>
          </button>
        }
      />
    );
  }

  let index = -1;
  return (
    <div role="grid" aria-label="Issues" className="flex-1 overflow-y-auto pb-16">
      {groups.map(({ state, issues: list }) => {
        if (!list.length && !showEmpty) return null;
        const isCollapsed = !!collapsed[state.id];
        return (
          <section key={state.id}>
            <div className="sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-line bg-panel/95 px-4 backdrop-blur">
              <button
                className="flex items-center gap-2 text-[13px] font-medium"
                onClick={() => setCollapsed((c) => ({ ...c, [state.id]: !c[state.id] }))}
                aria-expanded={!isCollapsed}
              >
                <ChevronRight size={12} className={clsx("text-faint transition-transform", !isCollapsed && "rotate-90")} />
                <StatusIcon state={state} />
                {state.name}
                <span className="font-normal text-faint">{list.length}</span>
              </button>
              <button
                className="ml-auto rounded p-1 text-faint hover:bg-hover hover:text-fg"
                aria-label={`Create issue in ${state.name}`}
                onClick={() => setUI({ createIssue: { ...createDefaults, stateId: state.id } })}
              >
                <Plus size={14} />
              </button>
            </div>
            {!isCollapsed &&
              list.map((item) => {
                index++;
                const i = index;
                return (
                  <IssueRow
                    key={item.id}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    item={item}
                    selected={selected === i}
                    onHover={() => setSelected(i)}
                    showProject={showProject}
                  />
                );
              })}
          </section>
        );
      })}
    </div>
  );
}
