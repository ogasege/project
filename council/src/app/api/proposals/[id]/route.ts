import { z } from "zod";
import { decide } from "@/server/actions";
import { getDB } from "@/server/db";
import type { ProposalAction } from "@/lib/types";

export const dynamic = "force-dynamic";

const Body = z.object({ approve: z.boolean(), action: z.record(z.string(), z.unknown()).optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const existing = getDB().proposals[id];
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  // An edited action must keep the original action type.
  const edited = parsed.data.action as ProposalAction | undefined;
  if (edited && edited.type !== existing.action.type) return Response.json({ error: "Action type cannot change" }, { status: 400 });
  try {
    const p = await decide(id, parsed.data.approve, getDB().settings.currentUserId, edited);
    return Response.json(p);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
