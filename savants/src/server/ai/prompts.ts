import type Anthropic from "@anthropic-ai/sdk";
import { blocksToMarkdown } from "@/lib/markdown";
import { identifier, stateOf } from "@/lib/workspace";
import type { Call, DB, Item, Member } from "@/lib/types";

export type AgentMode = "call" | "work";

const CALL_STYLE = `You are on a live voice call. Everything you write is read aloud by a speech synthesizer.
- Speak in one to four short, natural sentences. Never use markdown, bullet points, headings, emoji, or code.
- Talk like a sharp colleague on a call: direct, warm, specific. Use contractions.
- Address people by name. The human is the decision-maker; you reason with them, not at them.
- If you disagree with the human or another agent, say so plainly and say what would change your mind.
- Use tools silently. Do not narrate tool calls; mention the result in a few words ("I've put that on the board", "I proposed an issue for it").
- Pin the important things to the shared board with pin_note: claims, assumptions, open questions, risks, decisions, and actions.
- Propose workspace changes (issues, pages, updates) only when the group has converged or the human asks. Every write passes through a human approval gate.
- Never invent workspace facts. If you need one, search or read the workspace first.`;

const WORK_STYLE = `You are working asynchronously on an assigned issue in the team's workspace.
- Read what you need from the workspace with your tools, then do the work.
- Propose concrete changes (sub-issues, pages, updates) through your tools; every write passes through a human approval gate.
- Finish with a concise update for the issue's comment thread: what you looked at, what you concluded, what you proposed, and what you need from a human. Markdown is fine; keep it under 200 words.`;

function itemSummary(db: DB, it: Item): string {
  if (it.kind === "issue") {
    const st = stateOf(db, it);
    const assignee = it.assigneeId ? db.members[it.assigneeId]?.name : "unassigned";
    const project = it.projectId ? db.projects[it.projectId]?.name : null;
    return `${identifier(db, it)} "${it.title}" [${st?.name ?? "?"}, ${assignee}${project ? `, project: ${project}` : ""}] (id ${it.id})`;
  }
  return `Page "${it.title || "Untitled"}" (id ${it.id})`;
}

export function renderItem(db: DB, it: Item, maxChars = 3000): string {
  const comments = Object.values(db.comments)
    .filter((c) => c.itemId === it.id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-8)
    .map((c) => `- ${db.members[c.authorId]?.name ?? "Someone"}: ${c.body}`)
    .join("\n");
  const body = blocksToMarkdown(it.blocks).slice(0, maxChars);
  return `### ${itemSummary(db, it)}\n${body || "(empty)"}${comments ? `\n\nComments:\n${comments}` : ""}`;
}

/** Stable part first (cached), volatile context after. */
export function buildSystem(db: DB, agent: Member, mode: AgentMode, opts: { call?: Call; item?: Item } = {}): Anthropic.Beta.BetaTextBlockParam[] {
  const roster = Object.values(db.members)
    .filter((m) => m.kind === "agent" && m.id !== agent.id)
    .map((m) => `- ${m.name} (${m.agent?.role}): ${m.agent?.persona.split(".")[0]}.`)
    .join("\n");
  const human = db.members[db.settings.currentUserId];
  const teams = Object.values(db.teams)
    .map((t) => `${t.key} = ${t.name}`)
    .join(", ");
  const projects = Object.values(db.projects)
    .map((p) => `- ${p.name} (${p.status}${p.targetDate ? `, target ${p.targetDate}` : ""}): ${p.description}`)
    .join("\n");

  const stable = `${agent.agent?.persona ?? `You are ${agent.name}.`}

You are ${agent.name}, the ${agent.agent?.role ?? "agent"} one of the savants, a team of AI agents inside "${db.settings.workspaceName}", a workspace where people and agents plan and do work together (issues like Linear, pages like Notion).

The other savants:
${roster || "- none"}

The human you work with: ${human?.name ?? "the user"}.

${mode === "call" ? CALL_STYLE : WORK_STYLE}

Workspace teams: ${teams}.
Projects:
${projects}`;

  const parts: string[] = [];
  if (opts.call) {
    const ctx = opts.call.contextItemIds.map((id) => db.items[id]).filter(Boolean) as Item[];
    if (ctx.length) parts.push(`Context for this call:\n\n${ctx.map((it) => renderItem(db, it, 2500)).join("\n\n")}`);
    const notes = opts.call.notes.slice(-20).map((n) => `- [${n.kind}] ${n.text} (${db.members[n.authorId]?.name ?? "?"})`);
    if (notes.length) parts.push(`The shared board so far:\n${notes.join("\n")}`);
    parts.push(`Call title: ${opts.call.title}. Participants: ${[human?.name, ...opts.call.participantIds.map((id) => db.members[id]?.name)].filter(Boolean).join(", ")}.`);
  }
  if (opts.item) parts.push(`The issue you are working on:\n\n${renderItem(db, opts.item, 5000)}`);

  const system: Anthropic.Beta.BetaTextBlockParam[] = [{ type: "text", text: stable, cache_control: { type: "ephemeral" } }];
  if (parts.length) system.push({ type: "text", text: parts.join("\n\n") });
  return system;
}

/** Transcript → messages from the speaking agent's point of view. Always starts and ends with a user turn. */
export function callMessages(db: DB, call: Call, agent: Member): Anthropic.Beta.BetaMessageParam[] {
  const msgs: Anthropic.Beta.BetaMessageParam[] = [];
  const push = (role: "user" | "assistant", text: string) => {
    const last = msgs[msgs.length - 1];
    if (last && last.role === role && typeof last.content === "string") last.content += `\n\n${text}`;
    else msgs.push({ role, content: text });
  };
  for (const t of call.turns.slice(-40)) {
    if (!t.text.trim()) continue;
    if (t.speakerId === agent.id) push("assistant", t.text + (t.interrupted ? " —" : ""));
    else {
      const who = db.members[t.speakerId]?.name ?? "Someone";
      push("user", `${who}: ${t.text}${t.interrupted ? " (interrupted)" : ""}`);
    }
  }
  if (!msgs.length || msgs[0].role !== "user") msgs.unshift({ role: "user", content: "(The call has started.)" });
  if (msgs[msgs.length - 1].role !== "user") push("user", `(${agent.name}, you have the floor — go ahead.)`);
  return msgs;
}
