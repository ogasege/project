import fs from "node:fs";
import path from "node:path";
import { applyOps } from "@/lib/ops";
import { uid } from "@/lib/id";
import type { DB, Op, OpEnvelope } from "@/lib/types";
import { seedDB } from "./seed";

// Server-side document store: in-memory, persisted to .data/db.json with debounced atomic writes.
// Every mutation goes through commit(), which appends to the op log and broadcasts over SSE.

const DATA_DIR = process.env.SAVANTS_DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const LOG_FILE = path.join(DATA_DIR, "oplog.ndjson");

type Listener = (env: OpEnvelope) => void;

interface StoreState {
  db: DB;
  listeners: Set<Listener>;
  writeTimer: NodeJS.Timeout | null;
}

const g = globalThis as unknown as { __savantsStore?: StoreState };

function load(): DB {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    const db = seedDB();
    persistNow(db);
    return db;
  }
}

function persistNow(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

function store(): StoreState {
  if (!g.__savantsStore) {
    g.__savantsStore = { db: load(), listeners: new Set(), writeTimer: null };
  }
  return g.__savantsStore;
}

export function getDB(): DB {
  return store().db;
}

export function commit(ops: Op[], actorId: string, meta: { opId?: string; clientId?: string } = {}): OpEnvelope {
  const s = store();
  s.db = applyOps(s.db, ops);
  const env: OpEnvelope = { opId: meta.opId ?? uid("op"), clientId: meta.clientId, actorId, at: Date.now(), ops };
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(env) + "\n");
  } catch {
    // audit log is best-effort on read-only filesystems
  }
  if (s.writeTimer) clearTimeout(s.writeTimer);
  s.writeTimer = setTimeout(() => {
    try {
      persistNow(s.db);
    } catch (err) {
      console.error("[savants] failed to persist db", err);
    }
  }, 250);
  for (const l of s.listeners) {
    try {
      l(env);
    } catch {
      // a broken subscriber must not break the commit
    }
  }
  return env;
}

export function subscribe(listener: Listener): () => void {
  const s = store();
  s.listeners.add(listener);
  return () => s.listeners.delete(listener);
}

export function resetDB(): DB {
  const s = store();
  s.db = seedDB();
  persistNow(s.db);
  return s.db;
}
