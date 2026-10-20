# Reverse engineering Linear and Notion with REA

Savants' data model, agent protocol, and integration catalog are grounded in what Linear and
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
the same normalized-record pattern Savants' store uses.

**Public API** (`@notionhq/client`, REA functions `request`, `streamRequest`,
`parseSessionStreamEvent`, `parseSseFrame`): besides pages, blocks, databases, data sources,
views, comments and file uploads, the shipped client exposes `agents` (`chat`, `threads`,
`insights`, `status`, `credit_limit`), `sessions` with SSE event streams and `cancel`,
`external_agent_stub/{agent}/sessions/{id}/events|messages|vaults`, `blocks/meeting_notes`
(with `transcription` objects), `ai/plugins` and `ai/skills`.

## What the evidence changed in Savants

1. **One record model, two lenses.** Both products store normalized records (Linear entities;
   Notion's record map of blocks). Savants' single `Item` (a page that becomes an issue when it
   has issue properties) plus a flat op log is the union of both, and REA shows Notion's own
   pages are block records loaded in chunks — the same shape.
2. **Agents are sessions with typed activities.** Linear (`AgentSession` + `AgentActivity`) and
   Notion (`agents` + `sessions` with streamed events) independently converged on this. Savants'
   call protocol maps one to one:

   | Linear `AgentActivityType` | Savants call event |
   |---|---|
   | Prompt | the human's turn (speech or text) |
   | Thought | `thinking` shimmer on the speaker's orb |
   | Action | `tool` events (search, read, pin note) |
   | Elicitation | proposals waiting at the human gate; raised hands |
   | Response | streamed `text` spoken aloud |
   | Error | `error` event |

   Linear's `Stop` signal is Savants' barge-in (speaking over an agent stops it), `Select` is
   approving a proposal or giving a raised hand the floor, and `AwaitingInput` is a session with
   pending approvals.
3. **Integration catalog = the union of both directories.** The 46 `IntegrationService` values
   reduce to 27 base services (the rest are personal, posting or import variants of the same
   connection). Each base service has a catalog entry (`McpServer` corresponds to Savants' own
   MCP server, `MicrosoftPersonal` to Outlook), with two exceptions: `AsksWeb` is Linear's
   own web intake form, and `Origin` couldn't be identified from shipped code. LaunchDarkly and
   email intake were added from this evidence, and Google Calendar was re-tagged as listed by both
   products.
4. **Meetings are first-class.** Notion ships meeting notes with transcriptions; Savants' call
   ends by writing a summary page with the transcript, board notes and decisions.


## Linear's web app (front end), from a browser capture

The founders recorded Linear's web app in Chrome (a sanitized HAR: no cookies or auth headers)
and ran `scripts/capture-ui-tokens.js` on seven views (Active issues, My issues, Projects, Inbox,
Reviews, Pulse, Agent). REA analysed the capture:

| Step | REA operation | Evidence id | Notes |
|---|---|---|---|
| Capture | `inspect-web-network-capture` (HAR 1.2) | `ev_62b4d469…28d11b` | 1,597 unique `static.linear.app` records (15 MB) after removing duplicates and Stripe; the optional `serverIPAddress` field was dropped because Chrome wrote IPv6 values the HAR 1.2 schema rejects. |
| Code | `analyze-javascript-application` on the 681 JS / 39 CSS files written out of the capture | `ev_7fecbd38…2a5332` | 1,835,465 AST nodes, 30,298 findings, 0 parse failures. Bundles are minified, so function names are mangled; chunk and CSS-module names survive. |

**What the front end is made of.** 583 named chunks, among them `IssueList`, `IssueViewSplitView`,
`GroupedDraggableList`, `Board`, `IssuePage`, `IssueCommentsAndHistory`, `NewIssue`, `QuickView`,
`ContentViewHeaderTitle`, `ContentViewHeaderSearch`, `TeamPageHeader`, `Navigation`,
`HoverActionRow`, `ListColumns`, `ProjectRoundedIcon` and the `*FilterBlocks` family (Issue, Project,
Initiative, Team, Member, Pull request). Styling mixes CSS modules with StyleX.

**Where Linear is heading (agents).** `AgentSessionPage`, `ActiveAgentsSection`,
`LoopsManagementPage`, `LoopTemplateLibrary`, `LoopDraftAgentSidebarContainer`, `LoopLimitsPage`,
`RegisterLoopRunUsageCostTarget`, `WorkspaceAgentsSettingsPage`, `TeamAgentSkillsSettingsPage`,
`McpConnectorList`, `TeamTriageMemoriesSettingsPage`, `ScratchpadMemoriesPage`, `DiaryView`,
`CodingAgentSettingsPage`. Linear ships recurring agent "loops" with usage limits and costs, agent
skills, MCP connectors and memories: the same direction as savants that own outcomes.

**Design tokens adopted.** From the live app (dark): sidebar `#09090a`, content panel
`lch(5.52% 0.4 272)`, raised steps `lch(7.32%)` / `lch(9.345%)` / `lch(13.861%)`, text
`lch(100%)` / `lch(90.451%)` / `lch(61.803%)` / `lch(36.975%)`, borders `lch(9.84–16.32%)` drawn at
0.5px, accent `lch(47.918% 59.303 288.421)`, focus ring 1px `#5e69d1`, Inter Variable at weights
450/500, 13px body, 12px meta. Layout: 244px sidebar, content panel inset 8px with a 12px radius,
44px header rows, 28px sidebar rows, 44px issue rows with 0.5px dividers, 32px menu items, 8px
control radius, pill labels. Light theme from Linear's own `[data-theme=light]` tokens in the
captured CSS. Linear's logo, icons and stylesheet files are not copied; the components are our own.

## Roadmap items surfaced by the evidence

- Issue relations (Blocks / Duplicate / Related / Similar) and project health updates
  (On track / At risk / Off track).
- Initiatives above projects, and Linear's Triage view.
- Notion databases (`collection_view` with table / board / calendar / gallery views), synced
  blocks, columns, and the embed block family.
- Agent sessions that persist beyond a call, with Linear's full status lifecycle (Pending →
  Active → AwaitingInput → Complete/Error/Stale).
