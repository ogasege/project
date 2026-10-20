import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { uid } from "@/lib/id";
import type { PresenceLook } from "@/lib/presence";
import { REP_TEMPLATES, type TeamPick } from "@/lib/reps";
import type { DB, Member, Op, Outcome, Project, Workstream } from "@/lib/types";
import { activityOp, executeAction, newIssueOps } from "./actions";
import { anthropic, DEFAULT_MODEL, isLive } from "./ai/client";
import { runAgent } from "./ai/run";
import { commit, getDB } from "./db";

// Outcomes: the user says what should be true by when; the system picks who owns which part,
// opens an issue per workstream, and has each savant work its part in the background.
// Every write the savants make still goes through the approval gate.

const MAX_PARALLEL = 3;
const running = new Set<string>();

type RoleKey = "lead" | "skeptic" | "operator" | "researcher" | "sales" | "growth" | "finance" | "success" | "product" | "talent" | "generic";

function roleKey(m: Member): RoleKey {
  const r = `${m.agent?.role ?? ""}`.toLowerCase();
  if (m.agent?.lead || /lead|strateg/.test(r)) return "lead";
  if (/skeptic|red-team|critic/.test(r)) return "skeptic";
  if (/operator|execut/.test(r)) return "operator";
  if (/research/.test(r)) return "researcher";
  if (/sales/.test(r)) return "sales";
  if (/growth|marketer/.test(r)) return "growth";
  if (/finance/.test(r)) return "finance";
  if (/success/.test(r)) return "success";
  if (/product|design/.test(r)) return "product";
  if (/recruit/.test(r)) return "talent";
  return "generic";
}

function short(goal: string): string {
  const g = goal.trim().replace(/[.!]+$/, "");
  return g.length > 70 ? g.slice(0, 67) + "…" : g;
}

// ---------- spinning up the team ----------

function repMember(key: string, look: PresenceLook): Member | null {
  const t = REP_TEMPLATES.find((r) => r.key === key);
  if (!t) return null;
  return {
    id: uid("a"),
    kind: "agent",
    name: t.name,
    handle: t.name.toLowerCase(),
    color: t.color,
    avatar: t.avatar,
    createdAt: Date.now(),
    agent: {
      role: t.role,
      persona: t.persona,
      model: DEFAULT_MODEL,
      voice: t.voice,
      autonomy: "ask",
      presence: look,
      tools: ["search_workspace", "read_item", "list_integrations", "create_issue", "create_page", "append_to_item", "comment"],
      stats: { proposed: 0, approved: 0, rejected: 0 },
    },
  };
}

// ---------- planning ----------

interface PlanDraft {
  strategy: string;
  measure: string;
  workstreams: { agentId: string; title: string; why: string }[];
}

const PlanSchema = z.object({
  strategy: z.string().describe("Two to four sentences: the bets we make to reach the outcome by the deadline, and what we deliberately won't do."),
  measure: z.string().describe("One line: the number we track weekly and its target."),
  workstreams: z
    .array(
      z.object({
        owner: z.string().describe("Exact name of the savant who owns it."),
        title: z.string().describe("Imperative, under 80 characters."),
        why: z.string().describe("One sentence on how it moves the outcome."),
      }),
    )
    .describe("One or two per savant; every savant on the team owns at least one."),
});

