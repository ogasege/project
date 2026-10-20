import { identifier, PRIORITIES } from "@/lib/workspace";
import type { DB, ProposalAction } from "@/lib/types";

// Client-side mirror of the server's describeAction, with friendlier property names.

export function describeProposal(db: DB, a: ProposalAction): string {
  switch (a.type) {
    case "create_issue":
      return `Create issue in ${db.teams[a.teamId]?.key ?? "team"}`;
    case "update_issue": {
      const it = db.items[a.itemId];
      return `Update ${it ? identifier(db, it) || it.title : "issue"}`;
    }
    case "create_page":
      return "Write a new page";
    case "append_to_item":
      return `Add to “${db.items[a.itemId]?.title ?? "item"}”`;
    case "comment":
      return `Comment on “${db.items[a.itemId]?.title ?? "item"}”`;
    case "integration_action":
      return `Run ${a.appId} · ${a.action}`;
  }
}

export function patchLines(db: DB, a: Extract<ProposalAction, { type: "update_issue" }>): string[] {
  const out: string[] = [];
  const p = a.patch;
  if (p.stateId) out.push(`Status → ${db.settings.states.find((s) => s.id === p.stateId)?.name ?? p.stateId}`);
  if (p.priority !== undefined) out.push(`Priority → ${PRIORITIES.find((x) => x.value === p.priority)?.label}`);
  if (p.assigneeId !== undefined) out.push(`Assignee → ${p.assigneeId ? db.members[p.assigneeId]?.name ?? p.assigneeId : "Unassigned"}`);
  if (p.title) out.push(`Title → ${p.title}`);
  if (p.dueDate) out.push(`Due → ${p.dueDate}`);
  if (p.projectId !== undefined) out.push(`Project → ${p.projectId ? db.projects[p.projectId]?.name : "None"}`);
  return out;
}
