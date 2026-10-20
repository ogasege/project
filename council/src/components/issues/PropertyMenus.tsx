"use client";

import { useMemo } from "react";
import { Calendar, FolderKanban, RefreshCw, Tag } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Item, Priority } from "@/lib/types";
import { PRIORITIES, STATUS_ORDER } from "@/lib/workspace";
import { Avatar, Menu, PriorityIcon, StatusIcon, clsx } from "@/components/ui";
import { updateIssue } from "./helpers";

// Inline property pickers shared by list rows, board cards, the detail sidebar and the create modal.
// Each takes the current value and an onChange; `issueMenu*` variants write straight to an issue.

const pill = "h-6 rounded-md px-1.5 text-muted hover:bg-hover hover:text-fg";

export function StatusMenu({ value, onChange, showLabel = false, className }: { value?: string; onChange: (id: string) => void; showLabel?: boolean; className?: string }) {
  const db = useStore((s) => s.db);
  const states = useMemo(() => [...db.settings.states].sort((a, b) => STATUS_ORDER.indexOf(a.type) - STATUS_ORDER.indexOf(b.type)), [db.settings.states]);
  const current = states.find((s) => s.id === value);
  return (
    <Menu
      className={clsx(pill, className)}
      trigger={
        <>
          <StatusIcon state={current} />
          {showLabel && <span className="text-fg">{current?.name ?? "Status"}</span>}
        </>
      }
      placeholder="Change status…"
      value={value}
      options={states.map((s) => ({ value: s.id, label: s.name, icon: <StatusIcon state={s} /> }))}
      onSelect={onChange}
    />
  );
}

export function PriorityMenu({ value = 0, onChange, showLabel = false, className }: { value?: Priority; onChange: (p: Priority) => void; showLabel?: boolean; className?: string }) {
  const label = PRIORITIES.find((p) => p.value === value)?.label;
  return (
    <Menu
      className={clsx(pill, className)}
      trigger={
        <>
          <PriorityIcon priority={value} />
          {showLabel && <span className={value ? "text-fg" : "text-muted"}>{label}</span>}
        </>
      }
      placeholder="Set priority…"
      value={value}
      options={[1, 2, 3, 4, 0].map((p) => ({ value: p as Priority, label: PRIORITIES[p].label, icon: <PriorityIcon priority={p as Priority} />, hint: String(p === 0 ? 0 : p) }))}
      onSelect={onChange}
    />
  );
}

export function AssigneeMenu({ value, onChange, showLabel = false, size = 18, className }: { value?: string | null; onChange: (id: string | null) => void; showLabel?: boolean; size?: number; className?: string }) {
  const db = useStore((s) => s.db);
  const members = useMemo(() => {
    const all = Object.values(db.members);
    return [...all.filter((m) => m.kind === "human"), ...all.filter((m) => m.kind === "agent")];
  }, [db.members]);
  const current = value ? db.members[value] : null;
  return (
    <Menu
      className={clsx(pill, className)}
      align="end"
      trigger={
        <>
          <Avatar member={current} size={size} />
          {showLabel && <span className={current ? "text-fg" : "text-muted"}>{current?.name ?? "Unassigned"}</span>}
        </>
      }
      placeholder="Assign to person or agent…"
      value={value ?? "__none"}
      options={[
        { value: "__none", label: "Unassigned", icon: <Avatar member={null} size={16} /> },
        ...members.map((m) => ({ value: m.id, label: m.name, icon: <Avatar member={m} size={16} />, hint: m.kind === "agent" ? m.agent?.role : undefined })),
      ]}
      onSelect={(v) => onChange(v === "__none" ? null : v)}
    />
  );
}

export function LabelsMenu({ value = [], onChange, className }: { value?: string[]; onChange: (ids: string[]) => void; className?: string }) {
  const db = useStore((s) => s.db);
  const labels = useMemo(() => Object.values(db.labels), [db.labels]);
  const chosen = labels.filter((l) => value.includes(l.id));
  return (
    <Menu
      multi
      className={clsx(pill, "min-h-6 flex-wrap", className)}
      trigger={
        chosen.length ? (
          <span className="flex flex-wrap gap-1">
            {chosen.map((l) => (
              <span key={l.id} className="inline-flex h-5 items-center gap-1 rounded-full border border-line px-2 text-[11px] text-fg">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
                {l.name}
              </span>
            ))}
          </span>
        ) : (
          <>
            <Tag size={13} />
            <span>Add label</span>
          </>
        )
      }
      placeholder="Toggle labels…"
      value={value}
      options={labels.map((l) => ({ value: l.id, label: l.name, icon: <span className="h-2 w-2 rounded-full" style={{ background: l.color }} /> }))}
      onSelect={(id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])}
    />
  );
}

