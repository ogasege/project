import Anthropic from "@anthropic-ai/sdk";

// Lazily constructed Anthropic client. Without ANTHROPIC_API_KEY the council runs on the simulator.

let client: Anthropic | null = null;

export function isLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export const DEFAULT_MODEL = process.env.COUNCIL_DEFAULT_MODEL || "claude-opus-5-5";
export const FAST_MODEL = process.env.COUNCIL_FAST_MODEL || "claude-haiku-5-5";
