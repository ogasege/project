import { getDB } from "@/server/db";
import { checkInterjections } from "@/server/ai/interject";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDB();
  const call = db.calls[id];
  if (!call) return Response.json({ error: "Call not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { lastSpeakerId?: string };
  const last = body.lastSpeakerId ?? call.turns[call.turns.length - 1]?.speakerId;
  if (!last || call.status !== "live") return Response.json({ hands: [] });
  const hands = await checkInterjections(db, call, last);
  return Response.json({ hands });
}
