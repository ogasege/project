import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { uid } from "@/lib/id";
import { blocksToMarkdown } from "@/lib/markdown";
import { findByIdentifier, identifier, issues, pages, stateOf } from "@/lib/workspace";
import type { BoardNote, DB, Item, NoteKind, Priority, Proposal, ProposalAction } from "@/lib/types";
import { commit, getDB } from "@/server/db";
import { propose } from "@/server/actions";
import { LIVE_ACTIONS } from "@/server/integrations";
import { renderItem } from "./prompts";

// Tools the council can use. Every write goes through propose(), which applies the agent's autonomy
// level: either it executes immediately or it lands in the human approval queue.

export interface ToolContext {
  agentId: string;
  callId?: string;
  itemId?: string;
}

export type ToolEvent = { type: "note"; note: BoardNote } | { type: "proposal"; proposal: Proposal; summary: string };

export interface ToolResult {
  content: string;
  isError?: boolean;
  events: ToolEvent[];
  summary: string; // short, human-readable line for the UI
}

const NOTE_KINDS = ["claim", "assumption", "question", "risk", "decision", "action"] as const;
const PRIORITY_NAMES: Record<string, Priority> = { none: 0, urgent: 1, high: 2, medium: 3, low: 4 };

const schemas = {
  search_workspace: z.object({ query: z.string().min(1) }),
  read_item: z.object({ ref: z.string().min(1) }),
  pin_note: z.object({ kind: z.enum(NOTE_KINDS), text: z.string().min(1).max(400) }),
  create_issue: z.object({
    team: z.string().optional(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    priority: z.enum(["none", "urgent", "high", "medium", "low"]).optional(),
    assignee: z.string().optional(),
    project: z.string().optional(),
    rationale: z.string().optional(),
  }),
  update_issue: z.object({
    ref: z.string().min(1),
    status: z.string().optional(),
    priority: z.enum(["none", "urgent", "high", "medium", "low"]).optional(),
    assignee: z.string().optional(),
    title: z.string().optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    rationale: z.string().optional(),
  }),
  create_page: z.object({ title: z.string().min(1).max(200), markdown: z.string(), parent: z.string().optional(), rationale: z.string().optional() }),
  append_to_item: z.object({ ref: z.string().min(1), markdown: z.string().min(1), rationale: z.string().optional() }),
  comment: z.object({ ref: z.string().min(1), body: z.string().min(1) }),
  list_integrations: z.object({}),
  run_integration: z.object({ app: z.string(), action: z.string(), input: z.record(z.string(), z.unknown()).optional(), rationale: z.string().optional() }),
};

export type ToolName = keyof typeof schemas;

const P = { type: "string" as const };

const DEFS: Record<ToolName, { description: string; properties: Record<string, unknown>; required: string[] }> = {
  search_workspace: {
    description: "Search pages and issues in the workspace by keywords. Returns titles, identifiers and ids.",
    properties: { query: { ...P, description: "Keywords" } },
    required: ["query"],
  },
  read_item: {
    description: "Read a page or issue in full (body, properties, comments). `ref` is an issue identifier like ENG-3, an item id, or an exact title.",
    properties: { ref: P },
    required: ["ref"],
  },
  pin_note: {
    description: "Pin a short note to the call's shared reasoning board. Use it for the claims, assumptions, questions, risks, decisions and actions that matter.",
    properties: { kind: { type: "string", enum: NOTE_KINDS }, text: { ...P, description: "One sentence" } },
    required: ["kind", "text"],
  },
  create_issue: {
    description: "Propose a new issue. Requires human approval unless the agent's autonomy allows it.",
    properties: {
      team: { ...P, description: "Team key: one of the workspace team keys (e.g. ENG, GTM, OPS)" },
      title: P,
      description: { ...P, description: "Markdown description with acceptance criteria" },
      priority: { type: "string", enum: ["none", "urgent", "high", "medium", "low"] },
      assignee: { ...P, description: "Name of a person or agent" },
      project: { ...P, description: "Project name" },
      rationale: { ...P, description: "Why, in one sentence, for the approver" },
    },
    required: ["title"],
  },
  update_issue: {
    description: "Propose changes to an existing issue (status, priority, assignee, title, due date).",
    properties: {
      ref: { ...P, description: "Identifier like ENG-3 or id" },
      status: { ...P, description: "Backlog, Todo, In Progress, In Review, Done, Canceled" },
      priority: { type: "string", enum: ["none", "urgent", "high", "medium", "low"] },
      assignee: P,
      title: P,
      due_date: { ...P, description: "YYYY-MM-DD" },
      rationale: P,
    },
    required: ["ref"],
  },
  create_page: {
    description: "Propose a new page (document) written in markdown.",
    properties: { title: P, markdown: P, parent: { ...P, description: "Optional parent page title or id" }, rationale: P },
    required: ["title", "markdown"],
  },
  append_to_item: {
    description: "Propose appending markdown to an existing page or issue description.",
    properties: { ref: P, markdown: P, rationale: P },
    required: ["ref", "markdown"],
  },
  comment: {
    description: "Comment on a page or issue.",
    properties: { ref: P, body: P },
    required: ["ref", "body"],
  },
  list_integrations: {
    description: "List connected integrations and the actions available on them.",
    properties: {},
    required: [],
  },
  run_integration: {
    description: "Propose running an action on a connected integration (e.g. github.list_issues, slack.post_message).",
    properties: { app: P, action: P, input: { type: "object", additionalProperties: true }, rationale: P },
    required: ["app", "action"],
  },
};

export function toolDefinitions(allowed: string[], mode: "call" | "work"): Anthropic.Beta.BetaTool[] {
  const names = (Object.keys(DEFS) as ToolName[]).filter((n) => {
    if (n === "pin_note") return mode === "call";
    if (n === "run_integration") return allowed.includes("run_integration") || allowed.includes("list_integrations");
    return allowed.includes(n);
  });
  return names.map((name) => ({
    name,
    description: DEFS[name].description,
    input_schema: { type: "object", properties: DEFS[name].properties, required: DEFS[name].required },
    eager_input_streaming: true,
  }));
}

// ---------- resolution helpers ----------

export function resolveItem(db: DB, ref: string): Item | undefined {
  const r = ref.trim();
  return (
    db.items[r] ??
    findByIdentifier(db, r) ??
    Object.values(db.items).find((i) => !i.archived && i.title.toLowerCase() === r.toLowerCase()) ??
    Object.values(db.items).find((i) => !i.archived && r.length > 3 && i.title.toLowerCase().includes(r.toLowerCase()))
  );
}

function resolveMember(db: DB, name?: string): string | null | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  if (["none", "nobody", "unassigned"].includes(n)) return null;
  const m = Object.values(db.members).find((x) => x.name.toLowerCase() === n || x.handle === n || x.name.toLowerCase().split(" ")[0] === n);
  return m?.id;
}

