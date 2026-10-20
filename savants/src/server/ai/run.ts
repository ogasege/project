import Anthropic from "@anthropic-ai/sdk";
import type { BoardNote, Proposal } from "@/lib/types";
import { getDB } from "@/server/db";
import { anthropic, DEFAULT_MODEL, isLive } from "./client";
import { buildSystem, callMessages, type AgentMode } from "./prompts";
import { planCallTurn, planWork } from "./simulator";
import { executeTool, toolDefinitions, type ToolEvent } from "./tools";

// One agent turn: streams text, runs tools, and reports notes/proposals as typed events.
// Shared by live call turns and asynchronous "work on this issue" runs.

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; name: string; summary: string }
  | { type: "note"; note: BoardNote }
  | { type: "proposal"; proposal: Proposal; summary: string }
  | { type: "error"; message: string };

export interface RunOptions {
  agentId: string;
  mode: AgentMode;
  callId?: string;
  itemId?: string;
  signal?: AbortSignal;
}

const MAX_ITERATIONS = 6;

export function abortError(): Error {
  const e = new Error("aborted");
  e.name = "AbortError";
  return e;
}

export function isAbort(err: unknown, signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted) || err instanceof Anthropic.APIUserAbortError || (err instanceof Error && err.name === "AbortError");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(abortError());
    }, { once: true });
  });
}

function* toolEvents(name: string, summary: string, events: ToolEvent[]): Generator<AgentEvent> {
  yield { type: "tool", name, summary };
  for (const ev of events) yield ev;
}

export async function* runAgent(opts: RunOptions): AsyncGenerator<AgentEvent> {
  if (!isLive()) return yield* runSimulated(opts);
  let produced = false;
  try {
    for await (const ev of runLive(opts)) {
      produced = true;
      yield ev;
    }
  } catch (err) {
    // A key or account problem (bad key, missing workspace, no access to the model) fails before
    // the agent says anything. Keep the call usable on the simulator and say why.
    const config =
      err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError || err instanceof Anthropic.BadRequestError || err instanceof Anthropic.NotFoundError;
    if (!config || produced) throw err;
    console.error(`[savants] live model unavailable, using simulator: ${(err as Error).message}`);
    yield { type: "error", message: `Live model unavailable (${(err as InstanceType<typeof Anthropic.APIError>).status}); this turn ran on the simulator.` };
    yield* runSimulated(opts);
  }
}

// ---------- simulator ----------

async function* runSimulated(opts: RunOptions): AsyncGenerator<AgentEvent> {
  const db = getDB();
  const agent = db.members[opts.agentId];
  if (!agent) return yield { type: "error", message: "Unknown agent" };
  const ctx = { agentId: agent.id, callId: opts.callId, itemId: opts.itemId };
  let plan;
  if (opts.mode === "call") {
    const call = opts.callId ? db.calls[opts.callId] : undefined;
    if (!call) return yield { type: "error", message: "Unknown call" };
    plan = planCallTurn(db, call, agent);
  } else {
    const item = opts.itemId ? db.items[opts.itemId] : undefined;
    if (!item) return yield { type: "error", message: "Unknown item" };
    plan = planWork(db, agent, item);
  }

  await sleep(350 + (plan.text.length % 300), opts.signal); // "thinking"
  // Read-only tools first (they inform the answer), writes after the agent starts talking.
  const reads = plan.tools.filter((t) => t.name === "search_workspace" || t.name === "read_item");
  const writes = plan.tools.filter((t) => !reads.includes(t));
  for (const t of reads) {
    const r = await executeTool(t.name, t.input, ctx);
    yield* toolEvents(t.name, r.summary, r.events);
  }
  const words = plan.text.split(/(\s+)/);
  let emitted = 0;
  for (let i = 0; i < words.length; i++) {
    yield { type: "text", delta: words[i] };
    if (words[i].trim()) {
      emitted++;
      await sleep(28 + ((emitted * 37) % 45) + (/[.,?!]$/.test(words[i]) ? 120 : 0), opts.signal);
    }
    if (emitted === 12 && writes.length) {
      for (const t of writes.splice(0)) {
        const r = await executeTool(t.name, t.input, ctx);
        yield* toolEvents(t.name, r.summary, r.events);
      }
    }
  }
  for (const t of writes) {
    const r = await executeTool(t.name, t.input, ctx);
    yield* toolEvents(t.name, r.summary, r.events);
  }
}

// ---------- live models ----------

async function* runLive(opts: RunOptions): AsyncGenerator<AgentEvent> {
  const db = getDB();
  const agent = db.members[opts.agentId];
  if (!agent?.agent) return yield { type: "error", message: "Unknown agent" };
  const call = opts.callId ? db.calls[opts.callId] : undefined;
  const item = opts.itemId ? db.items[opts.itemId] : undefined;
  const ctx = { agentId: agent.id, callId: opts.callId, itemId: opts.itemId };

  const system = buildSystem(db, agent, opts.mode, { call, item });
  const tools = toolDefinitions(agent.agent.tools, opts.mode);
  const messages: Anthropic.Beta.BetaMessageParam[] =
    opts.mode === "call" && call
      ? callMessages(db, call, agent)
      : [{ role: "user", content: `Please work on ${item ? `"${item.title}"` : "the issue"} now. Use your tools, then write your update.` }];

  const client = anthropic();
  let jsonRetries = 0;
  let wroteText = false;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const stream = client.beta.messages.stream(
      {
        model: agent.agent.model || DEFAULT_MODEL,
        max_tokens: opts.mode === "call" ? 8000 : 16000,
        system,
        tools,
        messages,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: opts.mode === "call" ? "low" : "medium" },
      },
      { signal: opts.signal },
    );

    let separatorPending = wroteText;
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        if (separatorPending) {
          yield { type: "text", delta: " " };
          separatorPending = false;
        }
        wroteText = true;
        yield { type: "text", delta: ev.delta.text };
      }
    }

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Typed API errors (and aborts) propagate; only unparseable eager tool JSON is retried.
      if (err instanceof Anthropic.APIError || isAbort(err, opts.signal) || jsonRetries++ >= 2) throw err;
      continue;
    }

    if (message.stop_reason === "refusal") {
      yield { type: "error", message: "The model declined to continue this turn." };
      return;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!toolUses.length) return;
    if (message.stop_reason === "max_tokens") {
      yield { type: "error", message: "Ran out of room mid tool call; skipped it." };
      return;
    }

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const r = await executeTool(tu.name, tu.input, ctx);
      yield* toolEvents(tu.name, r.summary, r.events);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: r.content, is_error: r.isError || undefined });
    }
    messages.push({ role: "user", content: results });
  }
}
