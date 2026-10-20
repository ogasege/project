"use client";

import { PageIcon } from "@/components/PageIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCheck, Inbox as InboxIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Activity, DB, Op } from "@/lib/types";
import { identifier, relativeTime } from "@/lib/workspace";
import { Avatar, Button, EmptyState, PageHeader, StatusIcon, clsx } from "@/components/ui";
import { issueHref } from "@/components/issues/helpers";

function hrefFor(db: DB, a: Activity): string | null {
  const item = a.itemId ? db.items[a.itemId] : null;
  if (!item) return null;
  return item.kind === "issue" ? issueHref(db, item) : `/page/${item.id}`;
}

export default function InboxPage() {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const me = db.settings.currentUserId;
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const pending = useMemo(() => Object.values(db.proposals).filter((p) => p.status === "pending").sort((a, b) => b.createdAt - a.createdAt), [db.proposals]);

  const feed = useMemo(() => {
    return Object.values(db.activity)
      .filter((a) => {
        if (a.actorId === me) return false;
        const actor = db.members[a.actorId];
        const item = a.itemId ? db.items[a.itemId] : null;
        if (actor?.kind === "agent") return true;
        if (!item) return true;
        return item.assigneeId === me || item.createdBy === me;
      })
      .filter((a) => filter === "all" || !(a.readBy ?? []).includes(me))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  }, [db.activity, db.members, db.items, me, filter]);

  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const groups = [
    { title: "Today", rows: feed.filter((a) => a.createdAt >= startOfToday) },
    { title: "Earlier", rows: feed.filter((a) => a.createdAt < startOfToday) },
  ].filter((g) => g.rows.length);

  const unread = feed.filter((a) => !(a.readBy ?? []).includes(me));

  const markRead = (rows: Activity[]) => {
    const ops: Op[] = rows
      .filter((a) => !(a.readBy ?? []).includes(me))
      .map((a) => ({ type: "update", coll: "activity", id: a.id, patch: { readBy: [...(a.readBy ?? []), me] } }));
    if (ops.length) void useStore.getState().dispatch(ops);
  };

  return (
    <>
      <PageHeader title="Inbox" icon={<InboxIcon size={15} className="text-muted" />}>
        <span className="flex rounded-md border border-line text-[12px]">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx("px-2 py-0.5 capitalize first:rounded-l-md last:rounded-r-md", filter === f ? "bg-active text-fg" : "text-muted hover:text-fg")}
            >
              {f}
            </button>
          ))}
        </span>
        <Button size="sm" variant="ghost" disabled={!unread.length} onClick={() => markRead(unread)}>
          <CheckCheck size={13} /> Mark all read
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto">
        {pending.length > 0 && (
          <div className="border-b border-line bg-accent-soft/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded bg-accent" />
              <span className="font-medium">
                {pending.length} agent proposal{pending.length === 1 ? "" : "s"} awaiting your approval
              </span>
              <Link href="/approvals" className="ml-auto text-accent hover:underline">
                Review all →
              </Link>
            </div>
            <ul className="mt-2 space-y-1">
              {pending.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-[12px] text-muted">
                  <Avatar member={db.members[p.agentId]} size={16} />
                  <span className="text-fg">{db.members[p.agentId]?.name}</span>
                  <span className="truncate">{p.rationale}</span>
                  <span className="ml-auto shrink-0 text-faint">{relativeTime(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!groups.length && (
          <EmptyState
            title={filter === "unread" ? "You're all caught up" : "Inbox zero"}
            body="Updates on issues you're assigned to or created, and everything your agents do, will show up here."
          />
        )}

        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="sticky top-0 z-10 border-b-[0.5px] border-line bg-panel px-4 py-1.5 text-[12px] font-medium text-faint">{g.title}</h2>
            {g.rows.map((a) => {
              const actor = db.members[a.actorId];
              const item = a.itemId ? db.items[a.itemId] : null;
              const href = hrefFor(db, a);
              const isUnread = !(a.readBy ?? []).includes(me);
              const state = item?.kind === "issue" ? db.settings.states.find((s) => s.id === item.stateId) : undefined;
              return (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    markRead([a]);
                    if (href) router.push(href);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      markRead([a]);
                      if (href) router.push(href);
                    }
                  }}
                  className="flex cursor-default items-center gap-3 border-b border-line/60 px-4 py-2.5 hover:bg-hover/70"
                >
                  <span className={clsx("h-1.5 w-1.5 shrink-0 rounded", isUnread ? "bg-accent" : "bg-transparent")} aria-label={isUnread ? "Unread" : undefined} />
                  <Avatar member={actor} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {item?.kind === "issue" && (
                        <>
                          <StatusIcon state={state} size={12} />
                          <span className="font-mono text-[12px] text-faint">{identifier(db, item)}</span>
                        </>
                      )}
                      {item?.kind === "page" && <PageIcon icon={item.icon} />}
                      <span className={clsx("truncate", isUnread ? "font-medium text-fg" : "text-muted")}>{item?.title || (item ? "Untitled" : db.settings.workspaceName)}</span>
                    </div>
                    <div className="truncate text-[12px] text-muted">
                      <span className="text-fg/80">{actor?.name ?? "Someone"}</span>
                      {actor?.kind === "agent" && <span className="mx-1 rounded bg-accent-soft px-1 text-[10px] text-accent">agent</span>} {a.verb}
                      {a.detail ? ` · ${a.detail}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-faint">{relativeTime(a.createdAt)}</span>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}
