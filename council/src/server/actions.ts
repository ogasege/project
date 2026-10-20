import { uid } from "@/lib/id";
import { markdownToBlocks } from "@/lib/markdown";
import type { Activity, Comment, DB, Item, Op, Proposal, ProposalAction } from "@/lib/types";
import { commit, getDB } from "./db";
import { runIntegrationAction } from "./integrations";

// Turns a ProposalAction into ops. Shared by the approval flow, autonomous agents and the MCP server.

export function activityOp(actorId: string, verb: string, itemId?: string, detail?: string): Op {
  const a: Activity = { id: uid("act"), actorId, verb, itemId, detail, createdAt: Date.now() };
  return { type: "insert", coll: "activity", doc: a as unknown as Activity & Record<string, unknown> };
}

export function newIssueOps(db: DB, actorId: string, a: Extract<ProposalAction, { type: "create_issue" }>): { ops: Op[]; item: Item } {
  const team = db.teams[a.teamId] ?? Object.values(db.teams)[0];
  const now = Date.now();
  const item: Item = {
    id: uid("is"),
    kind: "issue",
    title: a.title,
    teamId: team.id,
    number: team.nextNumber,
    stateId: "st_todo",
    priority: a.priority ?? 0,
    assigneeId: a.assigneeId ?? null,
    labelIds: a.labelIds ?? [],
    projectId: a.projectId ?? null,
    cycleId: null,
    blocks: markdownToBlocks(a.description ?? ""),
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
    sortOrder: now,
  };
  return {
    item,
    ops: [
      { type: "update", coll: "teams", id: team.id, patch: { nextNumber: team.nextNumber + 1 } },
      { type: "insert", coll: "items", doc: item as unknown as Item & Record<string, unknown> },
      activityOp(actorId, "created", item.id),
    ],
  };
}

export async function executeAction(actorId: string, action: ProposalAction): Promise<{ ops: Op[]; resultItemId?: string; output?: string }> {
  const db = getDB();
  const now = Date.now();
  switch (action.type) {
    case "create_issue": {
      const { ops, item } = newIssueOps(db, actorId, action);
      return { ops, resultItemId: item.id };
    }
    case "update_issue": {
      const it = db.items[action.itemId];
      if (!it) throw new Error(`No item ${action.itemId}`);
      const fields = Object.keys(action.patch).join(", ");
      return {
        ops: [
          { type: "update", coll: "items", id: it.id, patch: { ...action.patch, updatedAt: now } },
          activityOp(actorId, `updated ${fields}`, it.id),
        ],
        resultItemId: it.id,
      };
    }
    case "create_page": {
      const item: Item = {
        id: uid("pg"),
        kind: "page",
        title: action.title,
        icon: action.icon ?? "📄",
        parentId: action.parentId ?? null,
        blocks: markdownToBlocks(action.markdown),
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
        sortOrder: now,
      };
      return {
        ops: [{ type: "insert", coll: "items", doc: item as unknown as Item & Record<string, unknown> }, activityOp(actorId, "created page", item.id)],
        resultItemId: item.id,
      };
    }
    case "append_to_item": {
      const it = db.items[action.itemId];
      if (!it) throw new Error(`No item ${action.itemId}`);
      return {
        ops: [
          { type: "update", coll: "items", id: it.id, patch: { blocks: [...it.blocks, ...markdownToBlocks(action.markdown)], updatedAt: now } },
          activityOp(actorId, "edited", it.id),
        ],
        resultItemId: it.id,
      };
    }
    case "comment": {
      const c: Comment = { id: uid("cm"), itemId: action.itemId, authorId: actorId, body: action.body, createdAt: now };
      return {
        ops: [{ type: "insert", coll: "comments", doc: c as unknown as Comment & Record<string, unknown> }, activityOp(actorId, "commented on", action.itemId)],
        resultItemId: action.itemId,
      };
    }
    case "integration_action": {
      const output = await runIntegrationAction(action.appId, action.action, action.input);
      return { ops: [activityOp(actorId, `ran ${action.appId}.${action.action}`, undefined, output.slice(0, 200))], output };
    }
  }
}

