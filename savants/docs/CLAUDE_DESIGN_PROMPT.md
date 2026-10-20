# Claude Design brief: Emeka Savants v1 — savants that own outcomes

> Paste everything below the line into Claude Design. Attach: the Emeka design system
> (`EmekaAITeam/design-system`: `styles.css`, `tokens/`, `assets/logos/`, `assets/fonts/`,
> `components/review/`), and the screenshots of the current build in `docs/design/current/`.

---

## 0. What I want from you

Design the v1 interface of **Emeka Savants**: software where you state a business **outcome**
("increase revenue 20% by 31 December") and a team of AI savants **owns** it. They work out what
has to be true, build a strategy, break it into plays and actions, carry those actions out
through the company's own systems, measure the result against the target, and change course
when it slips. People approve what matters; savants earn autonomy as their record grows.

The current build (screenshots attached) is a task tool: Linear and Notion merged, plus a voice
call with the savants. It works, but it is organised around **issues**, which is the wrong centre
of gravity. v1 is organised around **outcomes**. Issues, pages and calls stay, as the machinery
an outcome uses.

Design it so a founder can open it on Monday morning and know, in ten seconds: are we on track,
what did the savants do since Friday, what are they waiting on me for, and what will they do next.

## 1. The idea in one paragraph

A task agent drafts an email when you ask. A savant team **owns a number**. You give it the
outcome, the deadline, the guardrails and what needs your sign-off. It learns how the business
works (systems, people, history, unwritten rules), proposes a strategy as a tree of drivers and
bets, runs plays that create real work (issues, emails, CRM updates, calls booked, documents
written), watches the metric, writes a postmortem when a bet fails, backtests a better strategy on
history, and asks before it deploys it. Every action is on record. Disagreement between savants is
shown, not hidden: a skeptic who says "this is an assumption, not evidence" is a feature.

Three words for the whole interface: **accountable, legible, earned.**

## 2. What to learn from Hone (reference, not a template)

Hone (Moritz Stephan, ex-Cognition; $60M seed led by Benchmark and Index Ventures) launched
"engines": AI that takes responsibility for an outcome rather than a task. From their launch
video and coverage, the product behaviours worth matching or beating:

- **Setup as a role definition.** The head of a function defines the engine's role: what it owns,
  how success is measured, and what needs sign-off. The engine then **probes for what only the
  team knows** (who to loop in when a strategic account has an open P1).
- **It learns the organisation first.** It works inside the systems with the access granted, fans
  out across them (their example: Salesforce, Snowflake, Gong, Zendesk, Teams, email), maps the
  entities, finds past examples, understands guardrails, and clarifies with the operator before
  assembling memories, agents, evals, routines and code.
- **Experts hone it.** Every correction becomes an eval that has to pass.
- **It earns autonomy.** Week 1: the team approves every action (from Slack). Week 2: it works in
  the background with 80 account managers at once. Week 4: routine work runs on its own and only
  big decisions need sign-off.
- **It owns the outcome, so it can change the method.** After a customer churns it writes a
  postmortem ("support went quiet for two months before renewal"), drafts a new strategy,
  **backtests it on two years of history**, and deploys it.
- **Safety.** Changes to its own tools, code and memory are simulated before they ship; sensitive
  actions need human approval; everything is logged. They report modification-caused issues
  falling from 33% to 5% across 125 internal scenarios (company-reported).
- **Measured by outcomes, not benchmark scores.**

Where Emeka Savants goes further, and the design must make visible:
1. **A team, not a monolith.** Several savants with different roles and models, who disagree in
   the open. The human adjudicates.
2. **You can talk to them.** A live voice call where the savants reason with you about the
   outcome, interrupt-able, with a shared board.
3. **Your systems, your models.** Each savant's model is a choice; the deployment can be private.
4. **Absence is content.** When a savant does not know, it says so in the place the answer would go.

Do not copy Hone's visual language. The visual language is Emeka's (section 4).

## 3. Who uses it

| Person | What they need from the screen |
| --- | --- |
| **Founder / GM** (owner of the outcome) | On track or not, in one glance. What changed. What needs me. Ability to change the target, the guardrails or the strategy. |
| **Function lead** (sales, ops, customer success) | The plays touching their team, the actions queued for their people, and the ability to correct a savant. |
| **Approver** (often on a phone, between meetings) | One card at a time: what will happen, why, evidence, what it costs, can it be undone. Approve, reject, or edit in under 15 seconds. |
| **Operator** (person who set the savants up) | Data sources, permissions, autonomy levels, evals, failures. |
| **Board member / investor** (read-only) | The outcome page as a report: target, trajectory, strategy, decisions taken. |

