import { z } from "zod";
import { commit, getDB } from "@/server/db";
import type { Op } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLLECTIONS = ["members", "teams", "items", "projects", "cycles", "labels", "comments", "activity", "integrations", "calls", "proposals"] as const;

const OpSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("insert"), coll: z.enum(COLLECTIONS), doc: z.looseObject({ id: z.string().min(1) }) }),
  z.object({ type: z.literal("update"), coll: z.enum(COLLECTIONS), id: z.string().min(1), patch: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal("delete"), coll: z.enum(COLLECTIONS), id: z.string().min(1) }),
  z.object({ type: z.literal("settings"), patch: z.record(z.string(), z.unknown()) }),
]);

const BodySchema = z.object({
  opId: z.string().optional(),
  clientId: z.string().optional(),
  ops: z.array(OpSchema).min(1).max(200),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  // Proposals are decided through /api/proposals so the human gate cannot be bypassed by a raw op.
  if (parsed.data.ops.some((o) => "coll" in o && o.coll === "proposals" && o.type !== "delete")) {
    return Response.json({ error: "Use /api/proposals to change proposals" }, { status: 403 });
  }
  // Integration credentials are written only through /api/integrations (server-side, never echoed).
  if (parsed.data.ops.some((o) => "coll" in o && o.coll === "integrations")) {
    return Response.json({ error: "Use /api/integrations to change connections" }, { status: 403 });
  }
  const actorId = getDB().settings.currentUserId;
  const env = commit(parsed.data.ops as Op[], actorId, { opId: parsed.data.opId, clientId: parsed.data.clientId });
  return Response.json({ ok: true, opId: env.opId });
}
