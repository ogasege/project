import { z } from "zod";
import { catalogApp } from "@/lib/integrations-catalog";
import type { Op } from "@/lib/types";
import { activityOp } from "@/server/actions";
import { commit, getDB } from "@/server/db";
import { listActions, runIntegrationAction } from "@/server/integrations";

export const dynamic = "force-dynamic";

function connectionsFor(appId: string) {
  return Object.values(getDB().integrations).filter((c) => c.appId === appId || c.id === appId);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ appId: string }> }) {
  const { appId } = await ctx.params;
  const conns = connectionsFor(appId);
  if (!conns.length) return Response.json({ error: "Not connected" }, { status: 404 });
  const actorId = getDB().settings.currentUserId;
  const ops: Op[] = conns.map((c) => ({ type: "delete", coll: "integrations", id: c.id }));
  ops.push(activityOp(actorId, `disconnected ${catalogApp(appId)?.name ?? appId}`));
  commit(ops, actorId);
  return Response.json({ ok: true });
}

export async function GET(_req: Request, ctx: { params: Promise<{ appId: string }> }) {
  const { appId } = await ctx.params;
  return Response.json({ actions: listActions(appId) });
}

const RunBody = z.object({ action: z.string().regex(/^[a-z_]{1,40}$/), input: z.record(z.string(), z.unknown()).default({}) });

// Quick "test connection" / manual action run from the integrations page.
export async function POST(req: Request, ctx: { params: Promise<{ appId: string }> }) {
  const { appId } = await ctx.params;
  const parsed = RunBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  if (!connectionsFor(appId).length) return Response.json({ error: "Not connected" }, { status: 404 });
  try {
    const output = await runIntegrationAction(appId, parsed.data.action, parsed.data.input);
    return Response.json({ output });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Action failed" }, { status: 502 });
  }
}