function resolveTeam(db: DB, key?: string): string {
  const teams = Object.values(db.teams);
  const t = key ? teams.find((x) => x.key.toLowerCase() === key.toLowerCase() || x.name.toLowerCase() === key.toLowerCase()) : undefined;
  return (t ?? teams[0]).id;
}

function resolveProject(db: DB, name?: string): string | null | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  const p = Object.values(db.projects).find((x) => x.name.toLowerCase() === n) ?? Object.values(db.projects).find((x) => x.name.toLowerCase().includes(n));
  return p?.id;
}

function resolveState(db: DB, name?: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return db.settings.states.find((s) => s.name.toLowerCase().replace(/[^a-z]/g, "") === n || s.type === n)?.id;
}

export function searchWorkspace(db: DB, query: string, limit = 8): Item[] {
  const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 1);
  const scored = [...issues(db), ...pages(db)]
    .map((it) => {
      const title = it.title.toLowerCase();
      const body = blocksToMarkdown(it.blocks).toLowerCase();
      const ident = identifier(db, it).toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (ident === t) score += 10;
        if (title.includes(t)) score += 3;
        if (body.includes(t)) score += 1;
      }
      return { it, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.it);
}

function describeItem(db: DB, it: Item): string {
  if (it.kind === "issue") return `${identifier(db, it)} ${it.title} [${stateOf(db, it)?.name ?? ""}] (id ${it.id})`;
  return `Page: ${it.title || "Untitled"} (id ${it.id})`;
}

async function proposeAndReport(ctx: ToolContext, action: ProposalAction, rationale: string | undefined, label: string): Promise<ToolResult> {
  const proposal = await propose(ctx.agentId, action, rationale ?? "", { callId: ctx.callId, itemId: ctx.itemId });
  const db = getDB();
  let content: string;
  if (proposal.status === "auto") {
    const res = proposal.resultItemId ? db.items[proposal.resultItemId] : undefined;
    content = `Done: ${label}${res ? ` → ${res.kind === "issue" ? identifier(db, res) : res.title}` : ""}.`;
  } else {
    content = `Proposed (${label}) — it is waiting for the human's approval.`;
  }
  return { content, events: [{ type: "proposal", proposal, summary: label }], summary: content };
}

// ---------- executor ----------