export function isLowRisk(action: ProposalAction): boolean {
  return action.type === "comment" || action.type === "create_page" || action.type === "append_to_item";
}

/** Record a proposal. Executes immediately when the agent's autonomy allows it. */
export async function propose(agentId: string, action: ProposalAction, rationale: string, ctx: { callId?: string; itemId?: string } = {}): Promise<Proposal> {
  const db = getDB();
  const agent = db.members[agentId];
  const autonomy = agent?.agent?.autonomy ?? "ask";
  const auto = autonomy === "autonomous" || (autonomy === "low-risk" && isLowRisk(action));
  const proposal: Proposal = {
    id: uid("pr"),
    agentId,
    callId: ctx.callId,
    itemId: ctx.itemId,
    action,
    rationale,
    status: auto ? "auto" : "pending",
    createdAt: Date.now(),
  };
  const stats = agent?.agent ? { ...agent.agent.stats, proposed: agent.agent.stats.proposed + 1 } : undefined;
  const ops: Op[] = [{ type: "insert", coll: "proposals", doc: proposal as unknown as Proposal & Record<string, unknown> }];
  if (agent?.agent && stats) ops.push({ type: "update", coll: "members", id: agentId, patch: { agent: { ...agent.agent, stats } } });
  if (auto) {
    const res = await executeAction(agentId, action);
    proposal.resultItemId = res.resultItemId;
    proposal.decidedAt = Date.now();
    ops[0] = { type: "insert", coll: "proposals", doc: proposal as unknown as Proposal & Record<string, unknown> };
    ops.push(...res.ops);
  } else {
    ops.push(activityOp(agentId, "proposed", ctx.itemId, describeAction(db, action)));
  }
  commit(ops, agentId);
  return proposal;
}

export async function decide(proposalId: string, approve: boolean, deciderId: string, edited?: ProposalAction): Promise<Proposal> {
  const db = getDB();
  const p = db.proposals[proposalId];
  if (!p) throw new Error("Unknown proposal");
  if (p.status !== "pending") return p;
  const agent = db.members[p.agentId];
  const ops: Op[] = [];
  const action = edited ?? p.action;
  const patch: Partial<Proposal> = { status: approve ? "approved" : "rejected", decidedAt: Date.now(), decidedBy: deciderId, action };
  if (approve) {
    const res = await executeAction(p.agentId, action);
    patch.resultItemId = res.resultItemId;
    ops.push(...res.ops);
  }
  if (agent?.agent) {
    const s = agent.agent.stats;
    ops.push({
      type: "update",
      coll: "members",
      id: agent.id,
      patch: { agent: { ...agent.agent, stats: { ...s, approved: s.approved + (approve ? 1 : 0), rejected: s.rejected + (approve ? 0 : 1) } } },
    });
  }
  ops.push({ type: "update", coll: "proposals", id: p.id, patch: patch as Record<string, unknown> });
  ops.push(activityOp(deciderId, approve ? "approved" : "rejected", patch.resultItemId ?? p.itemId, `${agent?.name ?? "Agent"}: ${describeAction(db, action)}`));
  commit(ops, deciderId);
  return { ...p, ...patch };
}

export function describeAction(db: DB, a: ProposalAction): string {
  switch (a.type) {
    case "create_issue": return `Create issue “${a.title}” in ${db.teams[a.teamId]?.key ?? "team"}`;
    case "update_issue": {
      const it = db.items[a.itemId];
      return `Update ${it ? it.title : a.itemId}: ${Object.entries(a.patch).map(([k, v]) => `${k} → ${String(v)}`).join(", ")}`;
    }
    case "create_page": return `Create page “${a.title}”`;
    case "append_to_item": return `Append to “${db.items[a.itemId]?.title ?? a.itemId}”`;
    case "comment": return `Comment on “${db.items[a.itemId]?.title ?? a.itemId}”`;
    case "integration_action": return `${a.appId}: ${a.action}`;
  }
}
