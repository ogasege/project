import { z } from "zod";
import { commit, getDB } from "@/server/db";
import { executeAction } from "@/server/actions";
import { runAgent } from "@/server/ai/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({ itemId: z.string().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const db = getDB();
  const agent = db.members[id];
  if (!agent?.agent) return Response.json({ error: "Not an agent" }, { status: 404 });
  if (!db.items[parsed.data.itemId]) return Response.json({ error: "Item not found" }, { status: 404 });

  let text = "";
  const tools: string[] = [];
  let proposals = 0;
  try {
    for await (const ev of runAgent({ agentId: id, mode: "work", itemId: parsed.data.itemId, signal: req.signal })) {
      if (ev.type === "text") text += ev.delta;
      else if (ev.type === "tool") tools.push(ev.summary);
      else if (ev.type === "proposal") proposals++;
      else if (ev.type === "error") text += `\n\n_${ev.message}_`;
    }
  } catch (err) {
    console.error("[savants] agent work failed", err);
    return Response.json({ error: err instanceof Error ? err.message : "Agent failed" }, { status: 500 });
  }
  const body = text.trim() || `${agent.name} looked into it but had nothing to add.`;
  const res = await executeAction(id, { type: "comment", itemId: parsed.data.itemId, body });
  commit(res.ops, id);
  return Response.json({ message: `${agent.name} posted an update${proposals ? ` and made ${proposals} proposal${proposals > 1 ? "s" : ""}` : ""}.`, tools });
}
