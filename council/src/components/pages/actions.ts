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
