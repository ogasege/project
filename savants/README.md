# Emeka Savants

**Linear and Notion merged into one multiplayer workspace where AI savants are teammates you can
assign work to and get on a live voice call with to reason through problems together.**

The interface uses Linear's UI and UX as its baseline: tokens, layout and density measured from
Linear's web app and recovered with REA (see `docs/REVERSE_ENGINEERING.md`), rebuilt with our own
components and the open Inter typeface. The Emeka design system will be tuned on top of it.

> What we're building and why: [`docs/PRODUCT_PROMPT.md`](./docs/PRODUCT_PROMPT.md).
> UI fixes in progress: [`docs/LOVABLE_UI_PROMPT.md`](./docs/LOVABLE_UI_PROMPT.md).
> The data model, agent protocol and integration catalog are grounded in
> [a reverse-engineering pass over what Linear and Notion ship](./docs/REVERSE_ENGINEERING.md),
> done with [REA](https://github.com/morluto/rea).

## What's inside

| Area | What you get |
|---|---|
| **Outcomes** (home) | Say what should be true and by when ("Grow revenue 20% by 31 December"). The system suggests who should own it, from the standing savants plus specialist reps it can spin up (sales, growth, finance, customer success, product, recruiting). Pick the team and how each one looks (15 animated looks, from the signal meter to metaballs, a point sphere or an LED matrix). The lead plans it (with the model when the key works, otherwise by role), opens an issue per workstream, and the savants work their parts in the background. Watch them in one of ten team views (planetary orbit, council constellation, atom, relay tree, radar, swarm, roots, metro map, broadcast, swimlanes) where handoffs travel out from the lead and results travel back. Decisions they need wait under "Needs you"; run another round or talk it through on a call. |
| **Issues** (Linear side) | Teams with identifiers (`ENG-12`), workflow states, priorities, labels, estimates, due dates, cycles, projects, sub-issues. List view grouped by status, kanban board with drag-and-drop, filters, issue detail with comments and activity. `⌘K` command palette and single-key shortcuts. |
| **Pages** (Notion side) | Nested pages, a block editor with `/` slash menu, `@` mentions, Markdown shortcuts, to-dos, toggles, callouts, code. Convert a page into an issue and back. |
| **One data model** | An issue *is* a page with properties. Everything is an op (`insert` / `update` / `delete`) applied by one pure reducer on client and server, broadcast over SSE for multiplayer, and appended to an op log that doubles as the audit trail. |
| **The Call** | Full-screen voice room with the savants (Atlas the lead, Vera the skeptic, Forge the operator, Scout the researcher). Speak naturally (Web Speech API). Each savant is drawn in the look it was given (the signal meter by default) and moves with its voice; they answer in their own voices, start talking before they finish thinking, can be interrupted mid-sentence, raise their hands to interject, pin claims, risks and decisions to a shared reasoning board, and propose real workspace changes that you approve. Ending the call writes a summary page. |
| **Savants** | Savants are members: assign them issues, ask them to work on one, pick each one's model, persona, voice and autonomy level (`ask`, `low-risk`, `autonomous`). Their approval track record is visible, so autonomy is earned. |
| **Approvals** | The human gate. Every consequential agent action waits here unless that savant's autonomy allows it. Edit, then approve, or reject. Everything is on record. |
| **Integrations** | The union of Linear's and Notion's integration directories in one catalog, each shown with its real brand logo (76 of 92 apps; see below). GitHub, Slack and outgoing webhooks are live; the rest connect in simulated mode. Plus a built-in **MCP server** at `/api/mcp`, so Claude, Cursor, ChatGPT or any MCP client can read and write the workspace (writes go through the same human gate). |

## Run it on your computer

### 1. What you need (once)

| Need | How to check | How to get it |
|---|---|---|
| Node.js 22 or newer | `node -v` | `brew install node` (Mac) or [nodejs.org](https://nodejs.org) |
| Git | `git --version` | `xcode-select --install` (Mac) |
| Access to the private EmekaAITeam GitHub org | open [the repo](https://github.com/EmekaAITeam/linear) in your browser | ask an org owner; then sign in once with `gh auth login` (`brew install gh`) or use an SSH key |
| Chrome or Edge | | for talking to the savants out loud; typing works anywhere |
| An Anthropic API key (optional) | | [console.anthropic.com](https://console.anthropic.com) → API keys. Without one the savants run on a built-in simulator. |

### 2. First run

Paste these one line at a time (they avoid characters some terminals escape when pasting):

```bash
cd ~
git clone https://github.com/EmekaAITeam/linear.git
cd linear
npm run local -- --workspace wrkspc_YOUR_WORKSPACE_ID
```

`npm run local` installs everything, asks for your API key (nothing shows while you paste it; that is
normal), saves your settings to `.env.local`, starts the app and opens http://localhost:3000. The first
run takes a minute or two. Before it starts it prints either *"Savants will use the live model (key
ending …, workspace …)"* or *"No API key: Savants will use the built-in simulator."*

Which workspace ID? Keys made inside a workspace in the Anthropic Console need none: drop the
`--workspace …` part. User-level keys (they start `sk-ant-usr-`) must name one: copy its ID
(`wrkspc_…`) from Console → Workspaces. You can also pass the key itself:
`npm run local -- --key sk-ant-… --workspace wrkspc_…` (it then lands in your shell history; leaving it
out makes the script ask for it instead).

### 3. Every day after

```bash
cd ~/linear
git pull
npm run local
```

Dependencies reinstall automatically when they change. Your key and workspace stay in `.env.local`.

### 4. Settings (`.env.local`)

| Variable | What it does |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic key. Empty means simulator. |
| `ANTHROPIC_WORKSPACE_ID` | Needed only for keys not scoped to a workspace. |
| `SAVANTS_DEFAULT_MODEL` | Model the savants use. Default `claude-opus-5-5`. |
| `SAVANTS_FAST_MODEL` | Model for quick checks (who wants to speak next). Default `claude-haiku-5-5`. |
| `SAVANTS_MCP_TOKEN` | Require this bearer token on the MCP server at `/api/mcp`. |
| `SAVANTS_ALLOWED_HOSTS` | Extra host names allowed to reach the API (default: localhost only). |
| `PORT` | Port for `npm run local` (default 3000). |

`.env.local` is ignored by git and readable only by you. Never commit keys.

### 5. If something goes wrong

| You see | Do this |
|---|---|
| `Node.js 22+ is required` | `brew install node`, then run `npm run local` again. |
| `Repository not found` when cloning | You aren't signed in to GitHub with access to EmekaAITeam: run `gh auth login`, or ask for access. |
| `cmdand subsh>` or `quote>` after pasting | Press Ctrl+C. Your terminal escaped a character; paste the commands one line at a time. |
| `Port 3000 is in use` | `PORT=3001 npm run local` |
| "Simulator · the live model isn't reachable with this API key" | The key, workspace or model access is wrong. Check the line printed at start-up, fix `.env.local`, restart. |
| The savants can't hear you | Use Chrome or Edge, allow the microphone in the address bar, and switch the mic from Off to Open mic in the call bar. |
| You want a clean slate | Stop the app (Ctrl+C), `npm run reset-data`, start again. |

Data lives in `.data/db.json`; the audit log is `.data/oplog.ndjson`. By hand instead of the script:
`npm install`, `cp .env.example .env.local`, edit it, `npm run dev`.

### Security

There is no login yet, so the server binds to `127.0.0.1` and `src/proxy.ts` guards every API
route: the Host header must be local (blocks DNS rebinding; widen with `SAVANTS_ALLOWED_HOSTS`),
and state-changing requests from other sites are refused (a body-less cross-site POST skips the
CORS preflight). Integration credentials stay server-side and are redacted from `/api/state` and
the live-sync stream. Set `SAVANTS_MCP_TOKEN` to require a bearer token on `/api/mcp`.

### Connect an MCP client

```bash
claude mcp add --transport http savants http://localhost:3000/api/mcp
```

Set `SAVANTS_MCP_TOKEN` to require a bearer token.

## Integration logos

Logos come from two CC0 icon sets, Iconify's [SVG Logos](https://github.com/gilbarbara/logos) (full
colour) and [Simple Icons](https://simpleicons.org) (single colour), compiled into
`src/lib/integration-logos.ts` by `node scripts/gen-integration-logos.mjs`. Neither set has an
open-licensed mark for 16 apps (listed at the top of the generated file); those show a mono
monogram. Trademarks belong to their owners and identify each integration only.

## Models

Agents default to `claude-opus-5-5` (override with `SAVANTS_DEFAULT_MODEL`, or per agent on its
profile). Live call turns run at low effort for latency; interjection checks use
`claude-haiku-5-5` (`SAVANTS_FAST_MODEL`). Server-side refusal fallback is enabled
(`fallbacks: "default"`), so a declined request is retried on a fallback model instead of failing.

## Architecture

```
src/
  lib/            types (unified Item model), ops reducer, client store (zustand + SSE), markdown<->blocks
  server/         JSON store + op log, proposal/approval engine, integrations runtime, MCP, AI (Claude + simulator)
  app/            Next.js App Router pages and API routes
  components/     shell, issues, editor, pages, call, agents, approvals, integrations
```

API surface: `GET /api/state`, `POST /api/ops`, `GET /api/events` (SSE), `POST /api/proposals/:id`,
`POST /api/call`, `POST /api/call/:id/turn` (NDJSON stream), `POST /api/call/:id/interject`,
`POST /api/call/:id/end`, `POST /api/agents/:id/work`, `POST|DELETE /api/integrations…`, `POST /api/mcp`.

Integration credentials never leave the server: `/api/state` and the SSE stream redact them.

## Roadmap

Real auth and multi-tenant workspaces · CRDT text merging · server-side realtime voice
(WebRTC + streaming STT/TTS) · real OAuth for the whole catalog · evals from corrections
(every rejection becomes a test) · long-horizon engines that own an outcome for weeks ·
self-hosted / VPC deployment with bring-your-own-model.
