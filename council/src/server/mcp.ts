import { z } from "zod";
import { blocksToMarkdown } from "@/lib/markdown";
import type { DB, Item, Member, Priority, ProposalAction } from "@/lib/types";
import { findByIdentifier, identifier, issues, stateOf } from "@/lib/workspace";
import { commit, getDB } from "./db";
import { describeAction, propose } from "./actions";

// Council as an MCP server (Streamable HTTP transport, JSON responses).
// Reads are answered directly; writes become proposals from the "External agent (MCP)"
// member so they pass the same human gate as the council's own agents.

export const MCP_AGENT_ID = "a_mcp";
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26"];

type JsonRpcId = string | number | null;
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}
type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string } };

interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

function ensureMcpAgent(): Member {
  const db = getDB();
  const existing = db.members[MCP_AGENT_ID];
  if (existing) return existing;
  const m: Member = {
    id: MCP_AGENT_ID,
    kind: "agent",
    name: "External agent (MCP)",
    handle: "mcp",
    color: "#64748b",
    avatar: "⌁",
    createdAt: Date.now(),
    agent: {
      role: "External MCP client",
      persona: "An external agent connected over the Model Context Protocol.",
      model: "external",
      voice: { pitch: 1, rate: 1 },
      autonomy: "ask",
      tools: [],
      stats: { proposed: 0, approved: 0, rejected: 0 },
    },
  };
  commit([{ type: "insert", coll: "members", doc: m as unknown as Member & Record<string, unknown> }], db.settings.currentUserId);
  return m;
}

function resolveItem(db: DB, ref: string): Item | undefined {
  const it = db.items[ref] ?? findByIdentifier(db, ref);
  return it && !it.archived ? it : undefined;
}

function issueLine(db: DB, i: Item): string {
  const state = stateOf(db, i)?.name ?? "—";
  const who = i.assigneeId ? db.members[i.assigneeId]?.name : "unassigned";
  return `${identifier(db, i)} [${state}] ${i.title} — ${who} (id: ${i.id})`;
}

const PRIORITY_NAMES: Record<string, Priority> = { none: 0, urgent: 1, high: 2, medium: 3, low: 4 };

