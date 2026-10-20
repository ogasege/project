"use client";

import type { ProjectStatus } from "@/lib/types";

const STATUS: Record<ProjectStatus, { label: string; color: string }> = {
  planned: { label: "Planned", color: "#8a8f98" },
  started: { label: "In progress", color: "#f2c94c" },
  paused: { label: "Paused", color: "#f2994a" },
  completed: { label: "Completed", color: "#4cb782" },
  canceled: { label: "Canceled", color: "#6b6f76" },
};

export const PROJECT_STATUSES = Object.entries(STATUS).map(([value, s]) => ({ value: value as ProjectStatus, ...s }));

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className="h-2 w-2 rounded" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function ProgressRing({ pct, color = "var(--success)", size = 16 }: { pct: number; color?: string; size?: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={`${pct}% complete`}>
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="2" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
}
