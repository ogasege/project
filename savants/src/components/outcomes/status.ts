import type { OutcomeStatus, WorkstreamStatus } from "@/lib/types";

export const OUTCOME_STATUS: Record<OutcomeStatus, { label: string; color: string }> = {
  planning: { label: "Planning", color: "#95a2b3" },
  working: { label: "Working", color: "#f2c94c" },
  "needs-you": { label: "Needs you", color: "#f2994a" },
  review: { label: "Round done", color: "#4cb782" },
  achieved: { label: "Achieved", color: "#5e6ad2" },
  paused: { label: "Paused", color: "#95a2b3" },
};

export const WORKSTREAM_STATUS: Record<WorkstreamStatus, { label: string; color: string }> = {
  queued: { label: "Queued", color: "#95a2b3" },
  working: { label: "Working", color: "#f2c94c" },
  "needs-you": { label: "Needs you", color: "#f2994a" },
  done: { label: "Reported back", color: "#4cb782" },
  failed: { label: "Stopped", color: "#eb5757" },
};

export function deadlineNote(deadline?: string | null): string {
  if (!deadline) return "No deadline";
  const end = new Date(deadline + "T23:59:59");
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  const date = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: end.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
  if (days < 0) return `Was due ${date}`;
  if (days === 0) return `Due today`;
  return `By ${date} · ${days} day${days === 1 ? "" : "s"} left`;
}
