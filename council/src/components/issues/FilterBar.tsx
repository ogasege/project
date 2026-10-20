"use client";

import { useMemo } from "react";
import { ListFilter, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Priority } from "@/lib/types";
import { PRIORITIES } from "@/lib/workspace";
import { Avatar, Menu, PriorityIcon, clsx } from "@/components/ui";
import { type IssueFilters, EMPTY_FILTERS, hasFilters } from "./helpers";
import { ProjectGlyph } from "./PropertyMenus";

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

const chip = "h-6 rounded-md border border-dashed border-line-strong px-2 text-[12px] text-muted hover:border-solid hover:text-fg";
const activeChip = "border-solid border-accent/60 bg-accent-soft text-fg";

export function FilterBar({ filters, onChange, count }: { filters: IssueFilters; onChange: (f: IssueFilters) => void; count: number }) {
  const db = useStore((s) => s.db);
  const members = useMemo(() => Object.values(db.members), [db.members]);
  const labels = useMemo(() => Object.values(db.labels), [db.labels]);
  const projects = useMemo(() => Object.values(db.projects), [db.projects]);

  return (
    <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-line px-4">
      <ListFilter size={13} className="text-faint" />
      <Menu
        multi
        className={clsx(chip, filters.assigneeIds.length && activeChip)}
        trigger={<span>Assignee{filters.assigneeIds.length ? ` · ${filters.assigneeIds.length}` : ""}</span>}
        value={filters.assigneeIds}
        options={[
          { value: "none", label: "Unassigned", icon: <Avatar member={null} size={16} /> },
          ...members.map((m) => ({ value: m.id, label: m.name, icon: <Avatar member={m} size={16} />, hint: m.kind === "agent" ? "agent" : undefined })),
        ]}
        onSelect={(v) => onChange({ ...filters, assigneeIds: toggle(filters.assigneeIds, v) })}
      />
      <Menu
        multi
        className={clsx(chip, filters.priorities.length && activeChip)}
        trigger={<span>Priority{filters.priorities.length ? ` · ${filters.priorities.length}` : ""}</span>}
        value={filters.priorities}
        options={PRIORITIES.map((p) => ({ value: p.value, label: p.label, icon: <PriorityIcon priority={p.value as Priority} /> }))}
        onSelect={(v) => onChange({ ...filters, priorities: toggle(filters.priorities, v) })}
      />
      <Menu
        multi
        className={clsx(chip, filters.labelIds.length && activeChip)}
        trigger={<span>Label{filters.labelIds.length ? ` · ${filters.labelIds.length}` : ""}</span>}
        value={filters.labelIds}
        options={labels.map((l) => ({ value: l.id, label: l.name, icon: <span className="h-2 w-2 rounded-full" style={{ background: l.color }} /> }))}
        onSelect={(v) => onChange({ ...filters, labelIds: toggle(filters.labelIds, v) })}
      />
      <Menu
        multi
        className={clsx(chip, filters.projectIds.length && activeChip)}
        trigger={<span>Project{filters.projectIds.length ? ` · ${filters.projectIds.length}` : ""}</span>}
        value={filters.projectIds}
        options={[{ value: "none", label: "No project" }, ...projects.map((p) => ({ value: p.id, label: p.name, icon: <ProjectGlyph icon={p.icon} color={p.color} /> }))]}
        onSelect={(v) => onChange({ ...filters, projectIds: toggle(filters.projectIds, v) })}
      />
      {hasFilters(filters) && (
        <button className="ml-1 inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[12px] text-muted hover:bg-hover hover:text-fg" onClick={() => onChange(EMPTY_FILTERS)}>
          <X size={12} /> Clear
        </button>
      )}
      <span className="ml-auto text-[12px] text-faint">
        {count} issue{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}
