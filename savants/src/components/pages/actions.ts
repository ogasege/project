"use client";

import { uid } from "@/lib/id";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";

/** Create an empty page (optionally nested) and return its id. Caller navigates to `/page/{id}`. */
export async function createPage(parentId: string | null, init: Partial<Item> = {}): Promise<string> {
  const { db, dispatch } = useStore.getState();
  const now = Date.now();
  const page: Item = {
    id: uid("pg"),
    kind: "page",
    title: "",
    icon: "📄",
    parentId,
    blocks: [{ id: uid("b"), type: "p", text: "" }],
    createdBy: db.settings.currentUserId,
    createdAt: now,
    updatedAt: now,
    sortOrder: now,
    ...init,
  };
  await dispatch([{ type: "insert", coll: "items", doc: page as unknown as Item & Record<string, unknown> }]);
  return page.id;
}

/** Promote a page to an issue in `teamId`. Returns the new identifier (e.g. ENG-21). */
export async function convertToIssue(itemId: string, teamId: string): Promise<string | null> {
  const { db, dispatch } = useStore.getState();
  const item = db.items[itemId];
  const team = db.teams[teamId];
  if (!item || !team) return null;
  const number = team.nextNumber;
  await dispatch([
    { type: "update", coll: "teams", id: team.id, patch: { nextNumber: number + 1 } },
    {
      type: "update",
      coll: "items",
      id: item.id,
      patch: { kind: "issue", teamId: team.id, number, stateId: "st_todo", priority: 0, assigneeId: null, labelIds: [], parentId: null, updatedAt: Date.now() },
    },
  ]);
  return `${team.key}-${number}`;
}

export async function archiveItem(itemId: string): Promise<void> {
  await useStore.getState().dispatch([{ type: "update", coll: "items", id: itemId, patch: { archived: true, updatedAt: Date.now() } }]);
}

export async function patchItem(itemId: string, patch: Partial<Item>): Promise<void> {
  await useStore.getState().dispatch([{ type: "update", coll: "items", id: itemId, patch: { ...patch, updatedAt: Date.now() } }]);
}