function simulatedPlan(goal: string, deadline: string | null | undefined, guardrails: string | undefined, team: Member[]): PlanDraft {
  const g = short(goal);
  const by = deadline ? ` by ${new Date(deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : "";
  const W: Record<RoleKey, [string, string]> = {
    lead: [`Set the strategy for “${g}”`, `Pick the two bets most likely to get there${by}, and say what we stop doing.`],
    skeptic: ["Red-team the plan: the three assumptions most likely to be wrong", "Catch the wrong bet early, before we spend the quarter on it."],
    operator: ["Turn the plan into weekly issues with owners and dates", "A plan only moves the number when someone does it this week."],
    researcher: ["Find the evidence: who buys, why, and what they pay", "Ground the bets in what customers and the workspace actually say."],
    sales: ["Build a pipeline of 30 named accounts and start outreach", "Revenue comes from conversations; this creates them."],
    growth: ["Run three cheap channel tests and keep the winner", "Find the channel that moves the number before scaling spend."],
    finance: ["Set the baseline and a weekly scorecard", "We need to know where we stand today and whether each week moved it."],
    success: ["Protect and expand the customers we already have", "The cheapest growth is the customer we don't lose."],
    product: ["Ship the smallest product change that moves the outcome", "Make the outcome easier for users to reach on their own."],
    talent: ["Define and open the roles this outcome needs", "The plan stalls if nobody is there to run it."],
    generic: [`Own the ${"part"} of “${g}” that fits your role`, "Every specialist on the team carries a piece."],
  };
  const workstreams = team.map((m) => {
    const [title, why] = W[roleKey(m)];
    return { agentId: m.id, title: roleKey(m) === "generic" ? `${m.agent?.role ?? m.name}: plan for “${g}”` : title, why };
  });
  const lead = team.find((m) => roleKey(m) === "lead") ?? team[0];
  const strategy = `${lead.name} leads. To reach “${g}”${/\bby\b/i.test(g) ? "" : by}, the team works ${workstreams.length} streams in parallel and meets on a call when a decision is needed.${guardrails ? ` Guardrails: ${guardrails.trim()}` : ""}`;
  return { strategy, measure: `Weekly progress against: ${g}`, workstreams };
}

async function modelPlan(goal: string, deadline: string | null | undefined, guardrails: string | undefined, team: Member[], db: DB): Promise<PlanDraft | null> {
  if (!isLive()) return null;
  const roster = team.map((m) => `- ${m.name}, ${m.agent?.role}: ${m.agent?.persona.split(".").slice(0, 2).join(".")}.`).join("\n");
  const projects = Object.values(db.projects)
    .map((p) => `- ${p.name}: ${p.description}`)
    .join("\n");
  try {
    const res = await anthropic().beta.messages.parse({
      model: DEFAULT_MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(PlanSchema) },
      system: `You are the planning step for "${db.settings.workspaceName}", a workspace where a human and a team of AI agents called savants own outcomes together. Turn the outcome into a plan the team can start on today. Give every savant on the team work that fits their role. Keep titles concrete and checkable.`,
      messages: [
        {
          role: "user",
          content: `Outcome: ${goal}\nDeadline: ${deadline || "none given"}\nGuardrails: ${guardrails || "none given"}\n\nThe team:\n${roster}\n\nWhat the workspace already has:\n${projects || "- nothing yet"}`,
        },
      ],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return null;
    const byName = new Map(team.map((m) => [m.name.toLowerCase(), m.id]));
    const workstreams = res.parsed_output.workstreams
      .map((w) => ({ agentId: byName.get(w.owner.trim().toLowerCase()) ?? "", title: w.title.slice(0, 120), why: w.why }))
      .filter((w) => w.agentId);
    if (!workstreams.length) return null;
    return { strategy: res.parsed_output.strategy, measure: res.parsed_output.measure, workstreams };
  } catch (err) {
    // A key or account problem shouldn't block the user from starting: plan without the model.
    if (err instanceof Anthropic.APIError) console.error(`[savants] outcome planning fell back to the simulator: ${err.status} ${err.message}`);
    else console.error("[savants] outcome planning failed", err);
    return null;
  }
}

// ---------- create ----------

export interface CreateOutcomeInput {
  title: string;
  deadline?: string | null;
  guardrails?: string;
  view?: string;
  team: TeamPick[];
}

export async function createOutcome(input: CreateOutcomeInput, actorId: string): Promise<Outcome> {
  let db = getDB();

  // 1. Spin up new reps and apply the looks the user picked.
  const memberOps: Op[] = [];
  const repIds: string[] = [];
  for (const pick of input.team) {
    if (pick.agentId) {
      const m = db.members[pick.agentId];
      if (!m?.agent || repIds.includes(m.id)) continue;
      repIds.push(m.id);
      if (m.agent.presence !== pick.look) memberOps.push({ type: "update", coll: "members", id: m.id, patch: { agent: { ...m.agent, presence: pick.look } } });
    } else if (pick.template) {
      const m = repMember(pick.template, pick.look);
      if (!m) continue;
      repIds.push(m.id);
      memberOps.push({ type: "insert", coll: "members", doc: m as unknown as Member & Record<string, unknown> });
      memberOps.push(activityOp(m.id, `joined to work on “${short(input.title)}”`));
    }
  }
  if (!repIds.length) throw new Error("Pick at least one savant");
  if (memberOps.length) commit(memberOps, actorId);
  db = getDB();
  const team = repIds.map((id) => db.members[id]);
  const lead = team.find((m) => roleKey(m) === "lead") ?? team[0];

  // 2. Plan: the model when it's reachable, otherwise a role-based plan.
  const fromModel = await modelPlan(input.title, input.deadline, input.guardrails, team, db);
  const plan = fromModel ?? simulatedPlan(input.title, input.deadline, input.guardrails, team);
  db = getDB();

  // 3. A project for the outcome and an issue per workstream, owned by its savant.
  const now = Date.now();
  const teamId = (Object.values(db.teams).find((t) => t.key === "GTM") ?? Object.values(db.teams)[0]).id;
  const project: Project = {
    id: uid("p"),
    name: short(input.title),
    icon: "◎",
    color: lead.color,
    description: plan.strategy,
    status: "started",
    leadId: lead.id,
    teamIds: [teamId],
    targetDate: input.deadline || null,
    createdAt: now,
  };
  const ops: Op[] = [{ type: "insert", coll: "projects", doc: project as unknown as Project & Record<string, unknown> }];
  const workstreams: Workstream[] = [];
  let scratch = db;
  for (const w of plan.workstreams) {
    const description = [
      `**Outcome:** ${input.title}${input.deadline ? ` (by ${input.deadline})` : ""}`,
      `**Why this matters:** ${w.why}`,
      input.guardrails ? `**Guardrails:** ${input.guardrails}` : "",
      `**Measure:** ${plan.measure}`,
      "",
      `Strategy: ${plan.strategy}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const { ops: issueOps, item } = newIssueOps(scratch, actorId, { type: "create_issue", teamId, title: w.title, description, priority: 2, assigneeId: w.agentId, projectId: project.id });
    // newIssueOps reads the team's next number; bump it locally so each issue gets its own.
    const t = scratch.teams[teamId];
    scratch = { ...scratch, teams: { ...scratch.teams, [teamId]: { ...t, nextNumber: t.nextNumber + 1 } } };
    ops.push(...issueOps);
    workstreams.push({ id: uid("ws"), agentId: w.agentId, title: w.title, why: w.why, itemId: item.id, status: "queued", log: [], round: 0 });
  }
  const outcome: Outcome = {
    id: uid("oc"),
    title: input.title.trim(),
    deadline: input.deadline || null,
    guardrails: input.guardrails?.trim() || undefined,
    measure: plan.measure,
    status: "working",
    repIds,
    leadId: lead.id,
    strategy: plan.strategy,
    plannedBy: fromModel ? "model" : "simulator",
    view: input.view,
    projectId: project.id,
    workstreams,
    rounds: 0,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
  ops.push({ type: "insert", coll: "outcomes", doc: outcome as unknown as Outcome & Record<string, unknown> });
  ops.push(activityOp(lead.id, `took on the outcome “${short(input.title)}” with ${team.length - 1} other savant${team.length === 2 ? "" : "s"}`));
  commit(ops, actorId);

  void runRound(outcome.id);
  return outcome;
}