export function ProjectMenu({ value, onChange, className }: { value?: string | null; onChange: (id: string | null) => void; className?: string }) {
  const db = useStore((s) => s.db);
  const projects = useMemo(() => Object.values(db.projects), [db.projects]);
  const current = value ? db.projects[value] : null;
  return (
    <Menu
      className={clsx(pill, className)}
      trigger={
        <>
          {current ? <ProjectGlyph icon={current.icon} color={current.color} /> : <FolderKanban size={13} />}
          <span className={clsx("truncate", current ? "text-fg" : "")}>{current?.name ?? "Add to project"}</span>
        </>
      }
      placeholder="Move to project…"
      value={value ?? "__none"}
      options={[
        { value: "__none", label: "No project", icon: <FolderKanban size={13} className="text-faint" /> },
        ...projects.map((p) => ({ value: p.id, label: p.name, icon: <ProjectGlyph icon={p.icon} color={p.color} /> })),
      ]}
      onSelect={(v) => onChange(v === "__none" ? null : v)}
    />
  );
}

export function CycleMenu({ value, teamId, onChange, className }: { value?: string | null; teamId?: string; onChange: (id: string | null) => void; className?: string }) {
  const db = useStore((s) => s.db);
  const cycles = useMemo(() => Object.values(db.cycles).filter((c) => !teamId || c.teamId === teamId), [db.cycles, teamId]);
  const current = value ? db.cycles[value] : null;
  return (
    <Menu
      className={clsx(pill, className)}
      trigger={
        <>
          <RefreshCw size={13} />
          <span className={current ? "text-fg" : ""}>{current ? `Cycle ${current.number}${current.name ? ` · ${current.name}` : ""}` : "Add to cycle"}</span>
        </>
      }
      placeholder="Move to cycle…"
      value={value ?? "__none"}
      options={[
        { value: "__none", label: "No cycle" },
        ...cycles.map((c) => ({ value: c.id, label: `Cycle ${c.number}${c.name ? ` · ${c.name}` : ""}`, hint: `${c.startsAt.slice(5)} → ${c.endsAt.slice(5)}` })),
      ]}
      onSelect={(v) => onChange(v === "__none" ? null : v)}
    />
  );
}

export function ProjectGlyph({ icon, color, size = 16 }: { icon: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
      style={{ width: size, height: size, background: color }}
    >
      {icon}
    </span>
  );
}

export function DueDateInput({ value, onChange }: { value?: string | null; onChange: (v: string | null) => void }) {
  return (
    <label className={clsx(pill, "inline-flex items-center gap-1.5")}>
      <Calendar size={13} />
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-transparent text-fg outline-none [color-scheme:inherit]"
        aria-label="Due date"
      />
    </label>
  );
}

export function EstimateMenu({ value, onChange }: { value?: number | null; onChange: (v: number | null) => void }) {
  return (
    <Menu
      className={pill}
      trigger={<span className={value ? "text-fg" : ""}>{value ? `${value} point${value === 1 ? "" : "s"}` : "Set estimate"}</span>}
      placeholder="Estimate…"
      value={value ?? 0}
      options={[0, 1, 2, 3, 5, 8].map((v) => ({ value: v, label: v ? `${v} point${v === 1 ? "" : "s"}` : "No estimate" }))}
      onSelect={(v) => onChange(v || null)}
    />
  );
}

/** Convenience: the set of inline menus bound directly to an issue. */
export function IssueStatus({ item, showLabel }: { item: Item; showLabel?: boolean }) {
  return <StatusMenu value={item.stateId} showLabel={showLabel} onChange={(stateId) => updateIssue(item.id, { stateId })} />;
}
export function IssuePriority({ item, showLabel }: { item: Item; showLabel?: boolean }) {
  return <PriorityMenu value={item.priority} showLabel={showLabel} onChange={(priority) => updateIssue(item.id, { priority })} />;
}
export function IssueAssignee({ item, showLabel, size }: { item: Item; showLabel?: boolean; size?: number }) {
  return <AssigneeMenu value={item.assigneeId} showLabel={showLabel} size={size} onChange={(assigneeId) => updateIssue(item.id, { assigneeId })} />;
}
