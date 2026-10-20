# Reverse engineering Linear and Notion with REA

Council's data model, agent protocol, and integration catalog are grounded in what Linear and
Notion actually ship, recovered with [REA — Reverse Engineer Anything](https://github.com/morluto/rea)
(`rea-agents` 6.7.0, static JavaScript application analysis). Reproduce it with
[`scripts/reverse-engineer.sh`](../scripts/reverse-engineer.sh).

## Targets and evidence

The build environment's network policy blocks `linear.app`, `notion.com` and both desktop-app
download hosts (proxy `403` on `CONNECT`), so the desktop Electron apps and web bundles could not
be fetched. The targets are the JavaScript each company ships on npm:

| Target | What it is | REA evidence id | Root artifact sha256 | AST nodes | Findings |
|---|---|---|---|---|---|
| `@linear/sdk@98.0.0` | Linear's official client, generated from its production GraphQL schema | `ev_79dc4423…ff67bc` | `9337ccdc…6b9466` | 751,812 | 11,372 |
| `@notionhq/client@5.27.1` | Notion's official public-API client | `ev_42350772…8c9381` | `d68b4bc7…7522b1` | 66,707 | 1,496 |
| `notion-client@8.0.8` (+ `notion-types`) | Community client for Notion's private `api/v3` (what notion.so itself calls) | `ev_68b6a304…d04791` | `ca145288…711efe3` | 3,221 | 35 |

Full identities are in [`rea/evidence-summary.json`](./rea/evidence-summary.json). All evidence
has REA authority `shipped-artifact` and confidence `derived`: it describes shipped code, not
runtime behaviour. REA reports unknowns (24,116 for the Linear SDK, mostly dynamic property
reads) that are not resolved here.

## Findings

### Linear

**Entity surface.** REA recovered 1,162 named classes from `dist/index.mjs`: 393 entity models,
327 mutations and 151 queries. The core of the work graph is Issue, Team, WorkflowState, Cycle,
Project, ProjectMilestone, ProjectUpdate, Initiative, Document, Comment, IssueLabel,
IssueRelation, CustomView, Favorite and Notification. The newer AI surface
(`AiConversation*` tool calls, widgets, elicitations) is a large share of the models.

**Enumerations recovered from the SDK typings:**

| Enum | Values |
|---|---|
| `IssueRelationType` | Blocks, Duplicate, Related, Similar |
| `ProjectStatusType` | Backlog, Planned, Started, Paused, Completed, Canceled |
| `ProjectUpdateHealthType` | OnTrack, AtRisk, OffTrack |
| `InitiativeStatus` | Proposed, Planned, Active, Completed, Canceled |
| `ViewType` (75) | Inbox, MyIssues, Triage, Backlog, Board, Cycle, Projects, Roadmap, Initiatives, Agents, Reviews, Search, … |
| `IntegrationService` (46) | Airbyte, AsksWeb, Datadog, Discord, Email, Figma, FigmaPlugin, Front, Github (+ Commit, Enterprise Server, Import, Personal, CodeAccessPersonal), Gitlab, Gong, GoogleCalendarPersonal, GoogleSheets, Intercom, Jira (+ Personal), LaunchDarkly (+ Personal), Loom, McpServer (+ Personal), MicrosoftPersonal, MicrosoftTeams (+ ProjectPost), Notion, Opsgenie, Origin, PagerDuty, Salesforce, Sentry, Slack (+ Asks, CustomViewNotifications, InitiativePost, OrgInitiativeUpdatesPost, OrgProjectUpdatesPost, Personal, Post, ProjectPost, ProjectUpdatesPost), Zendesk |

**Agent protocol.** Linear ships a first-class protocol for agents working inside the product:

| Enum | Values |
|---|---|
| `AgentSessionStatus` | Pending, Active, AwaitingInput, Stopping, Complete, Error, Stale |
| `AgentActivityType` | Prompt, Thought, Action, Elicitation, Response, Error |
| `AgentActivitySignal` | Stop, Continue, Select, Auth |

An agent session is a typed stream of activities: the human prompts, the agent thinks, acts,
asks for input (elicitation), and responds; the human can stop it mid-flight.

### Notion

**Private block model** (`notion-types`, the model notion.so uses): 46 block types including
`text`, `header`/`sub_header`/`sub_sub_header`, `bulleted_list`, `numbered_list`, `to_do`,
`toggle`, `quote`, `callout`, `code`, `divider`, `equation`, `column_list`/`column`, `table`,
`collection_view`/`collection_view_page` (databases), `transclusion_container`/`reference`
(synced blocks), `alias` (link to page), `button`, `tab`, and embeds (Figma, Miro, Typeform,
Replit, CodePen, Excalidraw, Drive, maps, tweets…). Property types: title, text, number, select,
status, multi_select, auto_increment_id, date, person, file, checkbox, url, email, phone_number,
formula, relation, created/last-edited time and by. Database views: table, gallery, list, board,
calendar.

**Private API** (`notion-client`, REA functions `getPage`, `getPageRaw`, `getBlocks`,
`getCollectionData`, `search`, `getSignedFileUrls`, `getUsers`): POSTs to `/api/v3/` endpoints
`loadPageChunk`, `syncRecordValuesMain`, `getRecordValues`, `queryCollection`, `search`,
`getSignedFileUrls`. Pages load as chunks of a record map (blocks, collections, views, users),
the same normalized-record pattern Council's store uses.

**Public API** (`@notionhq/client`, REA functions `request`, `streamRequest`,
`parseSessionStreamEvent`, `parseSseFrame`): besides pages, blocks, databases, data sources,
views, comments and file uploads, the shipped client exposes `agents` (`chat`, `threads`,
`insights`, `status`, `credit_limit`), `sessions` with SSE event streams and `cancel`,
`external_agent_stub/{agent}/sessions/{id}/events|messages|vaults`, `blocks/meeting_notes`
(with `transcription` objects), `ai/plugins` and `ai/skills`.

## What the evidence changed in Council

1. **One record model, two lenses.** Both products store normalized records (Linear entities;
   Notion's record map of blocks). Council's single `Item` (a page that becomes an issue when it
   has issue properties) plus a flat op log is the union of both, and REA shows Notion's own
   pages are block records loaded in chunks — the same shape.
2. **Agents are sessions with typed activities.** Linear (`AgentSession` + `AgentActivity`) and
   Notion (`agents` + `sessions` with streamed events) independently converged on this. Council's
   call protocol maps one to one:

   | Linear `AgentActivityType` | Council call event |
   |---|---|
   | Prompt | the human's turn (speech or text) |
   | Thought | `thinking` shimmer on the speaker's orb |
   | Action | `tool` events (search, read, pin note) |
   | Elicitation | proposals waiting at the human gate; raised hands |
   | Response | streamed `text` spoken aloud |
   | Error | `error` event |

   Linear's `Stop` signal is Council's barge-in (speaking over an agent stops it), `Select` is
   approving a proposal or giving a raised hand the floor, and `AwaitingInput` is a session with
   pending approvals.
3. **Integration catalog = the union of both directories.** The 46 `IntegrationService` values
   reduce to 27 base services (the rest are personal, posting or import variants of the same
   connection). Each base service has a catalog entry (`McpServer` corresponds to Council's own
   MCP server, `MicrosoftPersonal` to Outlook), with two exceptions: `AsksWeb` is Linear's
   own web intake form, and `Origin` couldn't be identified from shipped code. LaunchDarkly and
   email intake were added from this evidence, and Google Calendar was re-tagged as listed by both
   products.
4. **Meetings are first-class.** Notion ships meeting notes with transcriptions; Council's call
   ends by writing a summary page with the transcript, board notes and decisions.

## Roadmap items surfaced by the evidence

- Issue relations (Blocks / Duplicate / Related / Similar) and project health updates
  (On track / At risk / Off track).
- Initiatives above projects, and Linear's Triage view.
- Notion databases (`collection_view` with table / board / calendar / gallery views), synced
  blocks, columns, and the embed block family.
- Agent sessions that persist beyond a call, with Linear's full status lifecycle (Pending →
  Active → AwaitingInput → Complete/Error/Stale).