// ---------- working ----------

function patchWorkstream(outcomeId: string, wsId: string, patch: Partial<Workstream>, logLine?: string) {
  const oc = getDB().outcomes[outcomeId];
  if (!oc) return;
  const workstreams = oc.workstreams.map((w) =>
    w.id === wsId ? { ...w, ...patch, log: logLine ? [...w.log, { at: Date.now(), text: logLine }].slice(-30) : w.log } : w,
  );
  commit([{ type: "update", coll: "outcomes", id: outcomeId, patch: { workstreams, updatedAt: Date.now() } }], oc.leadId);
}

function lastSentence(text: string): string {
  // Skip italic-only footnotes (the simulator's note) and strip markdown, keeping snake_case words intact.
  const body = text
    .split("\n")
    .filter((l) => !/^\s*_[^_].*_\s*$/.test(l))
    .join(" ");
  const clean = body.replace(/[*#>`]/g, "").replace(/(^|\s)_|_(?=\s|$|[.,;:!?])/g, "$1").replace(/\s+/g, " ").trim();
  const parts = clean.split(/(?<=[.!?])\s/).filter((p) => p.length > 3);
  const s = parts[parts.length - 1] ?? clean;
  return s.length > 160 ? "…" + s.slice(-157) : s;
}

async function work(outcomeId: string, ws: Workstream) {
  const db = getDB();
  const agent = db.members[ws.agentId];
  if (!agent || !ws.itemId || !db.items[ws.itemId]) return patchWorkstream(outcomeId, ws.id, { status: "failed", phase: undefined }, "The issue for this workstream is gone.");
  const started = db.settings.states.find((s) => s.type === "started");
  if (started && db.items[ws.itemId].stateId !== started.id) commit([{ type: "update", coll: "items", id: ws.itemId, patch: { stateId: started.id, updatedAt: Date.now() } }], agent.id);

  const lead = db.members[db.outcomes[outcomeId].leadId];
  patchWorkstream(outcomeId, ws.id, { status: "working", phase: "thinking", activity: lead && lead.id !== agent.id ? `Picked this up from ${lead.name}` : "Reading the workspace" }, lead && lead.id !== agent.id ? `${lead.name} handed this to ${agent.name}` : "Started");

  let text = "";
  let lastFlush = 0;
  let proposals = 0;
  try {
    for await (const ev of runAgent({ agentId: agent.id, mode: "work", itemId: ws.itemId })) {
      if (ev.type === "text") {
        text += ev.delta;
        if (Date.now() - lastFlush > 700) {
          lastFlush = Date.now();
          patchWorkstream(outcomeId, ws.id, { phase: "writing", activity: lastSentence(text) });
        }
      } else if (ev.type === "tool") {
        patchWorkstream(outcomeId, ws.id, { phase: "thinking", activity: ev.summary }, ev.summary);
      } else if (ev.type === "proposal") {
        proposals++;
        patchWorkstream(outcomeId, ws.id, {}, `Asked for approval: ${ev.summary}`);
      } else if (ev.type === "error") {
        patchWorkstream(outcomeId, ws.id, {}, ev.message);
      }
    }
    const body = text.trim() || `${agent.name} looked into it but had nothing to add yet.`;
    const res = await executeAction(agent.id, { type: "comment", itemId: ws.itemId, body });
    commit(res.ops, agent.id);
    const pending = Object.values(getDB().proposals).some((p) => p.agentId === agent.id && p.itemId === ws.itemId && p.status === "pending");
    patchWorkstream(
      outcomeId,
      ws.id,
      { status: pending ? "needs-you" : "done", phase: undefined, activity: lastSentence(body) },
      pending ? `Waiting on you for ${proposals || "a"} decision${proposals === 1 ? "" : "s"}` : `Reported back to ${lead?.name ?? "the lead"}`,
    );
  } catch (err) {
    console.error("[savants] workstream failed", err);
    patchWorkstream(outcomeId, ws.id, { status: "failed", phase: undefined, activity: "Stopped with an error" }, err instanceof Error ? err.message : "Failed");
  }
}

/** One round: the lead goes first (it sets direction), then the specialists in parallel. */
export async function runRound(outcomeId: string): Promise<boolean> {
  if (running.has(outcomeId)) return false;
  const oc = getDB().outcomes[outcomeId];
  if (!oc) return false;
  running.add(outcomeId);
  try {
    const round = oc.rounds + 1;
    const workstreams = oc.workstreams.map((w) => ({ ...w, status: "queued" as const, phase: undefined, round, activity: "Waiting for the lead" }));
    commit([{ type: "update", coll: "outcomes", id: outcomeId, patch: { status: "working", rounds: round, workstreams, updatedAt: Date.now() } }], oc.leadId);

    const leadFirst = workstreams.filter((w) => w.agentId === oc.leadId);
    for (const w of leadFirst) await work(outcomeId, w);
    const rest = workstreams.filter((w) => w.agentId !== oc.leadId);
    const queue = [...rest];
    await Promise.all(
      Array.from({ length: Math.min(MAX_PARALLEL, queue.length) }, async () => {
        for (let w = queue.shift(); w; w = queue.shift()) await work(outcomeId, w);
      }),
    );
    const after = getDB().outcomes[outcomeId];
    const needsYou = after.workstreams.some((w) => w.status === "needs-you");
    commit([{ type: "update", coll: "outcomes", id: outcomeId, patch: { status: needsYou ? "needs-you" : "review", updatedAt: Date.now() } }], oc.leadId);
    return true;
  } finally {
    running.delete(outcomeId);
  }
}

export function isRunning(outcomeId: string): boolean {
  return running.has(outcomeId);
}
