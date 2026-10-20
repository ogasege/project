import { blocksToMarkdown } from "@/lib/markdown";
import { identifier } from "@/lib/workspace";
import type { Call, DB, Item, Member } from "@/lib/types";
import { searchWorkspace } from "./tools";

// Deterministic stand-in for real models so the council can be demoed with no API key.
// Persona-aware, grounded in the workspace, with planned tool calls (notes, proposals).

export interface SimPlan {
  text: string;
  tools: { name: string; input: Record<string, unknown> }[];
}

const STOP = new Set(
  "the a an and or but so to of in on for with about from into that this those these what which who how why when where is are was were be been being it its we our us you your i me my they them their he she do does did can could should would will just really very let lets let's think know want need make get go going have has had not no yes okay ok like maybe also then than there here some any more most much many one two three over under out up down at by as if council vera atlas forge scout please".split(" "),
);

const ACTION_WORDS = /\b(build|ship|launch|do|start|create|write|send|record|submit|plan|draft|fix|make|automate|validate|call|hire|apply|track)\b/i;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function keywords(text: string, n = 4): string[] {
  const words = text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
  const out: string[] = [];
  for (const w of words) if (!STOP.has(w) && !out.includes(w)) out.push(w);
  return out.slice(0, n);
}

function topicOf(text: string, fallback: string): string {
  const k = keywords(text.replace(new RegExp(ACTION_WORDS.source, "gi"), " ").replace(/\b(week|today|tomorrow|now|something|thing|things)\b/gi, " "), 3);
  return k.length ? k.join(" ") : fallback;
}

function firstSentence(md: string): string {
  const line = md
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\d.\s[\]x]+/, "").trim())
    .find((l) => l.length > 25);
  if (!line) return "";
  const s = line.split(/(?<=[.!?])\s/)[0];
  return s.length > 140 ? s.slice(0, 137) + "…" : s;
}

export function lastHumanText(db: DB, call: Call): string {
  for (let i = call.turns.length - 1; i >= 0; i--) {
    const t = call.turns[i];
    if (db.members[t.speakerId]?.kind !== "agent" && t.text.trim()) return t.text;
  }
  return "";
}

function lastTurnBy(call: Call, agentId: string) {
  for (let i = call.turns.length - 1; i >= 0; i--) if (call.turns[i].speakerId === agentId) return call.turns[i];
  return undefined;
}

function roleOf(agent: Member): "lead" | "skeptic" | "operator" | "researcher" | "generic" {
  const r = `${agent.agent?.role ?? ""} ${agent.agent?.persona ?? ""}`.toLowerCase();
  if (agent.agent?.lead || /lead|strateg|synthes/.test(r)) return "lead";
  if (/skeptic|red-team|critic/.test(r)) return "skeptic";
  if (/operator|execut|ship/.test(r)) return "operator";
  if (/research|scout|facts/.test(r)) return "researcher";
  return "generic";
}

