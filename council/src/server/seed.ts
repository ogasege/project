import { emptyDB } from "@/lib/ops";
import { markdownToBlocks } from "@/lib/markdown";
import { DEFAULT_STATES } from "@/lib/workspace";
import type { AgentConfig, DB, Item, Member, Priority } from "@/lib/types";

const DEFAULT_MODEL = process.env.COUNCIL_DEFAULT_MODEL || "claude-opus-5-5";

function agent(
  id: string,
  name: string,
  color: string,
  avatar: string,
  cfg: Omit<AgentConfig, "model" | "stats" | "tools"> & { tools?: string[] },
  now: number,
): Member {
  return {
    id,
    kind: "agent",
    name,
    handle: name.toLowerCase(),
    color,
    avatar,
    createdAt: now,
    agent: {
      model: DEFAULT_MODEL,
      stats: { proposed: 0, approved: 0, rejected: 0 },
      tools: cfg.tools ?? ["search_workspace", "read_item", "pin_note", "create_issue", "update_issue", "create_page", "append_to_item", "comment", "list_integrations"],
      ...cfg,
    },
  };
}

export function seedDB(): DB {
  const now = Date.now();
  const day = 86_400_000;
  const db = emptyDB();
  const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString().slice(0, 10);

  db.settings = { workspaceName: "Council", currentUserId: "u_erioluwa", theme: "dark", states: DEFAULT_STATES };

  const members: Member[] = [
    { id: "u_erioluwa", kind: "human", name: "Erioluwa Morenikeji", handle: "erioluwa", color: "#5e6ad2", email: "", createdAt: now },
    { id: "u_cofounder", kind: "human", name: "Co-founder", handle: "cofounder", color: "#26b5ce", createdAt: now },
    agent("a_atlas", "Atlas", "#8b5cf6", "◆", {
      role: "Lead strategist",
      lead: true,
      persona:
        "You are Atlas, the council's lead. You synthesize, frame the decision, and keep the conversation moving toward a concrete next step. You summarize disagreement fairly and name the decision that has to be made.",
      voice: { pitch: 0.95, rate: 1.05 },
      autonomy: "low-risk",
    }, now),
    agent("a_vera", "Vera", "#f43f5e", "▲", {
      role: "Skeptic",
      persona:
        "You are Vera, the council's skeptic. You red-team every claim, look for the wrong vector that compounds over a long horizon, and ask for evidence. You are direct but constructive: every objection comes with what would change your mind.",
      voice: { pitch: 1.15, rate: 1.0 },
      autonomy: "ask",
    }, now),
    agent("a_forge", "Forge", "#f59e0b", "■", {
      role: "Operator",
      persona:
        "You are Forge, the council's operator. You turn talk into issues with owners, dates and acceptance criteria. You care about sequencing and what ships this week. When the group converges, you propose the issues.",
      voice: { pitch: 0.8, rate: 1.1 },
      autonomy: "low-risk",
    }, now),
    agent("a_scout", "Scout", "#10b981", "●", {
      role: "Researcher",
      persona:
        "You are Scout, the council's researcher. You ground the conversation in what the workspace and connected apps actually say. You cite pages and issues by name and flag when something is assumed rather than known.",
      voice: { pitch: 1.05, rate: 1.08 },
      autonomy: "low-risk",
    }, now),
  ];
  for (const m of members) db.members[m.id] = m;

  db.teams = {
    t_eng: { id: "t_eng", key: "ENG", name: "Engineering", icon: "⚙", color: "#5e6ad2", nextNumber: 1 },
    t_gtm: { id: "t_gtm", key: "GTM", name: "Go-to-market", icon: "↗", color: "#26b5ce", nextNumber: 1 },
    t_ops: { id: "t_ops", key: "OPS", name: "Operations", icon: "◎", color: "#4cb782", nextNumber: 1 },
  };

  db.labels = {
    l_app: { id: "l_app", name: "Application", color: "#5e6ad2" },
    l_valid: { id: "l_valid", name: "Validation", color: "#f2994a" },
    l_proto: { id: "l_proto", name: "Prototype", color: "#bb87fc" },
    l_brand: { id: "l_brand", name: "Brand", color: "#26b5ce" },
    l_legal: { id: "l_legal", name: "Legal", color: "#eb5757" },
    l_infra: { id: "l_infra", name: "Infra", color: "#4cb782" },
  };

  db.projects = {
    p_yc: { id: "p_yc", name: "YC application", icon: "Y", color: "#f97316", description: "Application, founder video, and profiles. YC closes Nov 2; target submit Wednesday.", status: "started", leadId: "u_erioluwa", teamIds: ["t_gtm", "t_eng"], targetDate: iso(2), createdAt: now },
    p_speedrun: { id: "p_speedrun", name: "a16z Speedrun application", icon: "⚡", color: "#eab308", description: "Pitch deck + application. Closes Nov 1.", status: "started", leadId: "u_erioluwa", teamIds: ["t_gtm"], targetDate: iso(2), createdAt: now },
    p_proto: { id: "p_proto", name: "Council prototype", icon: "◆", color: "#8b5cf6", description: "The foundation: Linear × Notion workspace where agents co-create, plus the voice call interface.", status: "started", leadId: "u_cofounder", teamIds: ["t_eng"], targetDate: iso(7), createdAt: now },
    p_gold: { id: "p_gold", name: "Validation: mid-tier gold producers (Ghana)", icon: "Au", color: "#d4a017", description: "First vertical hypothesis. Cold emails → calls → signed LOI.", status: "planned", leadId: "u_erioluwa", teamIds: ["t_gtm"], targetDate: iso(21), createdAt: now },
    p_flower: { id: "p_flower", name: "Validation: flower growers & exporters (Kenya)", icon: "✿", color: "#ec4899", description: "Second vertical hypothesis.", status: "planned", leadId: null, teamIds: ["t_gtm"], targetDate: iso(28), createdAt: now },
    p_cold: { id: "p_cold", name: "Validation: cold chain", icon: "❄", color: "#38bdf8", description: "Third vertical hypothesis.", status: "planned", leadId: null, teamIds: ["t_gtm"], targetDate: iso(28), createdAt: now },
  };

  db.cycles = {
    c_eng_1: { id: "c_eng_1", teamId: "t_eng", number: 1, name: "Application sprint", startsAt: iso(-1), endsAt: iso(6) },
    c_gtm_1: { id: "c_gtm_1", teamId: "t_gtm", number: 1, name: "Application sprint", startsAt: iso(-1), endsAt: iso(6) },
    c_ops_1: { id: "c_ops_1", teamId: "t_ops", number: 1, startsAt: iso(-1), endsAt: iso(13) },
  };

  // Pages
  const page = (id: string, title: string, icon: string, md: string, parentId: string | null = null, order = 0): Item => ({
    id, kind: "page", title, icon, parentId, blocks: markdownToBlocks(md), createdBy: "u_erioluwa", createdAt: now - order * 1000, updatedAt: now, sortOrder: order,
  });

  const pagesList: Item[] = [
    page("pg_home", "Company home", "🏛", `# Where we are
We left Antler with a sharper thesis and a clear lesson: **speed is the whole game**.
> [!note] This workspace is the prototype. We are building the thing we use to build the company.
## This week
- [ ] Submit Speedrun (closes Nov 1)
- [ ] Submit YC (closes Nov 2) — target Wednesday
- [ ] Record the founder video
- [ ] Validate one vertical with real calls, not opinions
## Principles
- Ship in hours, not weeks
- Every consequential action passes a human gate
- Every decision is on record`, null, 0),
    page("pg_retro", "Antler retrospective", "🔁", `# What we went in with
An AI workforce for manufacturing, starting with quotation. It became "intelligence for the companies that run the physical world".
# What we learned
## 1. Quoting is crowded
About half of the quotation prospects already had AI quoting (Paperless Parts and others). 100 cold emails, read, zero replies.
## 2. The target solution was too broad
"Connect the systems you already use; every agent works from one context." Partners said it was too broad. Enterprise pricing ($20K floor) confused people.
## 3. Hard questions we did not answer well
- Pricing: how do you justify $20K when the customer underpays its own technicians?
- Incumbents: Microsoft Dynamics, Oracle and SAP are all building agents. Why would anyone pay us?
## 4. We were not fast enough
Validation should have started in week one. Iteration cycles that took weeks need to take hours.
# What we gained
Perks, a refined position, and a much better understanding of what we should be good at.`, null, 1),
    page("pg_direction", "New direction: a council of agents", "◆", `# The thesis
Task agents draft emails. **Engines own outcomes.** We are building agents with persistent memory that take initiative and plan, inside a multiplayer workspace where humans and agents co-create.
## The foundation
Reverse-engineer Linear and Notion into one workspace. Issues are pages with properties. Agents are members you can assign work to and get on a call with.
## The interface
A voice call with a council of models: they reason out loud, disagree, raise their hands, pin notes to a shared board, and propose actions that pass through a human gate.
## Technical frontier
- Long-horizon context and reasoning: errors compound when a wrong vector is not caught
- Self-modifying harnesses
- Long-horizon credit assignment and counterfactual replay
- Model selection by evals, per task
## Verticals to validate
1. Mid-tier gold producers (Ghana)
2. Flower growers and exporters (Kenya)
3. Cold chain`, null, 2),
    page("pg_why_council", "Why a council and not one superintelligence?", "⚖", `# The question
Anil-style objection: why have a council at all? Why not one model that does everything?
# Working answers
- **Disagreement surfaces wrong vectors early.** One wrong value in one contract is unaffordable; a skeptic with a different prior catches it before it compounds.
- **Different models are best at different tasks.** Model selection by evals per role, not one model for everything.
- **Sovereignty.** Enterprises want model choice and control of their data. A council can run on any mix of models.
- **Legibility.** Humans can follow and adjudicate an argument. They cannot audit a monologue.
# Open
- [ ] Find evidence (papers, evals) that debate/ensembles beat a single model on long-horizon tasks
- [ ] Decide how to say this in one sentence on the YC form`, "pg_direction", 0),
    page("pg_screenplay", "Founder video screenplay", "🎬", `# Founder video (1 minute)
## Beat 1 — who we are (10s)
Both founders on camera. Names, what we have built before.
## Beat 2 — the insight (20s)
Agents can do the work now. Deployment is the bottleneck. Companies need a place where agents and people work together on real outcomes.
## Beat 3 — demo (20s)
Open Council. Start a call. Ask the council about a vertical. Vera pushes back, Forge proposes issues, we approve.
## Beat 4 — why us, why now (10s)
## Logistics
- [ ] Borrow a mic
- [ ] Ring light
- [ ] Record by Tuesday`, "pg_home", 1),
    page("pg_profiles", "Founder profiles checklist", "🪪", `# What accelerators look at
Quality of the founders and whether they can execute.
## For each founder
- [ ] LinkedIn up to date
- [ ] X / Twitter account recovered and active
- [ ] GitHub cleaned up with this prototype pinned
- [ ] Personal site (one page)
## YC form fields
- Most impressive thing you have built or achieved
- A time you hacked a non-computer system to your advantage
- Things you have built before (with URLs)`, "pg_home", 2),
    page("pg_gtm", "Validation playbook", "📨", `# How validation actually works
Build a contact list, email at volume, book calls, try to get something signed.
## Volume
100 emails is not a signal. The goal is thousands, sent from multiple warmed domains, batched so we do not get flagged as spam.
## Automate it
- [ ] Agents draft and send sequences per vertical
- [ ] Track replies and book calls automatically
## Contact sheets
~13,000 Nigerian industrial contacts already compiled (GTM 2 & 3 sheets).`, null, 3),
  ];
  for (const p of pagesList) db.items[p.id] = p;

  // Issues
  let order = 0;
  const issue = (
    teamId: string,
    title: string,
    opts: { state?: string; priority?: Priority; assignee?: string | null; labels?: string[]; project?: string | null; cycle?: string | null; md?: string; due?: number; estimate?: number },
  ) => {
    const team = db.teams[teamId];
    const id = `is_${team.key.toLowerCase()}_${team.nextNumber}`;
    const it: Item = {
      id,
      kind: "issue",
      title,
      teamId,
      number: team.nextNumber++,
      stateId: opts.state ?? "st_todo",
      priority: opts.priority ?? 0,
      assigneeId: opts.assignee ?? null,
      labelIds: opts.labels ?? [],
      projectId: opts.project ?? null,
      cycleId: opts.cycle ?? null,
      estimate: opts.estimate ?? null,
      dueDate: opts.due !== undefined ? iso(opts.due) : null,
      blocks: markdownToBlocks(opts.md ?? ""),
      createdBy: "u_erioluwa",
      createdAt: now - (100 - order) * 60_000,
      updatedAt: now - (100 - order) * 60_000,
      sortOrder: order++,
    };
    db.items[id] = it;
    return it;
  };

  issue("t_gtm", "Submit a16z Speedrun application", { state: "st_progress", priority: 1, assignee: "u_erioluwa", labels: ["l_app"], project: "p_speedrun", cycle: "c_gtm_1", due: 1, md: "Closes Nov 1. Needs the pitch deck and team section." });
  issue("t_gtm", "Submit YC application (target Wednesday)", { state: "st_progress", priority: 1, assignee: "u_erioluwa", labels: ["l_app"], project: "p_yc", cycle: "c_gtm_1", due: 2, md: "YC closes Nov 2. Apply early; every extra day costs money." });
  issue("t_gtm", "Write the founder video screenplay", { state: "st_review", priority: 2, assignee: "a_atlas", labels: ["l_app"], project: "p_yc", cycle: "c_gtm_1", md: "Draft lives in the *Founder video screenplay* page." });
  issue("t_ops", "Borrow a mic and ring light for the founder video", { state: "st_todo", priority: 2, assignee: "u_cofounder", project: "p_yc", cycle: "c_ops_1", due: 1 });
  issue("t_gtm", "Build the Speedrun pitch deck", { state: "st_todo", priority: 1, assignee: "u_erioluwa", labels: ["l_app"], project: "p_speedrun", cycle: "c_gtm_1", estimate: 3 });
  issue("t_gtm", "Refresh founder profiles (LinkedIn, X, GitHub, personal site)", { state: "st_todo", priority: 2, assignee: "u_cofounder", labels: ["l_brand"], project: "p_yc", cycle: "c_gtm_1" });
  issue("t_ops", "Incorporate with the Nigerian CAC", { state: "st_backlog", priority: 3, assignee: "u_erioluwa", labels: ["l_legal"] });
  issue("t_ops", "Renew GitHub subscription", { state: "st_done", priority: 3, assignee: "u_erioluwa", labels: ["l_infra"] });
  issue("t_ops", "Decide on Slack plan before promo ends (7 days)", { state: "st_todo", priority: 4, assignee: "u_cofounder", labels: ["l_infra"], due: 5 });
  issue("t_gtm", "Automate cold email sequences with agents", { state: "st_todo", priority: 2, assignee: "a_forge", labels: ["l_valid"], project: "p_gold", md: "Multiple warmed domains, batched sends, reply tracking. Start with the gold-mining list." });
  issue("t_gtm", "Build contact list: mid-tier gold producers in Ghana", { state: "st_todo", priority: 2, assignee: "a_scout", labels: ["l_valid"], project: "p_gold" });
  issue("t_gtm", "Validate the gold-mining thesis with 10 calls", { state: "st_backlog", priority: 2, assignee: "u_erioluwa", labels: ["l_valid"], project: "p_gold" });
  issue("t_gtm", "Research: flower exporters' biggest operational pain", { state: "st_backlog", priority: 3, assignee: "a_scout", labels: ["l_valid"], project: "p_flower" });
  issue("t_gtm", "Research: cold chain competitive landscape", { state: "st_backlog", priority: 3, assignee: "a_scout", labels: ["l_valid"], project: "p_cold" });
  issue("t_gtm", "Decide how much the website reveals vs conceals", { state: "st_todo", priority: 3, assignee: "u_erioluwa", labels: ["l_brand"], md: "Prospects will visit the site from outbound. Options: update copy, or drop the site from outbound for now." });
  issue("t_eng", "Unified workspace foundation (Linear × Notion)", { state: "st_progress", priority: 1, assignee: "u_cofounder", labels: ["l_proto"], project: "p_proto", cycle: "c_eng_1" });
  issue("t_eng", "Voice call interface with the council", { state: "st_progress", priority: 1, assignee: "a_forge", labels: ["l_proto"], project: "p_proto", cycle: "c_eng_1" });
  issue("t_eng", "Integration catalog: union of Linear + Notion integrations", { state: "st_todo", priority: 2, assignee: "a_scout", labels: ["l_proto"], project: "p_proto", cycle: "c_eng_1" });
  issue("t_eng", "Evals from corrections (every rejection becomes a test)", { state: "st_backlog", priority: 3, labels: ["l_proto"], project: "p_proto" });
  issue("t_eng", "Answer: why a council and not one superintelligence?", { state: "st_todo", priority: 2, assignee: "a_vera", labels: ["l_app"], project: "p_yc", md: "See the page *Why a council and not one superintelligence?*" });

  db.activity = {
    act_seed: { id: "act_seed", actorId: "u_erioluwa", verb: "created the workspace", createdAt: now - 3600_000 },
  };

  db.integrations = {
    mcp: { id: "mcp", appId: "council-mcp", status: "connected", mode: "live", config: {}, connectedBy: "u_erioluwa", connectedAt: now },
  };

  return db;
}
