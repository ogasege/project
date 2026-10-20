import { z } from "zod";
import { uid } from "@/lib/id";
import type { Call, CallTurn, DB } from "@/lib/types";
import { commit, getDB } from "@/server/db";
import { isAbort, runAgent } from "@/server/ai/run";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({ text: z.string().max(4000).default(""), addressedTo: z.string().optional() });

function appendTurn(callId: string, turn: CallTurn, actorId: string) {
  const call = getDB().calls[callId];
  if (!call) return;
  commit([{ type: "update", coll: "calls", id: callId, patch: { turns: [...call.turns, turn] } }], actorId);
}

function pickSpeaker(db: DB, call: Call, text: string, addressedTo?: string): string {
  if (addressedTo && call.participantIds.includes(addressedTo)) return addressedTo;
  const lower = text.toLowerCase();
  // An agent named in the utterance gets the floor (earliest mention wins).
  let best: { id: string; at: number } | null = null;
  for (const id of call.participantIds) {
    const name = db.members[id]?.name.toLowerCase();
    if (!name) continue;
    const at = lower.search(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`));
    if (at >= 0 && (!best || at < best.at)) best = { id, at };
  }
  if (best) return best.id;
  return call.participantIds.find((id) => db.members[id]?.agent?.lead) ?? call.participantIds[0];
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const db = getDB();
  const call = db.calls[id];
  if (!call) return Response.json({ error: "Call not found" }, { status: 404 });
  if (call.status !== "live") return Response.json({ error: "Call has ended" }, { status: 409 });

  const userId = db.settings.currentUserId;
  const text = parsed.data.text.trim();
  if (text) appendTurn(id, { id: uid("tn"), speakerId: userId, text, at: Date.now() }, userId);
  const speakerId = pickSpeaker(db, call, text, parsed.data.addressedTo);

  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort(), { once: true });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          // client went away
        }
      };
      send({ type: "speaker", agentId: speakerId });
      let spoken = "";
      let interrupted = false;
      try {
        for await (const ev of runAgent({ agentId: speakerId, mode: "call", callId: id, signal: abort.signal })) {
          if (ev.type === "text") spoken += ev.delta;
          send(ev);
        }
      } catch (err) {
        if (isAbort(err, abort.signal)) interrupted = true;
        else {
          console.error("[council] call turn failed", err);
          send({ type: "error", message: err instanceof Error ? err.message : "The agent hit an error." });
        }
      }
      const turn: CallTurn = { id: uid("tn"), speakerId, text: spoken.trim(), at: Date.now(), interrupted: interrupted || undefined };
      if (turn.text) appendTurn(id, turn, speakerId);
      send({ type: "done", turn });
      try {
        controller.close();
      } catch {
        // already closed
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
}