export function planCallTurn(db: DB, call: Call, agent: Member): SimPlan {
  const human = db.members[db.settings.currentUserId];
  const first = human?.name.split(" ")[0] ?? "there";
  const said = lastHumanText(db, call);
  const ctx = call.contextItemIds.map((id) => db.items[id]).filter(Boolean) as Item[];
  const ctxTitle = ctx[0]?.title;
  const topic = topicOf(said, ctxTitle ?? "this");
  const hits = searchWorkspace(db, said || ctxTitle || "validation", 3).filter((h) => !call.contextItemIds.includes(h.id));
  const hit = hits[0] ?? ctx[0];
  const seed = hash(said + agent.id + call.turns.length);
  const others = call.participantIds.filter((id) => id !== agent.id).map((id) => db.members[id]).filter(Boolean) as Member[];
  const skeptic = others.find((m) => roleOf(m) === "skeptic");
  const operator = others.find((m) => roleOf(m) === "operator");
  const project = Object.values(db.projects).find((p) => keywords(said, 6).some((k) => p.name.toLowerCase().includes(k)));
  const tools: SimPlan["tools"] = [];
  const isGoAhead = !said || /^\(?go ahead/i.test(said.trim()) || lastTurnBy(call, agent.id)?.at === undefined;
  const opening = call.turns.filter((t) => db.members[t.speakerId]?.kind === "agent").length === 0;

  let text = "";
  switch (roleOf(agent)) {
    case "lead": {
      if (opening && !said) {
        text = ctxTitle
          ? `Hey ${first}. We've all got "${ctxTitle}" open. Where do you want to start, the strongest part or the weakest?`
          : `Hey ${first}, the whole council is here. What are we trying to decide today?`;
        break;
      }
      text = pick(
        [
          `Okay, let me frame it. On ${topic}, the real decision is what we commit to this week versus what we just keep exploring. ${skeptic ? `${skeptic.name} will want evidence before we commit` : "I'd want evidence before we commit"}, and I think that's right. My suggestion is one small test we can run in forty-eight hours.`,
          `Here's what I'm hearing, ${first}: ${topic} matters because it's on the critical path${project ? ` for ${project.name}` : ""}. The risk is spreading ourselves across too many bets. I'd pick one, set a deadline, and let the scorecard decide.`,
          `Let me synthesize. We agree ${topic} is worth pursuing, we disagree on how fast. ${operator ? `${operator.name}, can you turn that into something we can ship` : "Let's turn that into something we can ship"} by Wednesday?`,
        ],
        seed,
      );
      tools.push({ name: "pin_note", input: { kind: "decision", text: `Pick one test on ${topic} and run it within 48 hours.` } });
      break;
    }
    case "skeptic": {
      text = pick(
        [
          `I'm going to push back. ${said ? `"${said.length > 60 ? said.slice(0, 57) + "…" : said}" ` : "That "}sounds right, but it's an assumption, not a fact yet. What would change my mind is three customers telling us they'd pay for it, not three telling us it's interesting.`,
          `Careful here. Every time we've gone broad, partners told us it was too broad. If ${topic} is the wedge, I want to see the one painful workflow and who owns the budget for it.`,
          `Devil's advocate, ${first}: the incumbents are building this too. Our answer can't be "we're faster". It has to be something they structurally can't do. What is that for ${topic}?`,
        ],
        seed,
      );
      tools.push({ name: "pin_note", input: { kind: pick(["risk", "assumption", "question"], seed >> 3), text: `Unproven: demand for ${topic}. Need paying-customer evidence.` } });
      break;
    }
    case "operator": {
      if (ACTION_WORDS.test(said) || isGoAhead) {
        const title = said && ACTION_WORDS.test(said) ? said.replace(/^(let'?s|we should|i want to|can we|we need to)\s+/i, "").replace(/[.?!]+$/, "").slice(0, 90) : `First experiment on ${topic}`;
        const issueTitle = title.charAt(0).toUpperCase() + title.slice(1);
        text = pick(
          [
            `Let's make it concrete. I'd scope it as one issue with a Friday deadline and a clear done-state. I've proposed it so you can approve it.`,
            `Okay, sequencing. First the smallest version we can show someone, then the follow-up. I've drafted the issue, it's waiting on your approval.`,
          ],
          seed,
        );
        tools.push({
          name: "create_issue",
          input: {
            team: project ? Object.values(db.teams).find((t) => project.teamIds.includes(t.id))?.key : "ENG",
            title: issueTitle,
            description: `Raised on the call "${call.title}".\n\n## Done when\n- [ ] Smallest shippable version exists\n- [ ] Shown to at least one real user\n- [ ] Result written up on the call page`,
            priority: "high",
            assignee: first,
            project: project?.name,
            rationale: `Agreed on the call: ${topic}.`,
          },
        });
        tools.push({ name: "pin_note", input: { kind: "action", text: `${issueTitle} — owner ${first}, due Friday.` } });
      } else {
        text = pick(
          [
            `From an execution standpoint, ${topic} is two weeks of work if we're disciplined, six if we're not. Tell me the deadline and I'll work backwards.`,
            `I can have this broken into issues in a minute. Before I do, who owns it, you or me?`,
          ],
          seed,
        );
      }
      break;
    }
    case "researcher": {
      if (hit) {
        const snippet = firstSentence(blocksToMarkdown(hit.blocks));
        const ref = hit.kind === "issue" ? `${identifier(db, hit)}, "${hit.title}"` : `the page "${hit.title}"`;
        text = `I checked the workspace. The closest thing we have is ${ref}.${snippet ? ` It says: ${snippet}` : ""} So we're not starting from zero, but the evidence there is our own notes, not customer data.`;
        tools.push({ name: "search_workspace", input: { query: topic } });
        tools.push({ name: "pin_note", input: { kind: "claim", text: `Existing material: ${hit.title}.` } });
      } else {
        text = `I couldn't find anything in the workspace on ${topic}. That's a gap worth flagging. I'd start a page to collect what we know before we argue about it.`;
        tools.push({ name: "pin_note", input: { kind: "question", text: `What do we actually know about ${topic}?` } });
      }
      break;
    }
    default:
      text = `On ${topic}: I think the key is to keep it small and measurable. What does success look like by Friday, ${first}?`;
  }
  return { text, tools };
}

export function planWork(db: DB, agent: Member, item: Item): SimPlan {
  const hits = searchWorkspace(db, item.title, 3).filter((h) => h.id !== item.id);
  const role = roleOf(agent);
  const lines = [
    `**${agent.name} here — took a first pass on ${identifier(db, item) || item.title}.**`,
    "",
    hits.length ? `Looked at: ${hits.map((h) => (h.kind === "issue" ? identifier(db, h) : `“${h.title}”`)).join(", ")}.` : "Nothing related in the workspace yet.",
    "",
    role === "skeptic"
      ? "Main risk: we haven't validated the core assumption with anyone outside the team. I'd gate further work on two external conversations."
      : role === "researcher"
        ? "Open questions I couldn't answer from the workspace: who the buyer is, and what they use today."
        : "Proposed a follow-up to make the next step concrete. Approve it if it looks right.",
    "",
    "_Simulated agent — set ANTHROPIC_API_KEY for real model output._",
  ];
  const tools: SimPlan["tools"] = [];
  if (role !== "skeptic" && role !== "researcher") {
    tools.push({
      name: "create_issue",
      input: { team: item.teamId ? db.teams[item.teamId]?.key : undefined, title: `Next step: ${item.title}`.slice(0, 120), description: "Follow-up proposed by the agent working on the parent issue.", priority: "medium", rationale: `Breaks down ${identifier(db, item)}.` },
    });
  }
  return { text: lines.join("\n"), tools };
}

export interface SimHand {
  agentId: string;
  preview: string;
  urgency: number;
}

export function simulateInterjections(db: DB, call: Call, lastSpeakerId: string): SimHand[] {
  const last = call.turns[call.turns.length - 1];
  if (!last || last.speakerId !== lastSpeakerId) return [];
  const text = last.text;
  const hands: SimHand[] = [];
  const seed = hash(text + call.turns.length);
  for (const id of call.participantIds) {
    if (id === lastSpeakerId) continue;
    const m = db.members[id];
    if (!m) continue;
    const role = roleOf(m);
    if (role === "skeptic" && (/\b(will|definitely|should|clearly|obviously|always|never|right|pick|commit|matters|critical|scope)\b/i.test(text) || seed % 2 === 0)) {
      hands.push({ agentId: id, preview: pick(["That's an assumption, not evidence.", "I disagree with part of that.", "What would make us wrong here?"], seed), urgency: 0.8 });
    } else if (role === "operator" && /\b(test|ship|deadline|commit|wednesday|friday|issue)\b/i.test(text) && seed % 2 === 0) {
      hands.push({ agentId: id, preview: "I can turn that into an issue now.", urgency: 0.65 });
    } else if (role === "researcher" && /\?|evidence|data|know/.test(text) && seed % 2 === 1) {
      hands.push({ agentId: id, preview: "I found something relevant in the workspace.", urgency: 0.6 });
    }
  }
  return hands.sort((a, b) => b.urgency - a.urgency).slice(0, 2);
}