export async function executeTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (!(name in schemas)) return { content: `Unknown tool ${name}`, isError: true, events: [], summary: `unknown tool ${name}` };
  const schema = schemas[name as ToolName];
  const parsed = schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { content: `Invalid input for ${name}: ${parsed.error.message}`, isError: true, events: [], summary: `invalid ${name} input` };
  }
  const db = getDB();
  try {
    switch (name as ToolName) {
      case "search_workspace": {
        const { query } = parsed.data as z.infer<typeof schemas.search_workspace>;
        const hits = searchWorkspace(db, query);
        return { content: hits.length ? hits.map((h) => describeItem(db, h)).join("\n") : "No matches.", events: [], summary: `searched “${query}” (${hits.length})` };
      }
      case "read_item": {
        const { ref } = parsed.data as z.infer<typeof schemas.read_item>;
        const it = resolveItem(db, ref);
        if (!it) return { content: `Nothing found for "${ref}".`, isError: true, events: [], summary: `couldn't find ${ref}` };
        return { content: renderItem(db, it, 6000), events: [], summary: `read ${it.kind === "issue" ? identifier(db, it) : it.title}` };
      }
      case "pin_note": {
        const { kind, text } = parsed.data as z.infer<typeof schemas.pin_note>;
        if (!ctx.callId) return { content: "There is no call board here.", isError: true, events: [], summary: "no board" };
        const note = pinNote(ctx.callId, ctx.agentId, kind, text);
        return { content: "Pinned.", events: note ? [{ type: "note", note }] : [], summary: `pinned ${/^[aeiou]/.test(kind) ? "an" : "a"} ${kind}` };
      }
      case "create_issue": {
        const i = parsed.data as z.infer<typeof schemas.create_issue>;
        const action: ProposalAction = {
          type: "create_issue",
          teamId: resolveTeam(db, i.team),
          title: i.title,
          description: i.description,
          priority: i.priority ? PRIORITY_NAMES[i.priority] : undefined,
          assigneeId: resolveMember(db, i.assignee) ?? null,
          projectId: resolveProject(db, i.project) ?? null,
        };
        return proposeAndReport(ctx, action, i.rationale, `create issue “${i.title}”`);
      }
      case "update_issue": {
        const i = parsed.data as z.infer<typeof schemas.update_issue>;
        const it = resolveItem(db, i.ref);
        if (!it || it.kind !== "issue") return { content: `No issue "${i.ref}".`, isError: true, events: [], summary: `no issue ${i.ref}` };
        const patch: Extract<ProposalAction, { type: "update_issue" }>["patch"] = {};
        const st = resolveState(db, i.status);
        if (st) patch.stateId = st;
        if (i.priority) patch.priority = PRIORITY_NAMES[i.priority];
        const who = resolveMember(db, i.assignee);
        if (who !== undefined) patch.assigneeId = who;
        if (i.title) patch.title = i.title;
        if (i.due_date) patch.dueDate = i.due_date;
        if (!Object.keys(patch).length) return { content: "Nothing to change (check status/assignee names).", isError: true, events: [], summary: "no-op update" };
        return proposeAndReport(ctx, { type: "update_issue", itemId: it.id, patch }, i.rationale, `update ${identifier(db, it)}`);
      }
      case "create_page": {
        const i = parsed.data as z.infer<typeof schemas.create_page>;
        const parent = i.parent ? resolveItem(db, i.parent) : undefined;
        return proposeAndReport(ctx, { type: "create_page", title: i.title, markdown: i.markdown, parentId: parent?.kind === "page" ? parent.id : null }, i.rationale, `write page “${i.title}”`);
      }
      case "append_to_item": {
        const i = parsed.data as z.infer<typeof schemas.append_to_item>;
        const it = resolveItem(db, i.ref);
        if (!it) return { content: `Nothing found for "${i.ref}".`, isError: true, events: [], summary: `couldn't find ${i.ref}` };
        return proposeAndReport(ctx, { type: "append_to_item", itemId: it.id, markdown: i.markdown }, i.rationale, `add to “${it.title}”`);
      }
      case "comment": {
        const i = parsed.data as z.infer<typeof schemas.comment>;
        const it = resolveItem(db, i.ref);
        if (!it) return { content: `Nothing found for "${i.ref}".`, isError: true, events: [], summary: `couldn't find ${i.ref}` };
        return proposeAndReport(ctx, { type: "comment", itemId: it.id, body: i.body }, undefined, `comment on “${it.title}”`);
      }
      case "list_integrations": {
        const conns = Object.values(db.integrations);
        if (!conns.length) return { content: "No integrations are connected.", events: [], summary: "listed integrations" };
        const lines = conns.map((c) => {
          const acts = LIVE_ACTIONS.filter((a) => a.appId === c.appId).map((a) => `${a.action}(${Object.keys(a.input).join(", ")})`);
          return `- ${c.appId} [${c.mode}]${acts.length ? `: ${acts.join("; ")}` : ""}`;
        });
        return { content: lines.join("\n"), events: [], summary: `listed ${conns.length} integrations` };
      }
      case "run_integration": {
        const i = parsed.data as z.infer<typeof schemas.run_integration>;
        return proposeAndReport(ctx, { type: "integration_action", appId: i.app, action: i.action, input: i.input ?? {} }, i.rationale, `${i.app}.${i.action}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    return { content: message, isError: true, events: [], summary: `${name} failed` };
  }
  return { content: "Unhandled", isError: true, events: [], summary: name };
}

export function pinNote(callId: string, authorId: string, kind: NoteKind, text: string): BoardNote | null {
  const call = getDB().calls[callId];
  if (!call) return null;
  const note: BoardNote = { id: uid("nt"), kind, text, authorId, createdAt: Date.now() };
  commit([{ type: "update", coll: "calls", id: callId, patch: { notes: [...call.notes, note] } }], authorId);
  return note;
}
