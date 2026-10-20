import type { DB, Op } from "./types";

// Pure reducer shared by client (optimistic) and server (authoritative).
// Returns a new DB object with structural sharing; never mutates its input.
export function applyOp(db: DB, op: Op): DB {
  switch (op.type) {
    case "insert": {
      const coll = db[op.coll] as Record<string, unknown>;
      return { ...db, [op.coll]: { ...coll, [op.doc.id]: op.doc } };
    }
    case "update": {
      const coll = db[op.coll] as unknown as Record<string, Record<string, unknown>>;
      const prev = coll[op.id];
      if (!prev) return db;
      return { ...db, [op.coll]: { ...coll, [op.id]: { ...prev, ...op.patch } } };
    }
    case "delete": {
      const coll = { ...(db[op.coll] as Record<string, unknown>) };
      if (!(op.id in coll)) return db;
      delete coll[op.id];
      return { ...db, [op.coll]: coll };
    }
    case "settings":
      return { ...db, settings: { ...db.settings, ...op.patch } };
  }
}

export function applyOps(db: DB, ops: Op[]): DB {
  return ops.reduce(applyOp, db);
}

export function emptyDB(): DB {
  return {
    version: 1,
    settings: { workspaceName: "Savants", currentUserId: "", theme: "dark", states: [] },
    members: {},
    teams: {},
    items: {},
    projects: {},
    cycles: {},
    labels: {},
    comments: {},
    activity: {},
    integrations: {},
    calls: {},
    proposals: {},
  };
}