Laptops at 1440 and 1280 wide, and phones at 390 for approvals and the morning brief.

## 4. Design system: Emeka (fixed, do not reinterpret)

Use the attached Emeka design system as the only source of tokens and components. The rules
most easily got wrong:

1. **Geist Mono means a machine said it**: labels, states, identifiers, figures, timestamps,
   metric values. Geist sans means a person reads it. 9–10px mono labels, uppercase, tracked
   +0.14em, in `--ink-3`, are the signature.
2. **Signal colour is a claim about evidence, never emphasis.** `--accent` (#00708F light,
   #19D1FF dark) is the savants' voice and selection. `--ok` = approved / on track.
   `--warn` = at risk / soft basis. `--bad` = blocking / refused / off track. `--line-2` = closed.
3. **No shadows. One radius: 4px. Status markers are 2px, near-square, never circles.** Depth is a
   surface step (`--bg` white well inside `--surface` #F4F6F7 chrome) plus a 1px rule.
4. **Absence is content.** Never an empty field: "No baseline yet. Revenue for Q3 is not in a
   connected system."
5. **Two voices never blur.** Deterministic (what the data says, flat, machine-flavoured) and
   advisory (what a savant proposes, reasoned, reversible) are always visually separate. Use
   `ProposalCard`, `ProvenanceChain`, `EvidenceList`, `ModelStamp`, `EscalationNotice`,
   `AuditTrail`, `DiffView` from `components/review/`.

Light theme is canonical, dark is the mirror; deliver both. The brand gradient (cyan #23C2FF →
mint #A4FDCB) is allowed in at most one place (the sign-in panel), never as a fill in product
views. No emoji, no illustration, no glassmorphism, no blur, no Title Case, no exclamation marks.
Motion only reports state: entrances fade with a 6px rise; indeterminate progress is a 1.5s
accent sweep along a 1px rule (no spinners); live states blink to 0.15 opacity on a 2.4s loop.
Forecasts and unconfirmed values use a dashed 1px `--line-2`. WCAG 2.2 AA in both themes.

Copy voice: exact, understated, slightly severe. No first person in system copy (savants speaking
in a call or a proposal may use it). Buttons are one word where possible: Approve · Reject ·
Edit · Ask · Pause · Resume · Deploy · Undo.

## 5. The object model the UI must make legible

```
OUTCOME            "Sign 3 paid pilots worth $60,000 by 2026-12-31"
 ├─ metric, baseline, target, deadline, guardrails, sign-off rules, budget
 ├─ STRATEGY       a tree of DRIVERS (e.g. pipeline = contacts × reply rate × call rate × close rate)
 │   └─ BETS       hypotheses with expected effect and evidence ("gold producers in Ghana reply
 │                 more to a cost-of-downtime angle than to quoting")
 │       └─ PLAYS  repeatable programmes that test a bet ("sequence 2,000 contacts from 4 warmed domains")
 │           └─ ACTIONS   real changes in real systems: send, create, update, book, write, post
 ├─ SAVANTS        who owns which part (lead, skeptic, operator, researcher; each with model + autonomy)
 ├─ DECISIONS      everything that needed a human, and what the human said
 ├─ EVIDENCE       metric history, experiment results, call transcripts, documents
 ├─ EVALS          corrections turned into tests the savants must keep passing
 └─ LEDGER         every action, actor, time, system, cost, reversibility
```

Issues and pages (the Linear × Notion layer) are where actions that need people live. Calls are
where humans and savants reason together. Neither is the home screen any more.

## 6. Screens, in build order

Design each with real content from section 7, all states listed, both themes.

### 6.1 Outcome intake — "Set an outcome" (design first)
A guided page, not a chat window. Left: the structured outcome as it forms (metric, baseline,
target, deadline, scope, guardrails, budget, sign-off rules, savants assigned). Right: the
savants' **questions**, one at a time, the way a new senior hire would ask ("Which revenue counts:
signed pilots or cash received?", "Is anyone off-limits for outreach?", "Who approves pricing
below $15,000?"). Each answer visibly fills a field on the left. Data sources the outcome needs
appear with connected / missing state; a missing source is stated as absence, with what follows
from it. Ends with "Draft strategy", not "Done".
States: blank; half-complete; a savant pushing back on an unrealistic target (with the arithmetic);
missing data source; ready.

### 6.2 Outcome room — the home screen
One outcome per page. Top: the outcome sentence, target, deadline, days left, owner, savants.
Then the **trajectory**: actual metric (solid), target line, savants' forecast with a dashed band,
markers where strategy changed. Then four blocks, in this order:
1. **Waiting on you**: decisions, each a compact ProposalCard with Approve / Reject / Open.
2. **Since you last looked**: what the savants did, grouped by play, with counts and the one
   result that matters ("212 emails sent · 9 replies · 2 calls booked").
3. **Strategy at a glance**: drivers with current value vs required value, the weakest driver marked.
4. **Next 7 days**: what the savants plan to do, and what will need sign-off.
Right rail: risks and open disagreements between savants (Vera's dissent is visible here).
States: on track; at risk; off track with a postmortem waiting; paused by a human; data stale
(a source disconnected two days ago, stated plainly); first week (everything needs approval).

### 6.3 Strategy map
The driver tree from outcome → drivers → bets → plays, as a calm left-to-right tree or indented
outline (not a node-graph toy). Each node: current vs required value, evidence count, owner savant,
status. Selecting a node opens its detail on the right: the bet, the evidence for and against,
the plays testing it, and **counterfactual / backtest** results ("Applied to Jan–Sep history, this
play would have produced 4 calls, range 2–7"). Edits to the strategy are proposals with a DiffView.

### 6.4 Play detail
A play as a running programme: goal, audience, steps, systems touched, cadence, autonomy level,
budget used, results over time, sample actions (e.g. three of the actual emails sent), and the
eval checks it must pass. Controls: Pause, Resume, Change autonomy, Ask the savants.

### 6.5 Decision queue (approvals)
The human gate. Full-page queue plus the **phone card**. Each decision: what will happen, in
which system, to whom; the deterministic facts vs the savant's proposal (two voices); evidence;
cost; reversible or not (irreversible actions are marked and cannot be batch-approved); who
else on the team agrees or dissents. Approve / Reject / Edit-then-approve. When a human rejects or
edits, the savant asks one short question ("What should I have done instead?") and the answer is
offered as a new **eval**. Batch approval for routine, reversible items.

### 6.6 Autonomy and guardrails
Per outcome and per savant: an **autonomy ladder** (Ask every time → Routine on its own → Only big
decisions need sign-off) with the record that justifies each step (approved 47, rejected 2,
corrected 5, evals passing 31/31). Guardrails: spend limit, systems and action types allowed,
people and accounts off-limits, quiet hours. Show what would change if autonomy is raised:
"Last 30 days, 41 of 49 approvals would no longer have needed you."

### 6.7 Evals ("how the savants were honed")
Corrections turned into tests: the original situation, what the savant did, what the human said,
the rule it now follows, pass history. A failing eval blocks a deploy and says so.

### 6.8 Postmortem and strategy revision
Triggered when a driver slips. What happened (timeline), why (evidence), what the savants propose
instead, backtest of the new approach on history, the skeptic's view, and Deploy / Reject.
Written like an incident review, not a chat.

### 6.9 Ledger
Every action: time (24h, seconds), savant, system, object, effect, cost, reversible, linked
decision. Filters and an export. This is the audit trail investors and enterprise buyers will ask for.

### 6.10 The call (redesign of the existing voice room)
Keep what works (attached screenshot): dark room, each savant drawn as a radial signal meter in
its identity colour, live captions, interruptible speech, raised hands, reasoning board. Make it
**outcome-aware**: the outcome's live trajectory and the driver under discussion are pinned in
the room; savants can put a chart, a play or a decision on screen; decisions taken on the call
land in the decision queue and the ledger. Design the call summary page too.

### 6.11 Savant profile
Role, model, what it owns, autonomy per outcome, track record, evals, recent actions, persona,
voice. Agents are colleagues: write it like a team page, not a settings form.

### 6.12 Morning brief
The 7:00 email and phone view: per outcome, one line of status, three things that happened,
decisions waiting, one risk. Also as an A4 print for a board pack.

### 6.13 Workspace layer (keep, demote)
Issues, projects and pages from v0 remain for work that people do. Show how a play creates an
issue ("Created by Forge for play P-3 · outcome O-1") and how a page becomes evidence. Redesign
only the issue row and page header to carry that provenance.

### 6.14 Sources and integrations
What each savant can read and write, per system (GitHub, Slack, HubSpot, Salesforce, Gmail,
Google Sheets, Notion, Linear, and the rest of the catalog with their real brand logos on a
white tile). Live vs simulated. Last sync and staleness. Permissions as a matrix.

Plus a **component gallery** of every new component (TrajectoryChart, DriverRow, BetCard,
PlayRow, DecisionCard, AutonomyLadder, EvalRow, LedgerRow, OutcomeHeader, SavantChip).

## 7. Real content to design with

Use these, not lorem ipsum. The company is Emeka (industrial AI, Lagos), two founders, applying
to YC and a16z Speedrun this month.

**Outcome O-1 (Emeka itself).** "Sign 3 paid pilots worth $60,000 by 2026-12-31."
Baseline 2026-10-20: $0 signed, 0 pilots. 72 days left.
Drivers: contacts reached → replies → discovery calls → pilot proposals → signed.
Required vs current: contacts 6,000 / 100; reply rate 3% / 0%; calls 18 / 0; proposals 6 / 0;
signed 3 / 0. Weakest driver: reply rate (100 emails sent in September, read, zero replies).
Bets:
- B-1 Mid-tier gold producers in Ghana feel downtime cost more than quoting pain. Evidence: one
  research page, no customer conversations yet. Vera: "This is an assumption, not evidence."
- B-2 Flower growers and exporters in Kenya need cold-chain visibility. Evidence: thin.
- B-3 Warmed sending domains lift reply rate above 2%. Evidence: industry norms only.
Plays: P-1 warm 4 domains (Forge, running, day 9 of 14); P-2 sequence 2,000 Ghana gold contacts
(Forge, awaiting approval of copy); P-3 founder-led calls from replies (Atlas, waiting on P-2);
P-4 research Kenya flower exporters' top 3 operational pains (Scout, running).
Decisions waiting: approve email copy v2 for P-2 (2,000 recipients, irreversible once sent);
approve $180/month for two more sending domains; Vera's dissent on B-1 needs a founder answer.
Since Friday: 4 domains warming (health 92%), 1,214 contacts verified, 3 bounced lists removed,
research page "Ghana gold: who owns maintenance budget" written.

**Outcome O-2 (a customer, to show the enterprise case).** "Increase revenue 20% by 2026-12-31"
for a Lagos manufacturer of industrial fasteners (₦4.1bn revenue in 2025).
Drivers: quote turnaround (4.2 days → 1 day), win rate (18% → 24%), repeat orders from top 40
accounts, price realisation after the naira move. Plays: auto-quote standard RFQs; re-engage 40
dormant accounts; reprice 312 SKUs below margin floor. Approvals from the commercial director on
any discount above 8%. Systems: SAP Business One, Gmail, WhatsApp Business, a pricing sheet.
Show it 6 weeks in: on track for revenue, off track on win rate, with a postmortem waiting.

**Savants.** Atlas (lead strategist, #00708F), Vera (skeptic, #94465F), Forge (operator,
#8A5300), Scout (researcher, #0F7A50). Founders: Erioluwa Morenikeji and a co-founder.

## 8. Behaviour the design must show

- **Narrated progress, not spinners**: "Scout is reading 1,214 company profiles · 640 done".
- **Evidence on every claim**: every number links to where it came from; every proposal shows its
  sources (ProvenanceChain).
- **Disagreement is visible**: a dissenting savant's view sits beside the proposal, not in a log.
- **Abstention is first-class**: "Nothing. Abstained. The data cannot separate B-1 from B-2 yet;
  two discovery calls would."
- **Irreversible means irreversible**: sending, paying and contacting people are marked, never
  batch-approved, and say exactly what cannot be undone.
- **Simulate before act**: strategy changes and new plays show a backtest or dry run first.
- **Keyboard path** on desktop (J/K through decisions, A approve, R reject, E edit, ⌘K anything).
- **Staleness is stated**: every metric shows its last update and source.

## 9. Avoid

A chat window as the primary interface; sparkle or magic-wand icons; "AI" badges; confidence
percentages driving decisions; vanity KPI tiles; progress rings; robot imagery; shadows;
gradients; emoji; celebratory copy; dashboards that show activity instead of the outcome.

## 10. Deliverables

1. Screens 6.1–6.14 in light and dark at 1440 and 1280; 6.2, 6.5 and 6.12 also at 390.
2. The listed states for each screen, including failure and empty states.
3. A clickable prototype of the core loop: set outcome → strategy drafted → approve first plays →
   one week later the outcome room → a decision on the phone → a postmortem → deploy revised play.
4. The component gallery.
5. One paragraph of rationale per screen: what decision it supports and why the layout serves it.
6. Any deviation from the Emeka tokens raised as a question, not made silently.
7. A short list of the questions you would ask the founders before building v2.
