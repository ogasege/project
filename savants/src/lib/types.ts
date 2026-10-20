// Unified data model. Pages (Notion) and issues (Linear) are both `Item`s:
// a title, a block tree, and typed properties. `kind` decides which UI renders it.

import type { PresenceLook } from "./presence";

export type ID = string;

export type MemberKind = "human" | "agent";
export type Autonomy = "ask" | "low-risk" | "autonomous";

export interface AgentConfig {
  role: string;
  persona: string; // system prompt fragment
  model: string;
  voice: { name?: string; pitch: number; rate: number };
  autonomy: Autonomy;
  tools: string[]; // allowed tool names
  lead?: boolean;
  presence?: PresenceLook; // how this savant looks while it works and talks
  stats: { proposed: number; approved: number; rejected: number };
}

export interface Member {
  id: ID;
  kind: MemberKind;
  name: string;
  handle: string;
  color: string; // hex
  avatar?: string; // emoji or initials override
  email?: string;
  agent?: AgentConfig;
  createdAt: number;
}

export interface Team {
  id: ID;
  key: string; // ENG
  name: string;
  icon: string;
  color: string;
  nextNumber: number;
}

export type StatusType = "backlog" | "unstarted" | "started" | "review" | "completed" | "canceled";

export interface WorkflowState {
  id: ID;
  name: string;
  type: StatusType;
  color: string;
}

export type Priority = 0 | 1 | 2 | 3 | 4; // 0 none, 1 urgent, 2 high, 3 medium, 4 low

export type BlockType =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "numbered"
  | "todo"
  | "toggle"
  | "quote"
  | "callout"
  | "code"
  | "divider"
  | "mention"; // embeds another item by id

export interface Block {
  id: ID;
  type: BlockType;
  text: string;
  checked?: boolean;
  indent?: number; // 0..4, flat-tree nesting
  collapsed?: boolean; // for toggles
  refId?: ID; // for mention blocks
  lang?: string; // for code
  emoji?: string; // for callout
}

export type ItemKind = "page" | "issue";

export interface Item {
  id: ID;
  kind: ItemKind;
  title: string;
  icon?: string;
  cover?: string; // css color/gradient
  parentId?: ID | null; // page tree / sub-issues
  blocks: Block[];
  // issue properties (present when kind === "issue")
  teamId?: ID;
  number?: number;
  stateId?: ID;
  priority?: Priority;
  assigneeId?: ID | null;
  labelIds?: ID[];
  projectId?: ID | null;
  cycleId?: ID | null;
  estimate?: number | null;
  dueDate?: string | null; // yyyy-mm-dd
  sortOrder?: number;
  // shared
  createdBy: ID;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  favorite?: boolean;
}

export type ProjectStatus = "planned" | "started" | "paused" | "completed" | "canceled";

export interface Project {
  id: ID;
  name: string;
  icon: string;
  color: string;
  description: string;
  status: ProjectStatus;
  leadId?: ID | null;
  teamIds: ID[];
  targetDate?: string | null;
  createdAt: number;
}

export interface Cycle {
  id: ID;
  teamId: ID;
  number: number;
  name?: string;
  startsAt: string; // yyyy-mm-dd
  endsAt: string;
}

export interface Label {
  id: ID;
  name: string;
  color: string;
}

export interface Comment {
  id: ID;
  itemId: ID;
  authorId: ID;
  body: string;
  createdAt: number;
}

export interface Activity {
  id: ID;
  actorId: ID;
  verb: string; // "created", "updated status", "approved", ...
  itemId?: ID;
  detail?: string;
  createdAt: number;
  readBy?: ID[];
}

export type ConnectionMode = "live" | "simulated";

export interface IntegrationConnection {
  id: ID; // same as catalog app id
  appId: string;
  status: "connected" | "error";
  mode: ConnectionMode;
  config: Record<string, string>;
  connectedBy: ID;
  connectedAt: number;
  lastEvent?: string;
}

export type NoteKind = "claim" | "assumption" | "question" | "risk" | "decision" | "action";

