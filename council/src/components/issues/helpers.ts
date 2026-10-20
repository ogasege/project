"use client";

import { uid } from "@/lib/id";
import { markdownToBlocks } from "@/lib/markdown";
import { useStore } from "@/lib/store";
import type { Activity, Comment, DB, Item, Op, Priority, StatusType } from "@/lib/types";
import { STATUS_ORDER, identifier } from "@/lib/workspace";

export interface IssueFilters {
  assigneeIds: string[]; // "none" = unassigned
  labelIds: string[];
  priorities: Priority[];
  projectIds: string[];
}

export const EMPTY_FILTERS: IssueFilters = { assigneeIds: [], labelIds: [], priorities: [], projectIds: [] };

export function hasFilters(f: IssueFilters): boolean {
  return f.assigneeIds.length + f.labelIds.length + f.priorities.length + f.projectIds.length > 0;
}

export function applyFilters(list: Item[], f: IssueFilters): Item[] {
  return list.filter((i) => {
    if (f.assigneeIds.length && !f.assigneeIds.includes(i.assigneeId ?? "none")) return false;
    if (f.labelIds.length && !(i.labelIds ?? []).some((l) => f.labelIds.includes(l))) return false;
    if (f.priorities.length && !f.priorities.includes(i.priority ?? 0)) return false;
    if (f.projectIds.length && !f.projectIds.includes(i.projectId ?? "none")) return false;
    return true;
  });
}

export function sortIssues(list: Item[]): Item[] {
  // Priority first (urgent..low, none last), then most recently updated.
  const rank = (p?: Priority) => (p && p > 0 ? p : 9);
  return [...list].sort((a, b) => rank(a.priority) - rank(b.priority) || b.updatedAt - a.updatedAt);
}

export function groupByStatus(db: DB, list: Item[]) {
  const states = [...db.settings.states].sort((a, b) => STATUS_ORDER.indexOf(a.type) - STATUS_ORDER.indexOf(b.type));
  return states.map((state) => ({ state, issues: sortIssues(list.filter((i) => i.stateId === state.id)) }));
}

export function activityOp(actorId: string, verb: string, itemId?: string, detail?: string): Op {
  const a: Activity = { id: uid("act"), actorId, verb, itemId, detail, createdAt: Date.now() };
  return { type: "insert", coll: "activity", doc: a as unknown as Activity & Record<string, unknown> };
}

export interface NewIssue {
  teamId: string;
  title: string;
  description?: string;
  stateId?: string;
  priority?: Priority;
  assigneeId?: string | null;
  labelIds?: string[];
  projectId?: string | null;
  cycleId?: string | null;
  parentId?: string | null;
  estimate?: number | null;
  dueDate?: string | null;
}

/** Create an issue: bumps the team counter, inserts the item and an activity row in one dispatch. */
export async function createIssue(input: NewIssue): Promise<Item> {
  const { db, dispatch } = useStore.getState();
  const team = db.teams[input.teamId] ?? Object.values(db.teams)[0];
  const me = db.settings.currentUserId;
  const now = Date.now();
  const item: Item = {
    id: uid("is"),
    kind: "issue",
    title: input.title.trim() || "Untitled",
    teamId: team.id,
    number: team.nextNumber,
    stateId: input.stateId ?? "st_todo",
    priority: input.priority ?? 0,
    assigneeId: input.assigneeId ?? null,
    labelIds: input.labelIds ?? [],
    projectId: input.projectId ?? null,
    cycleId: input.cycleId ?? null,
    parentId: input.parentId ?? null,
    estimate: input.estimate ?? null,
    dueDate: input.dueDate ?? null,
    blocks: markdownToBlocks(input.description ?? ""),
    createdBy: me,
    createdAt: now,
    updatedAt: now,
    sortOrder: now,
  };
  await dispatch([
    { type: "update", coll: "teams", id: team.id, patch: { nextNumber: team.nextNumber + 1 } },
    { type: "insert", coll: "items", doc: item as unknown as Item & Record<string, unknown> },
    activityOp(me, "created", item.id),
  ]);
  return item;
}

const FIELD_LABEL: Record<string, string> = {
  stateId: "status",
  priority: "priority",
  assigneeId: "assignee",
  labelIds: "labels",
  projectId: "project",
  cycleId: "cycle",
  estimate: "estimate",
  dueDate: "due date",
  title: "title",
};

/** Update issue properties. Property changes (not text edits) are logged to the activity feed. */
export function updateIssue(itemId: string, patch: Partial<Item>, log = true) {
  const { db, dispatch } = useStore.getState();
  const me = db.settings.currentUserId;
  const ops: Op[] = [{ type: "update", coll: "items", id: itemId, patch: { ...patch, updatedAt: Date.now() } as Record<string, unknown> }];
  if (log) {
    const fields = Object.keys(patch)
      .map((k) => FIELD_LABEL[k])
      .filter(Boolean);
    if (fields.length) ops.push(activityOp(me, `updated ${fields.join(", ")}`, itemId, describePatch(db, patch)));
  }
  void dispatch(ops);
}

function describePatch(db: DB, patch: Partial<Item>): string | undefined {
  if (patch.stateId) return db.settings.states.find((s) => s.id === patch.stateId)?.name;
  if (patch.assigneeId !== undefined) return patch.assigneeId ? db.members[patch.assigneeId]?.name : "Unassigned";
  if (patch.priority !== undefined) return ["No priority", "Urgent", "High", "Medium", "Low"][patch.priority];
  if (patch.projectId !== undefined) return patch.projectId ? db.projects[patch.projectId]?.name : "No project";
  return undefined;
}

export function addComment(itemId: string, body: string) {
  const { db, dispatch } = useStore.getState();
  const me = db.settings.currentUserId;
  const c: Comment = { id: uid("cm"), itemId, authorId: me, body, createdAt: Date.now() };
  void dispatch([{ type: "insert", coll: "comments", doc: c as unknown as Comment & Record<string, unknown> }, activityOp(me, "commented on", itemId)]);
}

export function issueHref(db: DB, item: Item): string {
  return `/issue/${identifier(db, item) || item.id}`;
}

export function statusProgress(db: DB, list: Item[]): { done: number; total: number; pct: number } {
  const typeOf = (i: Item): StatusType | undefined => db.settings.states.find((s) => s.id === i.stateId)?.type;
  const counted = list.filter((i) => typeOf(i) !== "canceled");
  const done = counted.filter((i) => typeOf(i) === "completed").length;
  return { done, total: counted.length, pct: counted.length ? Math.round((done / counted.length) * 100) : 0 };
}

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || !!el.closest("[contenteditable='true']");
}
