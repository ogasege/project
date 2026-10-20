import { z } from "zod";
import { uid } from "@/lib/id";
import type { Call } from "@/lib/types";
import { commit, getDB } from "@/server/db";
import { activityOp } from "@/server/actions";

export const dynamic = "force-dynamic";

const Body = z.object({
  participantIds: z.array(z.string()).max(8).optional(),
  contextItemIds: z.array(z.string()).max(10).optional(),
  title: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const db = getDB();
  const allAgents = Object.values(db.members).filter((m) => m.kind === "agent");
  const participantIds = (parsed.data.participantIds ?? allAgents.map((a) => a.id)).filter((id) => db.members[id]?.kind === "agent");
  if (!participantIds.length) return Response.json({ error: "Pick at least one agent" }, { status: 400 });
  // Lead agent first so it opens the call.
  participantIds.sort((a, b) => Number(!!db.members[b].agent?.lead) - Number(!!db.members[a].agent?.lead));
  const contextItemIds = (parsed.data.contextItemIds ?? []).filter((id) => db.items[id]);
  const ctxTitle = contextItemIds.length ? db.items[contextItemIds[0]].title : null;
  const call: Call = {
    id: uid("call"),
    title: parsed.data.title?.trim() || (ctxTitle ? `On “${ctxTitle}”` : `Savants call · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`),
    participantIds,
    contextItemIds,
    turns: [],
    notes: [],
    status: "live",
    startedAt: Date.now(),
    createdBy: db.settings.currentUserId,
  };
  commit(
    [{ type: "insert", coll: "calls", doc: call as unknown as Call & Record<string, unknown> }, activityOp(db.settings.currentUserId, "started a call", contextItemIds[0], call.title)],
    db.settings.currentUserId,
  );
  return Response.json(call);
}
