import { z } from "zod";
import { commit, getDB } from "@/server/db";
import { isRunning, runRound } from "@/server/outcomes";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("run") }),
  z.object({ action: z.literal("view"), view: z.string().min(1).max(40) }),
  z.object({ action: z.literal("status"), status: z.enum(["achieved", "paused", "review"]) }),
]);

// Another round of work, or a change the user makes to the outcome.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDB();
  const oc = db.outcomes[id];
  if (!oc) return Response.json({ error: "Outcome not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const me = db.settings.currentUserId;
  const body = parsed.data;
  if (body.action === "run") {
    if (isRunning(id)) return Response.json({ error: "The team is already working on this" }, { status: 409 });
    void runRound(id);
    return Response.json({ ok: true });
  }
  if (body.action === "view") commit([{ type: "update", coll: "outcomes", id, patch: { view: body.view } }], me);
  else commit([{ type: "update", coll: "outcomes", id, patch: { status: body.status, updatedAt: Date.now() } }], me);
  return Response.json({ ok: true });
}
