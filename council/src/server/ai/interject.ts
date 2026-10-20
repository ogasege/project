import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Call, DB } from "@/lib/types";
import { anthropic, FAST_MODEL, isLive } from "./client";
import { simulateInterjections, type SimHand } from "./simulator";

// After each agent turn, the other participants decide whether to raise a hand.

const Hand = z.object({
  raise_hand: z.boolean(),
  urgency: z.number(),
  preview: z.string(),
});

const THRESHOLD = 0.6;

export async function checkInterjections(db: DB, call: Call, lastSpeakerId: string): Promise<SimHand[]> {
  if (!isLive()) return simulateInterjections(db, call, lastSpeakerId);
  const transcript = call.turns
    .slice(-10)
    .map((t) => `${db.members[t.speakerId]?.name ?? "Someone"}: ${t.text}`)
    .join("\n");
  const client = anthropic();
  const candidates = call.participantIds.filter((id) => id !== lastSpeakerId && db.members[id]?.agent);

  const results = await Promise.all(
    candidates.map(async (id): Promise<SimHand | null> => {
      const m = db.members[id];
      try {
        const res = await client.messages.parse({
          model: FAST_MODEL,
          max_tokens: 2000,
          output_config: { effort: "low", format: zodOutputFormat(Hand) },
          system: `${m.agent?.persona}\nYou are ${m.name} listening on a council call. Decide whether you must interject right now. Raise your hand only for something important the group is missing: a real disagreement, a risk, a missing fact, or a concrete next step only you would add. urgency is 0..1. preview is what you'd open with, under 12 words.`,
          messages: [{ role: "user", content: `Recent transcript:\n${transcript}\n\nShould ${m.name} raise a hand?` }],
        });
        const out = res.parsed_output;
        if (!out || !out.raise_hand || out.urgency < THRESHOLD) return null;
        return { agentId: id, preview: out.preview.slice(0, 120), urgency: Math.min(1, out.urgency) };
      } catch (err) {
        if (err instanceof Anthropic.APIError) console.error(`[council] interjection check failed for ${m.name}: ${err.status}`);
        else console.error("[council] interjection check failed", err);
        return null;
      }
    }),
  );
  return results.filter((h): h is SimHand => !!h).sort((a, b) => b.urgency - a.urgency).slice(0, 2);
}
