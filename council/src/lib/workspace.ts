import type { DB, Item, Member, Priority, StatusType, WorkflowState } from "./types";

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 0, label: "No priority" },
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
];

export const DEFAULT_STATES: WorkflowState[] = [
  { id: "st_backlog", name: "Backlog", type: "backlog", color: "#8a8f98" },
  { id: "st_todo", name: "Todo", type: "unstarted", color: "#e2e2e2" },
  { id: "st_progress", name: "In Progress", type: "started", color: "#f2c94c" },
  { id: "st_review", name: "In Review", type: "review", color: "#5e6ad2" },
  { id: "st_done", name: "Done", type: "completed", color: "#4cb782" },
  { id: "st_canceled", name: "Canceled", type: "canceled", color: "#6b6f76" },
];

export const STATUS_ORDER: StatusType[] = ["started", "review", "unstarted", "backlog", "completed", "canceled"];

export function identifier(db: DB, item: Item): string {
  if (item.kind !== "issue" || !item.teamId) return "";
  const team = db.teams[item.teamId];
  return team ? `${team.key}-${item.number}` : `#${item.number}`;
}

export function stateOf(db: DB, item: Item): WorkflowState | undefined {
  return db.settings.states.find((s) => s.id === item.stateId);
}

export function currentUser(db: DB): Member | undefined {
  return db.members[db.settings.currentUserId];
}

export function agents(db: DB): Member[] {
  return Object.values(db.members).filter((m) => m.kind === "agent");
}

export function humans(db: DB): Member[] {
  return Object.values(db.members).filter((m) => m.kind === "human");
}

export function issues(db: DB): Item[] {
  return Object.values(db.items).filter((i) => i.kind === "issue" && !i.archived);
}

export function pages(db: DB): Item[] {
  return Object.values(db.items).filter((i) => i.kind === "page" && !i.archived);
}

export function childPages(db: DB, parentId: string | null): Item[] {
  return pages(db)
    .filter((p) => (p.parentId ?? null) === parentId)
    .sort((a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt));
}

export function findByIdentifier(db: DB, ident: string): Item | undefined {
  const m = ident.toUpperCase().match(/^([A-Z]+)-(\d+)$/);
  if (!m) return undefined;
  const team = Object.values(db.teams).find((t) => t.key === m[1]);
  if (!team) return undefined;
  return issues(db).find((i) => i.teamId === team.id && i.number === Number(m[2]));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.round((now - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function itemHref(item: Item, db?: DB): string {
  if (item.kind === "issue" && db) return `/issue/${identifier(db, item)}`;
  return item.kind === "issue" ? `/issue/${item.id}` : `/page/${item.id}`;
}
