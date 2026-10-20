import { z } from "zod";
import { getDB } from "@/server/db";
import { createOutcome } from "@/server/outcomes";
import { isLook } from "@/lib/presence";
import { REP_TEMPLATES } from "@/lib/reps";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Pick = z
  .object({
    agentId: z.string().min(1).optional(),
    template: z.enum(REP_TEMPLATES.map((t) => t.key) as [string, ...string[]]).optional(),
    look: z.string().refine(isLook, "Unknown look"),
  })
  .refine((p) => !!p.agentId !== !!p.template, "Give either agentId or template");

const Body = z.object({
  title: z.string().trim().min(3).max(300),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  guardrails: z.string().max(2000).optional(),
  view: z.string().max(40).optional(),
  team: z.array(Pick).min(1).max(8),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  try {
    const outcome = await createOutcome(parsed.data as Parameters<typeof createOutcome>[0], getDB().settings.currentUserId);
    return Response.json(outcome);
  } catch (err) {
    console.error("[savants] could not create outcome", err);
    return Response.json({ error: err instanceof Error ? err.message : "Could not start" }, { status: 500 });
  }
}
