"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { identifier } from "@/lib/workspace";
import { LabelPill, StatusIcon, clsx } from "@/components/ui";
import { groupByStatus, issueHref, updateIssue } from "./helpers";
import { IssueAssignee, IssuePriority, ProjectGlyph } from "./PropertyMenus";

/** Kanban board: one column per workflow state, native HTML5 drag-and-drop moves cards between states. */
export function Board({ issues, createDefaults }: { issues: Item[]; createDefaults?: { teamId?: string; projectId?: string } }) {
  const db = useStore((s) => s.db);
  const setUI = useStore((s) => s.setUI);
  const columns = useMemo(() => groupByStatus(db, issues).filter((c) => c.state.type !== "canceled"), [db, issues]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  return (
    <div className="flex flex-1 gap-3 overflow-x-auto p-4">
      {columns.map(({ state, issues: list }) => (
        <div
          key={state.id}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (overCol !== state.id) setOverCol(state.id);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/council-issue") || dragId;
            setOverCol(null);
            setDragId(null);
            const it = id ? db.items[id] : null;
            if (it && it.stateId !== state.id) updateIssue(it.id, { stateId: state.id });
          }}
          className={clsx(
            "flex w-72 shrink-0 flex-col rounded-lg border bg-elev transition-colors",
            overCol === state.id ? "border-accent/70 bg-accent-soft" : "border-line",
          )}
        >
          <div className="flex h-10 items-center gap-2 px-3">
            <StatusIcon state={state} />
            <span className="font-medium">{state.name}</span>
            <span className="text-faint">{list.length}</span>
            <button
              className="ml-auto rounded p-1 text-faint hover:bg-hover hover:text-fg"
              aria-label={`Create issue in ${state.name}`}
              onClick={() => setUI({ createIssue: { ...createDefaults, stateId: state.id } })}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
            {list.map((item) => (
              <Card key={item.id} item={item} dragging={dragId === item.id} onDragStart={() => setDragId(item.id)} onDragEnd={() => setDragId(null)} />
            ))}
            {!list.length && <div className="rounded-md border border-dashed border-line p-4 text-center text-[12px] text-faint">Drop issues here</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ item, dragging, onDragStart, onDragEnd }: { item: Item; dragging: boolean; onDragStart: () => void; onDragEnd: () => void }) {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const project = item.projectId ? db.projects[item.projectId] : null;
  const labels = (item.labelIds ?? []).map((id) => db.labels[id]).filter(Boolean);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/council-issue", item.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => router.push(issueHref(db, item))}
      className={clsx(
        "cursor-grab rounded-md border border-line bg-panel p-3 shadow-sm transition hover:border-line-strong active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-faint">{identifier(db, item)}</span>
        <span className="ml-auto">
          <IssueAssignee item={item} size={16} />
        </span>
      </div>
      <div className="mt-1 line-clamp-3 text-[13px] leading-snug text-fg">{item.title || "Untitled"}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <IssuePriority item={item} />
        {project && (
          <span className="inline-flex h-5 items-center gap-1 rounded-full border border-line px-1.5 text-[11px] text-muted">
            <ProjectGlyph icon={project.icon} color={project.color} size={11} />
            <span className="max-w-[120px] truncate">{project.name}</span>
          </span>
        )}
        {labels.slice(0, 2).map((l) => (
          <LabelPill key={l.id} name={l.name} color={l.color} />
        ))}
      </div>
    </div>
  );
}
