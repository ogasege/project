import Anthropic from "@anthropic-ai/sdk";

// Lazily constructed Anthropic client. Without ANTHROPIC_API_KEY the savants runs on the simulator.

let client: Anthropic | null = null;

export function isLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function anthropic(): Anthropic {
  if (!client) {
    // Keys that are not scoped to a workspace must name one on every request.
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});
  }
  return client;
}

export const DEFAULT_MODEL = process.env.SAVANTS_DEFAULT_MODEL || "claude-opus-5-5";
export const FAST_MODEL = process.env.SAVANTS_FAST_MODEL || "claude-haiku-5-5";
