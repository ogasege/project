# Emeka Savants — Build Prompt

> This is the master prompt used to generate this codebase. It is written so that it can be handed,
> unchanged, to a coding agent (or a team of them) to rebuild or extend the product.
> Source material: the Oct 19 "Antler retrospective, new company direction, and accelerator
> applications strategy" meeting, and the founder brief: *"reverse engineer Linear and Notion and
> turn it into a unified app that can integrate with all the apps that both can integrate with, and
> have a very interesting interface that allows for models to communicate with you and reason with
> you like they are on a voice call with you."*

---

## 0. Why this exists (context from the meeting)

The team spent Antler pitching "intelligence for the companies that run the physical world": an
AI workforce for industry that starts with quoting. What they learned:

1. **Quoting is crowded and not exciting.** About half the quotation prospects already had AI
   quoting (Paperless Parts and similar). No replies to 100 cold emails.
2. **The pitch was too broad.** "Connect the systems you already use, every agent works from one
   context" — partners said the target solution was too broad, and enterprise pricing confused
   people.
3. **Speed is the whole game.** They didn't move fast enough on validation or iteration.
4. **The direction that crystallized:** not task-runners ("draft this email"), but **agents with
   persistent memory that take initiative, plan, and own outcomes**, working *inside a multiplayer
   workspace with humans*. Reference points: Notion becoming an AI company ("get better answers
   from your apps"), Glean-style "operating layer / managed graph", and Hone's *engines*: AI that
   learns how the company works, earns autonomy week by week (week 1: approve every action; week 4:
   only big decisions need sign-off), turns every correction into an eval, and is measured by
   outcomes, not benchmarks.
5. **The founders want to be "the user layer"** — define at a high level what things should look
   like and compress time-to-development. The immediate need is a **foundation**: "reverse
   engineer foundations like Linear and Notion — perhaps there's something much better than these
   two — a foundation for a multiplayer workspace where agents co-create and work on, and see,
   problems."
6. **The open question they must answer:** *"Why have several savants? Why not one superintelligence?"*
   This product answers it in the interface itself: different models, with different personas,
   priors and evals, disagree out loud, and the human adjudicates. Disagreement surfaces wrong
   vectors early, before they compound across a long horizon. One wrong value in one contract is
   unaffordable in enterprise.
7. **Non-negotiables carried over from the Antler pitch:** a human gate on every consequential
   action; every decision on record; your cloud, your data, your model policy (bring any model);
   usage you can see.

This prototype is the foundation for the YC / a16z Speedrun applications: something real, not
slideware, demonstrable in a founder video.

---

## 0.5 Step zero: reverse-engineer the originals with REA

Before designing anything, use [REA — Reverse Engineer Anything](https://github.com/morluto/rea)
(`npx rea-agents@latest`) to recover how Linear and Notion actually work from what they ship, and
ground every design decision in that evidence rather than in screenshots or memory:

1. Collect the shipped artifacts: the desktop Electron apps (ASAR) and web bundles when reachable,
   and always the JavaScript both companies publish (`@linear/sdk`, `@notionhq/client`, plus
   `notion-client`/`notion-types` for Notion's private `api/v3` model).
2. Run `analyze-javascript-application` on each target. Keep the Evidence ids and artifact digests.
3. Extract: the entity models and their enums (issue relations, project status and health,
   workflow states, view types), the block and property model, the private-API record loading
   pattern, the integration service list, and anything describing how agents work inside the
   product.
4. Write the findings, with evidence ids, to `docs/REVERSE_ENGINEERING.md`, and state which
   findings shaped the build and which are roadmap.
5. Treat REA output as derived evidence about shipped code: report its unknowns and limits, and
   don't claim runtime behaviour it didn't observe.

## 1. Product in one sentence

**Savants is Linear and Notion merged into one multiplayer workspace where AI models are teammates
you can assign work to, and get on a live voice call with, to reason through problems together.**

## 2. The core insight that unifies Linear and Notion

Reverse-engineered, both products are the same thing at different levels of structure:

| Notion | Linear | Savants (unified) |
|---|---|---|
| Page = tree of blocks | Issue = title + markdown description + properties | **Item** = title + block tree + typed properties |
| Database = pages with a schema | Team = issues with a fixed schema (status, priority, assignee, labels, cycle, project, estimate) | An issue *is* a page whose `kind` is `issue`. A page can be promoted to an issue and back. |
| Database views (table, board, list, calendar) | Views (list grouped by status, board, filters, display options) | Views are saved queries over items |
| Sidebar page tree, nested pages | Teams → Issues / Cycles / Projects | One sidebar: Inbox, My work, Teams, Projects, Pages tree, Call, Agents, Integrations |
| `/` slash commands, inline mentions | `Cmd+K` command menu, single-key shortcuts (`C`, `G I`…) | Both: `/` inside documents, `Cmd+K` everywhere, single-key shortcuts outside text inputs |
| Comments, mentions, page history | Activity feed, triage, inbox | Unified activity log (also the audit trail) |
| Connections / AI connectors | Integrations (GitHub, Slack, Sentry, Zendesk…) | One integration catalog = the **union** of both, plus an MCP server so any agent tool can plug in |
| Notion AI | Linear agents (Cursor, Devin, Codegen assignable as users) | **Agents are first-class members**: assignable, mentionable, with autonomy levels — and you can *call* them |

Everything is an **operation** on a shared document store (`insert`, `update`, `delete` on a
collection). Operations are applied by one pure reducer that runs on both client (optimistic) and
server (authoritative), are broadcast to every connected client over SSE (multiplayer), and are
appended to an op log that doubles as the immutable audit trail ("every decision on record").

## 3. The signature interface: The Call

A full-screen, dark, ambient "voice room" where you talk to a **savants** of AI participants as if
you were on a call with colleagues.

- **Participants** render as large living orbs (you + 2–4 agents). An orb breathes when idle, ripples
  with audio level when speaking, shows a thinking shimmer while the model reasons, and shows a
  raised hand when that agent wants to interject.
- **Speech in:** Web Speech API (`SpeechRecognition`), continuous with interim results. Space bar =
  push-to-talk; or open-mic mode. Text input is always available as a fallback.
- **Speech out:** each agent streams its reply; text is chunked into sentences and spoken as soon
  as each sentence completes (`speechSynthesis`, a distinct voice/pitch/rate per agent), so the
  agent starts talking before the model finishes. Live captions render word-by-word.
- **Barge-in:** if you start speaking while an agent is talking, the agent stops mid-sentence (TTS
  cancelled, stream aborted), exactly like interrupting a person.
- **Floor control:** address an agent by name ("Skeptic, what's wrong with that?") to give it the
  floor; otherwise the call's lead agent answers. After every agent turn, the other participants
  run a fast *interjection check* — if one has something important (a disagreement, a risk, a
  missing fact), it raises its hand with a one-line preview. You click the hand (or say "go
  ahead") to give it the floor. This is how the savants reason *with* you instead of at you.
- **Shared reasoning board** (right rail): while they talk, agents pin structured notes —
  *claim, assumption, question, risk, decision, action* — via a tool call. The board is the
  call's working memory and becomes the call summary.
- **Actions with a human gate:** agents can propose workspace changes mid-call (create an issue,
  update status/priority/assignee, write a page, post to an integration). Proposals appear as
  cards with Approve / Reject. Per-agent **autonomy level** decides what needs approval:
  `ask` (everything), `low-risk` (reads + notes + drafts auto, writes need approval), `autonomous`.
  Agents *earn* autonomy: the approval history is shown on the agent's profile.
- **Workspace-grounded:** agents can search and read any page or issue during the call, so you can
  say "pull up the gold-mining validation page and tell me what's weakest about it".
- **When the call ends** a call record is saved as a page: transcript, board notes grouped by
  type, decisions, and links to every issue/page created during the call.

## 4. Feature scope for the prototype

### 4.1 Workspace shell
- Left sidebar: workspace switcher, search (`Cmd+K`), Inbox, My issues, **Start a call** (prominent),
  Teams (each with Issues / Cycles / Projects / Board), Pages tree (nested, drag-free, create child,
  collapse), Agents, Integrations, Approvals (with pending count), Settings.
- Command palette (`Cmd+K`): navigate to anything, create issue/page, start a call with a given
  agent set, switch theme, run actions on the focused issue.
- Keyboard: `C` create issue, `N` new page, `G I` inbox, `G M` my issues, `G P` pages, `G A`
  agents, `G C` call, `/` focus search, `?` shortcut help. Never fire inside inputs/editors.
- Light and dark themes; dark by default. Typography and density in the spirit of Linear
  (Inter, 13px UI, tight rows) with Notion's calm document canvas.

### 4.2 Issues (Linear side)
- Teams with keys (`ENG`, `OPS`, `GTM`) and per-team incrementing identifiers (`ENG-42`).
- Workflow states: Backlog, Todo, In Progress, In Review, Done, Canceled (typed: backlog /
  unstarted / started / completed / canceled) with Linear-style status icons.
- Priority: No priority, Urgent, High, Medium, Low (bar icons). Labels with colors. Estimate.
  Due date. Assignee — human **or agent**. Project. Cycle. Parent/sub-issues.
- List view grouped by status with inline property pickers; Board view (kanban) with drag-and-drop
  between columns; filter by assignee/label/priority/project; display toggles.
- Issue detail: title, rich description (same block editor as pages), properties sidebar,
  activity + comments thread, sub-issues, "Discuss on a call" button (starts a call with the issue
  as context).
- Cycles (time-boxed sprints with progress), Projects (status, lead, target date, progress from
  issues), My issues, Inbox (activity relevant to you, including agent actions awaiting approval).

### 4.3 Pages (Notion side)
- Nested pages with icon + cover color, breadcrumbs.
- Block editor: paragraph, H1/H2/H3, bulleted, numbered, to-do, toggle, quote, callout, code,
  divider, and embeds of issues/pages (`@` mention). `/` slash menu with fuzzy search; Markdown
  shortcuts (`# `, `- `, `[] `, `> `, ``` ``` ```, `---`); Enter splits, Backspace merges, Tab
  indents, arrow keys move between blocks.
- "Ask the savants" on any page: start a call with the page as context.
- Convert page ⇄ issue.

### 4.4 Agents
- Agents are members with: name, role, persona/system prompt, model id, color, voice settings,
  autonomy level, tool permissions, and a track record (actions proposed / approved / rejected).
- Seeded savants: **Atlas** (lead — strategist and synthesizer), **Vera** (skeptic — red-teams
  every claim, hunts for the wrong vector), **Forge** (operator — turns talk into issues, owners,
  dates), **Scout** (researcher — pulls facts from the workspace and connected apps).
- Agents can be assigned issues; an assigned agent can be asked to "work on it" which runs the same
  tool loop outside a call and posts results as comments + proposals.
- Model policy: every agent picks its model. Defaults to the latest Claude models; the provider
  layer is pluggable so other providers can be added (sovereignty/model-choice was a core
  enterprise argument in the pitch).

### 4.5 Integrations — the union of Linear's and Notion's directories
- Catalog of every app either product integrates with, each tagged with source (`Linear`,
  `Notion`, or both), category, auth type, and capabilities (`sync`, `unfurl`, `intake`,
  `notify`, `import`, `embed`, `ai-search`, `automation`, `sso`).
- Search, filter by category and source, connect/disconnect, per-connection config.
- Working connectors in the prototype: **GitHub** (personal access token: list repo issues/PRs,
  create issue), **Slack** (incoming webhook: post messages), **Generic webhook** (outgoing on any
  op), and the **Savants MCP server** at `/api/mcp` — exposes the workspace (search, read, create
  issue, create page, list issues) to *any* MCP client (Claude, Cursor, ChatGPT, etc.), which is
  how Savants integrates with every agent tool without bespoke connectors.
- All other catalog entries connect in "simulated" mode with clear labeling, so the connector
  interface is exercised end-to-end and real implementations drop in later.

### 4.6 Approvals (the human gate)
- Queue of pending agent proposals with diff-style preview, approve / reject / edit-then-approve.
- Every approval and rejection is logged and feeds the agent's track record.

## 5. Architecture

- **Next.js (App Router) + React + TypeScript + Tailwind CSS.** Single deployable.
- **Store:** server-side JSON document store (`.data/db.json`), loaded into memory, debounced
  atomic writes. Collections: `members`, `teams`, `items` (pages + issues), `projects`, `cycles`,
  `labels`, `comments`, `activity`, `integrations`, `calls`, `proposals`, `settings`.
- **Ops:** `lib/ops.ts` — `applyOp(state, op)` pure reducer used by both sides.
  `POST /api/ops` applies and broadcasts; `GET /api/state` hydrates; `GET /api/events` is the SSE
  stream. Client store (zustand) applies optimistically and reconciles.
- **AI:** `@anthropic-ai/sdk`, model `claude-opus-5-5` by default (configurable per agent),
  streaming manual tool loop, adaptive thinking, `effort: "low"` for live call turns (latency) and
  higher for "work on this issue". Interjection checks use `claude-haiku-5-5`. Server-side refusal
  fallback enabled. When `ANTHROPIC_API_KEY` is absent, a deterministic **simulator** produces
  plausible streamed replies, board notes and proposals so the product can be demoed offline.
- **Call protocol:** `POST /api/call/turn` streams NDJSON events: `speaker`, `text` (delta),
  `thinking`, `note`, `proposal`, `tool`, `done`, `error`. `POST /api/call/interject` returns
  raised hands. `POST /api/call/end` writes the call page.
- **Voice:** browser Web Speech API in v0 (zero infra, works in Chrome/Edge); the client voice
  layer is isolated behind an interface so a realtime STT/TTS provider can replace it.

## 6. Quality bar
- `npm run build` and `npm run typecheck` pass. No console errors on any page.
- Works with no API key (simulator) and with one (real models).
- Seeded with a realistic workspace drawn from the team's actual situation: teams ENG / GTM / OPS,
  projects "YC W27 application", "Speedrun application", "Vertical validation: mid-tier gold
  miners (Ghana)", "Flower exporters (Kenya)", "Cold chain", pages for the Antler retrospective,
  the new direction, the "why savants?" question, founder video screenplay outline, and issues
  for every action item from the meeting (founder video, mic, personal profiles, CAC
  incorporation, cold-email automation, website copy, Speedrun deck, renew GitHub subscription…).
- Accessible: keyboard-navigable, visible focus, labelled controls, reduced-motion respected.

## 6.5 Baseline UI: Linear

The interface copies Linear's UI and UX as its baseline (decided by the founders): measure the live
app (tokens, type, spacing, layout) and recover its front end with REA, then rebuild it with our own
components and open fonts. Do not copy Linear's logo, icon set or stylesheet files. The Emeka
design system and the final platform UI are then tuned on top of this baseline. The AI teammates
are called **savants**.

## 7. Out of scope for v0 (roadmap)
Real auth and multi-tenant workspaces · CRDT text merging (v0 is last-write-wins per block) ·
server-side realtime voice (WebRTC + streaming STT/TTS) · real OAuth for every catalog connector ·
evals from corrections (Hone-style "every correction becomes an eval") · long-horizon engines that
own an outcome for weeks · self-hosted / VPC deployment with bring-your-own-model.
