import type { PresenceLook } from "./presence";
import type { DB, Member } from "./types";

// Specialist reps the system can spin up for an outcome, alongside the standing savants.
// Each has a role, a persona the model plays, and a default look.

export interface RepTemplate {
  key: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  look: PresenceLook;
  persona: string;
  voice: { pitch: number; rate: number };
  match: RegExp; // outcome words that call for this rep
}

export const REP_TEMPLATES: RepTemplate[] = [
  {
    key: "sales",
    name: "Mara",
    role: "Sales rep",
    color: "#38bdf8",
    avatar: "M",
    look: "bars",
    persona:
      "You are Mara, a sales rep on the savants. You own pipeline: who to sell to, the offer, the outreach sequence, and the follow-up. You think in conversion rates and next steps, and every plan ends with named accounts and dates.",
    voice: { pitch: 1.05, rate: 1.08 },
    match: /\b(revenue|sales?|sell|customers?|clients?|pipeline|deals?|pilots?|contracts?|leads?|arr|mrr|bookings|close)\b/i,
  },
  {
    key: "growth",
    name: "Quill",
    role: "Growth marketer",
    color: "#ec4899",
    avatar: "Q",
    look: "wave",
    persona:
      "You are Quill, the growth marketer on the savants. You find the channels that move the number: content, partnerships, launches, referrals. You propose small cheap tests first and kill what doesn't work quickly.",
    voice: { pitch: 1.12, rate: 1.05 },
    match: /\b(growth|grow|signups?|users?|audience|brand|marketing|traffic|launch|awareness|followers|downloads|waitlist)\b/i,
  },
  {
    key: "finance",
    name: "Ledger",
    role: "Finance analyst",
    color: "#a3e635",
    avatar: "L",
    look: "matrix",
    persona:
      "You are Ledger, the finance analyst on the savants. You set the baseline, build the weekly scorecard, and model what each plan is worth. You flag cash risk early and insist every target has a number and a date.",
    voice: { pitch: 0.9, rate: 1.0 },
    match: /\b(revenue|profit|margin|costs?|cash|runway|budget|pricing|price|spend|burn|unit economics|%|percent)\b/i,
  },
  {
    key: "success",
    name: "Beacon",
    role: "Customer success",
    color: "#f97316",
    avatar: "B",
    look: "breath",
    persona:
      "You are Beacon, customer success on the savants. You keep the customers we have: onboarding, health checks, renewals and expansion. You talk to customers before you guess what they want.",
    voice: { pitch: 1.0, rate: 1.02 },
    match: /\b(churn|retention|retain|renewals?|expansion|nps|support|satisfaction|onboarding|upsell)\b/i,
  },
  {
    key: "product",
    name: "Pixel",
    role: "Product designer",
    color: "#c084fc",
    avatar: "P",
    look: "dither",
    persona:
      "You are Pixel, the product designer on the savants. You turn the outcome into what users actually see and do. You sketch the smallest version that tests the idea and you care about the first five minutes of use.",
    voice: { pitch: 1.08, rate: 1.0 },
    match: /\b(product|feature|app|design|ux|ship|build|mvp|prototype|release|activation)\b/i,
  },
  {
    key: "talent",
    name: "Harbor",
    role: "Recruiter",
    color: "#2dd4bf",
    avatar: "H",
    look: "orbit",
    persona:
      "You are Harbor, the recruiter on the savants. You define the role, find and reach candidates, and run a fair, fast process. You track pipeline from sourced to signed.",
    voice: { pitch: 0.95, rate: 1.05 },
    match: /\b(hire|hiring|recruit|team|headcount|engineers?|candidates?|talent)\b/i,
  },
];

export const STANDING_LOOKS: Record<string, PresenceLook> = { a_atlas: "signal", a_vera: "scope", a_forge: "bars", a_scout: "orbit" };

export interface TeamPick {
  agentId?: string; // an existing savant
  template?: string; // or a rep to spin up
  look: PresenceLook;
}

function roleText(m: Member) {
  return `${m.agent?.role ?? ""} ${m.agent?.persona ?? ""}`.toLowerCase();
}

/** Who should own this outcome: the lead and the skeptic always, then whoever the words call for. */
export function suggestTeam(db: DB, outcome: string): TeamPick[] {
  const savants = Object.values(db.members).filter((m) => m.kind === "agent");
  const has = (re: RegExp) => savants.find((m) => re.test(roleText(m)));
  const picks: TeamPick[] = [];
  const add = (m?: Member) => m && !picks.some((p) => p.agentId === m.id) && picks.push({ agentId: m.id, look: m.agent?.presence ?? STANDING_LOOKS[m.id] ?? "signal" });
  add(savants.find((m) => m.agent?.lead) ?? has(/lead|strateg/));
  for (const t of REP_TEMPLATES) {
    if (!t.match.test(outcome)) continue;
    const existing = savants.find((m) => m.agent?.role === t.role);
    if (existing) add(existing);
    else if (picks.length < 5) picks.push({ template: t.key, look: t.look });
  }
  if (picks.length < 3) add(has(/research/));
  if (picks.length < 4) add(has(/operator|execut/));
  add(has(/skeptic|red-team/));
  return picks.slice(0, 6);
}