export interface BoardNote {
  id: ID;
  kind: NoteKind;
  text: string;
  authorId: ID;
  createdAt: number;
}

export interface CallTurn {
  id: ID;
  speakerId: ID;
  text: string;
  at: number;
  interrupted?: boolean;
}

export interface Call {
  id: ID;
  title: string;
  participantIds: ID[]; // agents (the human is implicit)
  contextItemIds: ID[];
  turns: CallTurn[];
  notes: BoardNote[];
  status: "live" | "ended";
  startedAt: number;
  endedAt?: number;
  summaryPageId?: ID;
  createdBy: ID;
}

export type ProposalAction =
  | { type: "create_issue"; teamId: ID; title: string; description?: string; priority?: Priority; assigneeId?: ID | null; projectId?: ID | null; labelIds?: ID[] }
  | { type: "update_issue"; itemId: ID; patch: Partial<Pick<Item, "stateId" | "priority" | "assigneeId" | "projectId" | "title" | "dueDate">> }
  | { type: "create_page"; title: string; markdown: string; parentId?: ID | null; icon?: string }
  | { type: "append_to_item"; itemId: ID; markdown: string }
  | { type: "comment"; itemId: ID; body: string }
  | { type: "integration_action"; appId: string; action: string; input: Record<string, unknown> };

export interface Proposal {
  id: ID;
  agentId: ID;
  callId?: ID;
  itemId?: ID; // context
  action: ProposalAction;
  rationale: string;
  status: "pending" | "approved" | "rejected" | "auto";
  createdAt: number;
  decidedAt?: number;
  decidedBy?: ID;
  resultItemId?: ID;
}

// An outcome is what the user wants to be true by a date ("grow revenue 20% by 31 December").
// The savants on it split it into workstreams; each workstream is an issue one savant owns.
export type WorkstreamStatus = "queued" | "working" | "needs-you" | "done" | "failed";

export interface Workstream {
  id: ID;
  agentId: ID;
  title: string;
  why: string;
  itemId?: ID; // the issue that tracks it
  status: WorkstreamStatus;
  phase?: "thinking" | "writing"; // while working
  activity?: string; // the latest thing it said or did, for the live view
  log: { at: number; text: string }[];
  round: number;
}

export type OutcomeStatus = "planning" | "working" | "needs-you" | "review" | "achieved" | "paused";

export interface Outcome {
  id: ID;
  title: string;
  deadline?: string | null; // yyyy-mm-dd
  guardrails?: string;
  measure?: string; // how we know it worked
  status: OutcomeStatus;
  repIds: ID[]; // savants on it
  leadId: ID;
  strategy?: string; // the lead's one-paragraph plan
  plannedBy: "model" | "simulator";
  view?: string; // which team view the room shows (orbit, constellation, ...)
  projectId?: ID;
  workstreams: Workstream[];
  rounds: number;
  createdBy: ID;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  workspaceName: string;
  currentUserId: ID;
  theme: "dark" | "light";
  states: WorkflowState[];
}

export interface DB {
  version: number;
  settings: Settings;
  members: Record<ID, Member>;
  teams: Record<ID, Team>;
  items: Record<ID, Item>;
  projects: Record<ID, Project>;
  cycles: Record<ID, Cycle>;
  labels: Record<ID, Label>;
  comments: Record<ID, Comment>;
  activity: Record<ID, Activity>;
  integrations: Record<ID, IntegrationConnection>;
  calls: Record<ID, Call>;
  proposals: Record<ID, Proposal>;
  outcomes: Record<ID, Outcome>;
}

export type Collection = Exclude<keyof DB, "version" | "settings">;

export type Op =
  | { type: "insert"; coll: Collection; doc: { id: ID } & Record<string, unknown> }
  | { type: "update"; coll: Collection; id: ID; patch: Record<string, unknown> }
  | { type: "delete"; coll: Collection; id: ID }
  | { type: "settings"; patch: Partial<Settings> };

export interface OpEnvelope {
  opId: string;
  clientId?: string;
  actorId: ID;
  at: number;
  ops: Op[];
}