const TOOLS = [
  {
    name: "search_workspace",
    description: "Full-text search over Council pages and issues (titles and content). Returns matching items with their ids or identifiers.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Search text" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_item",
    description: "Read a page or issue as markdown, including properties and comments. Accepts an item id or an issue identifier like ENG-12.",
    inputSchema: { type: "object", properties: { id_or_identifier: { type: "string" } }, required: ["id_or_identifier"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_issues",
    description: "List issues, optionally filtered by team key (ENG), status name or type (Todo, In Progress, started, completed…) and assignee name or handle.",
    inputSchema: { type: "object", properties: { team: { type: "string" }, status: { type: "string" }, assignee: { type: "string" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_issue",
    description: "Propose a new issue. It is created once a human approves it in Council's Approvals queue.",
    inputSchema: {
      type: "object",
      properties: {
        team: { type: "string", description: "Team key, e.g. ENG" },
        title: { type: "string" },
        description: { type: "string", description: "Markdown" },
        priority: { type: "string", enum: ["none", "urgent", "high", "medium", "low"] },
      },
      required: ["team", "title"],
    },
  },
  {
    name: "create_page",
    description: "Propose a new page from markdown, optionally nested under a parent page id. Created after human approval.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" }, markdown: { type: "string" }, parent_id: { type: "string" } },
      required: ["title", "markdown"],
    },
  },
  {
    name: "comment",
    description: "Propose a comment on a page or issue. Posted after human approval.",
    inputSchema: { type: "object", properties: { id_or_identifier: { type: "string" }, body: { type: "string" } }, required: ["id_or_identifier", "body"] },
  },
];

const text = (t: string, isError = false): ToolResult => ({ content: [{ type: "text", text: t }], ...(isError ? { isError } : {}) });

async function proposeFromMcp(action: ProposalAction, itemId?: string): Promise<ToolResult> {
  ensureMcpAgent();
  const p = await propose(MCP_AGENT_ID, action, "Requested by an external agent over MCP", { itemId });
  const what = describeAction(getDB(), action);
  return p.status === "pending"
    ? text(`Proposed: ${what}. It is waiting for human approval in Council (proposal ${p.id}).`)
    : text(`Done: ${what}.`);
}

const schemas = {
  search_workspace: z.object({ query: z.string().min(1) }),
  get_item: z.object({ id_or_identifier: z.string().min(1) }),
  list_issues: z.object({ team: z.string().optional(), status: z.string().optional(), assignee: z.string().optional() }),
  create_issue: z.object({ team: z.string().min(1), title: z.string().min(1).max(300), description: z.string().max(20000).optional(), priority: z.enum(["none", "urgent", "high", "medium", "low"]).optional() }),
  create_page: z.object({ title: z.string().min(1).max(300), markdown: z.string().max(50000), parent_id: z.string().optional() }),
  comment: z.object({ id_or_identifier: z.string().min(1), body: z.string().min(1).max(10000) }),
};

async function callTool(name: string, args: unknown): Promise<ToolResult> {
  const db = getDB();
  switch (name) {
    case "search_workspace": {
      const { query } = schemas.search_workspace.parse(args);
      const q = query.toLowerCase();
      const hits = Object.values(db.items)
        .filter((i) => !i.archived)
        .map((i) => {
          const body = blocksToMarkdown(i.blocks).toLowerCase();
          const score = (i.title.toLowerCase().includes(q) ? 3 : 0) + (body.includes(q) ? 1 : 0) + (identifier(db, i).toLowerCase() === q ? 5 : 0);
          return { i, score };
        })
        .filter((h) => h.score > 0)
        .sort((a, b) => b.score - a.score || b.i.updatedAt - a.i.updatedAt)
        .slice(0, 15);
      if (!hits.length) return text(`No pages or issues match "${query}".`);
      return text(hits.map(({ i }) => (i.kind === "issue" ? `issue ${issueLine(db, i)}` : `page "${i.title || "Untitled"}" (id: ${i.id})`)).join("\n"));
    }
    case "get_item": {
      const { id_or_identifier } = schemas.get_item.parse(args);
      const it = resolveItem(db, id_or_identifier);
      if (!it) return text(`No page or issue "${id_or_identifier}".`, true);
      const lines = [`# ${it.title || "Untitled"}`];
      if (it.kind === "issue") {
        lines.push(
          `- Identifier: ${identifier(db, it)}`,
          `- Status: ${stateOf(db, it)?.name ?? "—"}`,
          `- Priority: ${["No priority", "Urgent", "High", "Medium", "Low"][it.priority ?? 0]}`,
          `- Assignee: ${it.assigneeId ? db.members[it.assigneeId]?.name : "Unassigned"}`,
          `- Project: ${it.projectId ? db.projects[it.projectId]?.name : "—"}`,
        );
      }
      lines.push(`- id: ${it.id}`, "", blocksToMarkdown(it.blocks));
      const comments = Object.values(db.comments).filter((c) => c.itemId === it.id).sort((a, b) => a.createdAt - b.createdAt);
      if (comments.length) {
        lines.push("", "## Comments");
        for (const c of comments) lines.push(`- ${db.members[c.authorId]?.name ?? "Someone"}: ${c.body}`);
      }
      return text(lines.join("\n"));
    }
    case "list_issues": {
      const { team, status, assignee } = schemas.list_issues.parse(args ?? {});
      let list = issues(db);
      if (team) {
        const t = Object.values(db.teams).find((x) => x.key.toLowerCase() === team.toLowerCase() || x.name.toLowerCase() === team.toLowerCase());
        if (!t) return text(`No team "${team}". Teams: ${Object.values(db.teams).map((x) => x.key).join(", ")}`, true);
        list = list.filter((i) => i.teamId === t.id);
      }
      if (status) {
        const s = status.toLowerCase();
        list = list.filter((i) => {
          const st = stateOf(db, i);
          return st && (st.name.toLowerCase() === s || st.type === s);
        });
      }
      if (assignee) {
        const a = assignee.toLowerCase();
        list = list.filter((i) => {
          const m = i.assigneeId ? db.members[i.assigneeId] : undefined;
          return m && (m.name.toLowerCase().includes(a) || m.handle === a);
        });
      }
      list.sort((a, b) => (a.priority || 9) - (b.priority || 9) || b.updatedAt - a.updatedAt);
      return text(list.length ? list.slice(0, 50).map((i) => issueLine(db, i)).join("\n") : "No issues match.");
    }
    case "create_issue": {
      const a = schemas.create_issue.parse(args);
      const t = Object.values(db.teams).find((x) => x.key.toLowerCase() === a.team.toLowerCase());
      if (!t) return text(`No team "${a.team}". Teams: ${Object.values(db.teams).map((x) => x.key).join(", ")}`, true);
      return proposeFromMcp({ type: "create_issue", teamId: t.id, title: a.title, description: a.description, priority: a.priority ? PRIORITY_NAMES[a.priority] : 0 });
    }
    case "create_page": {
      const a = schemas.create_page.parse(args);
      if (a.parent_id && !resolveItem(db, a.parent_id)) return text(`No parent page "${a.parent_id}".`, true);
      return proposeFromMcp({ type: "create_page", title: a.title, markdown: a.markdown, parentId: a.parent_id ?? null });
    }
    case "comment": {
      const a = schemas.comment.parse(args);
      const it = resolveItem(db, a.id_or_identifier);
      if (!it) return text(`No page or issue "${a.id_or_identifier}".`, true);
      return proposeFromMcp({ type: "comment", itemId: it.id, body: a.body }, it.id);
    }
    default:
      throw new RpcError(-32602, `Unknown tool: ${name}`);
  }
}

class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}

/** Handle one JSON-RPC message. Returns null for notifications (no response). */
export async function handleRpc(msg: unknown): Promise<JsonRpcResponse | null> {
  const req = msg as Partial<JsonRpcRequest>;
  const id: JsonRpcId = req && (typeof req.id === "string" || typeof req.id === "number") ? req.id : null;
  const isNotification = !req || !("id" in req) || req.id === undefined;
  if (!req || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } };
  }
  try {
    let result: unknown;
    switch (req.method) {
      case "initialize": {
        const requested = typeof req.params?.protocolVersion === "string" ? req.params.protocolVersion : "";
        result = {
          protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
          capabilities: { tools: {} },
          serverInfo: { name: "council", version: "0.1.0" },
          instructions:
            "Council is a unified Linear × Notion workspace. Use search_workspace and get_item to read pages and issues (issues have identifiers like ENG-12). create_issue, create_page and comment are proposals: a human approves them in Council before they take effect.",
        };
        break;
      }
      case "notifications/initialized":
      case "notifications/cancelled":
        return null;
      case "ping":
        result = {};
        break;
      case "tools/list":
        result = { tools: TOOLS };
        break;
      case "tools/call": {
        const name = String(req.params?.name ?? "");
        try {
          result = await callTool(name, req.params?.arguments ?? {});
        } catch (err) {
          if (err instanceof RpcError) throw err;
          if (err instanceof z.ZodError) result = text(`Invalid arguments: ${err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}`, true);
          else result = text(err instanceof Error ? err.message : "Tool failed", true);
        }
        break;
      }
      default:
        if (isNotification) return null;
        throw new RpcError(-32601, `Method not found: ${req.method}`);
    }
    return isNotification ? null : { jsonrpc: "2.0", id, result };
  } catch (err) {
    if (isNotification) return null;
    const code = err instanceof RpcError ? err.code : -32603;
    return { jsonrpc: "2.0", id, error: { code, message: err instanceof Error ? err.message : "Internal error" } };
  }
}
