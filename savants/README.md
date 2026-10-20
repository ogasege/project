# Emeka Savants

**Linear and Notion merged into one multiplayer workspace where AI savants are teammates you can
assign work to and get on a live voice call with to reason through problems together.**

The interface uses Linear's UI and UX as its baseline: tokens, layout and density measured from
Linear's web app and recovered with REA (see `docs/REVERSE_ENGINEERING.md`), rebuilt with our own
components and the open Inter typeface. The Emeka design system will be tuned on top of it.

> Built from [`PROMPT.md`](./PROMPT.md), which is the full product brief derived from the Oct 19
> "Antler retrospective & new direction" meeting. Read it first: it explains *why* every piece exists.
> The data model, agent protocol and integration catalog are grounded in
> [a reverse-engineering pass over what Linear and Notion ship](./docs/REVERSE_ENGINEERING.md),
> done with [REA](https://github.com/morluto/rea).

## What's inside

| Area | What you get |
|---|---|
| **Issues** (Linear side) | Teams with identifiers (`ENG-12`), workflow states, priorities, labels, estimates, due dates, cycles, projects, sub-issues. List view grouped by status, kanban board with drag-and-drop, filters, issue detail with comments and activity. `⌘K` command palette and single-key shortcuts. |
| **Pages** (Notion side) | Nested pages, a block editor with `/` slash menu, `@` mentions, Markdown shortcuts, to-dos, toggles, callouts, code. Convert a page into an issue and back. |
| **One data model** | An issue *is* a page with properties. Everything is an op (`insert` / `update` / `delete`) applied by one pure reducer on client and server, broadcast over SSE for multiplayer, and appended to an op log that doubles as the audit trail. |
| **The Call** | Full-screen voice room with the savants (Atlas the lead, Vera the skeptic, Forge the operator, Scout the researcher). Speak naturally (Web Speech API). Each savant is drawn as a radial signal meter that moves with its voice; they answer in their own voices, start talking before they finish thinking, can be interrupted mid-sentence, raise their hands to interject, pin claims, risks and decisions to a shared reasoning board, and propose real workspace changes that you approve. Ending the call writes a summary page. |
| **Savants** | Savants are members: assign them issues, ask them to work on one, pick each one's model, persona, voice and autonomy level (`ask`, `low-risk`, `autonomous`). Their approval track record is visible, so autonomy is earned. |
| **Approvals** | The human gate. Every consequential agent action waits here unless that savant's autonomy allows it. Edit, then approve, or reject. Everything is on record. |
| **Integrations** | The union of Linear's and Notion's integration directories in one catalog, each shown with its real brand logo (76 of 92 apps; see below). GitHub, Slack and outgoing webhooks are live; the rest connect in simulated mode. Plus a built-in **MCP server** at `/api/mcp`, so Claude, Cursor, ChatGPT or any MCP client can read and write the workspace (writes go through the same human gate). |

## Quickstart

```bash
git clone -b claude/peaceful-edison-3aji4m https://github.com/ogasege/project.git
cd project/savants
npm run local        # installs, asks for an optional API key, starts, opens http://localhost:3000
```

Or by hand: `npm install`, `cp .env.example .env.local`, `npm run dev`.

- **No API key?** The savants run on a built-in simulator so you can demo everything offline. If a
  live call fails for an account reason (bad key, no workspace, no model access), that turn falls
  back to the simulator and the call says so.
- **Key not scoped to a workspace?** Set `ANTHROPIC_WORKSPACE_ID` (the API asks for the
  `anthropic-workspace-id` header).
- **Voice** needs Chrome or Edge (Web Speech API). Everything also works by typing.
- Data lives in `.data/db.json`; the audit log is `.data/oplog.ndjson`. `npm run reset-data` re-seeds.

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

## Moving this folder into its own repository

This project was generated inside another repo's branch. To publish it as its own repo with history:

```bash
# create an empty repo first (e.g. github.com/ogasege/savants), then from the outer repo root:
./savants/scripts/publish-to-new-repo.sh git@github.com:ogasege/savants.git
```

## Roadmap (from the brief)

Real auth and multi-tenant workspaces · CRDT text merging · server-side realtime voice
(WebRTC + streaming STT/TTS) · real OAuth for the whole catalog · evals from corrections
(every rejection becomes a test) · long-horizon engines that own an outcome for weeks ·
self-hosted / VPC deployment with bring-your-own-model.
