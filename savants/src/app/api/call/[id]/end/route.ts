import { identifier } from "@/lib/workspace";
import type { NoteKind } from "@/lib/types";
import { commit, getDB } from "@/server/db";
import { activityOp, describeAction, executeAction } from "@/server/actions";

export const dynamic = "force-dynamic";

const KIND_TITLES: [NoteKind, string][] = [
  ["decision", "Decisions"],
  ["action", "Actions"],
  ["risk", "Risks"],
  ["question", "Open questions"],
  ["assumption", "Assumptions"],
  ["claim", "Claims"],
];

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDB();
  const call = db.calls[id];
  if (!call) return Response.json({ error: "Call not found" }, { status: 404 });
  if (call.status === "ended") return Response.json(call);

  const name = (mid: string) => db.members[mid]?.name ?? "Someone";
  const endedAt = Date.now();
  const mins = Math.max(1, Math.round((endedAt - call.startedAt) / 60000));
  const lines: string[] = [];
  lines.push(`> [!note] Savants call with ${call.participantIds.map(name).join(", ")} · ${mins} min · ${new Date(call.startedAt).toLocaleString()}`);
  if (call.contextItemIds.length) {
    lines.push("## Context");
    for (const cid of call.contextItemIds) {
      const it = db.items[cid];
      if (it) lines.push(`- ${it.kind === "issue" ? `${identifier(db, it)} ` : ""}${it.title}`);
    }
  }
  for (const [kind, title] of KIND_TITLES) {
    const notes = call.notes.filter((n) => n.kind === kind);
    if (!notes.length) continue;
    lines.push(`## ${title}`);
    for (const n of notes) lines.push(kind === "action" ? `- [ ] ${n.text} (${name(n.authorId)})` : `- ${n.text} (${name(n.authorId)})`);
  }
  const proposals = Object.values(db.proposals).filter((p) => p.callId === id);
  if (proposals.length) {
    lines.push("## Proposed during the call");
    for (const p of proposals) {
      const res = p.resultItemId ? db.items[p.resultItemId] : undefined;
      const status = p.status === "auto" ? "done automatically" : p.status;
      lines.push(`- ${describeAction(db, p.action)} — ${status}${res ? ` → ${res.kind === "issue" ? identifier(db, res) : res.title}` : ""} (${name(p.agentId)})`);
    }
  }
  lines.push("## Transcript");
  for (const t of call.turns) lines.push(`**${name(t.speakerId)}:** ${t.text}${t.interrupted ? " —" : ""}`);
  if (!call.turns.length) lines.push("(Nobody spoke.)");

  const userId = db.settings.currentUserId;
  const res = await executeAction(userId, { type: "create_page", title: `Call notes: ${call.title}`, markdown: lines.join("\n"), icon: "📞", parentId: null });
  commit(
    [...res.ops, { type: "update", coll: "calls", id, patch: { status: "ended", endedAt, summaryPageId: res.resultItemId } }, activityOp(userId, "ended a call", res.resultItemId, call.title)],
    userId,
  );
  return Response.json({ ...call, status: "ended", endedAt, summaryPageId: res.resultItemId });
}
