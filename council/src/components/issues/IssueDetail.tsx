"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronRight, Link2, Plus, Radio, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Block, Item } from "@/lib/types";
import { identifier, relativeTime } from "@/lib/workspace";
import { Avatar, Button, PageHeader, StatusIcon, clsx } from "@/components/ui";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { addComment, activityOp, issueHref, updateIssue } from "./helpers";
import { IssueRow } from "./IssueRow";
import {
  AssigneeMenu,
  CycleMenu,
  DueDateInput,
  EstimateMenu,
  LabelsMenu,
  PriorityMenu,
  ProjectMenu,
  StatusMenu,
} from "./PropertyMenus";

export function IssueDetail({ item }: { item: Item }) {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const team = item.teamId ? db.teams[item.teamId] : null;
  const ident = identifier(db, item);
  const parent = item.parentId ? db.items[item.parentId] : null;
  const assignee = item.assigneeId ? db.members[item.assigneeId] : null;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-1.5 text-muted">
            {team && (
              <Link href={`/team/${team.key}/issues`} className="hover:text-fg">
                {team.name}
              </Link>
            )}
            <ChevronRight size={12} />
            {parent && (
              <>
                <Link href={issueHref(db, parent)} className="font-mono hover:text-fg">
                  {identifier(db, parent)}
                </Link>
                <ChevronRight size={12} />
              </>
            )}
            <span className="font-mono text-fg">{ident}</span>
          </span>
        }
      >
        <Button
          size="sm"
          variant="ghost"
          title="Copy link"
          onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}${issueHref(db, item)}`)}
        >
          <Link2 size={13} />
        </Button>
        <Button size="sm" variant="primary" onClick={() => router.push(`/call?context=${item.id}`)}>
          <Radio size={13} /> Discuss on a call
        </Button>
      </PageHeader>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-10 py-8">
            <TitleInput item={item} />
            <Description item={item} />
            {assignee?.kind === "agent" && <AgentWork item={item} agentId={assignee.id} agentName={assignee.name} />}
            <SubIssues item={item} />
            <ActivityAndComments item={item} />
          </div>
        </div>
        <PropertySidebar item={item} />
      </div>
    </>
  );
}

function TitleInput({ item }: { item: Item }) {
  const [value, setValue] = useState(item.title);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setValue(item.title);
  }, [item.title]);
  const commit = () => {
    const v = value.trim();
    if (v && v !== item.title) updateIssue(item.id, { title: v });
    else setValue(item.title);
  };
  return (
    <textarea
      value={value}
      rows={1}
      aria-label="Issue title"
      placeholder="Issue title"
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onChange={(e) => setValue(e.target.value.replace(/\n/g, ""))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      ref={(el) => {
        if (el) {
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        }
      }}
      className="w-full resize-none overflow-hidden bg-transparent text-[24px] font-semibold leading-tight outline-none placeholder:text-faint"
    />
  );
}

function Description({ item }: { item: Item }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Block[] | null>(null);
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      updateIssue(item.id, { blocks: pending.current }, false);
      pending.current = null;
    }
  };
  // Flush on unmount / issue switch so no edit is lost.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => flush, [item.id]);
  return (
    <div className="mt-3 min-h-[120px]">
      <BlockEditor
        key={item.id}
        blocks={item.blocks}
        placeholder="Add description…  Type / for commands"
        onChange={(blocks) => {
          pending.current = blocks;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(flush, 300);
        }}
      />
    </div>
  );
}

function AgentWork({ item, agentId, agentName }: { item: Item; agentId: string; agentName: string }) {
  const [status, setStatus] = useState<{ kind: "idle" | "busy" | "ok" | "error"; text?: string }>({ kind: "idle" });
  const run = async () => {
    setStatus({ kind: "busy" });
    try {
      const res = await fetch(`/api/agents/${agentId}/work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setStatus({ kind: "ok", text: json.message ?? `${agentName} is on it.` });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    }
  };
  return (
    <div className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3">
      <Bot size={16} className="text-accent" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px]">Assigned to agent {agentName}</div>
        {status.text && <div className={clsx("mt-0.5 text-[12px]", status.kind === "error" ? "text-danger" : "text-muted")}>{status.text}</div>}
      </div>
      <Button size="sm" variant="primary" disabled={status.kind === "busy"} onClick={() => void run()}>
        {status.kind === "busy" ? `${agentName} is working…` : `Ask ${agentName} to work on it`}
      </Button>
    </div>
  );
}

function SubIssues({ item }: { item: Item }) {
  const db = useStore((s) => s.db);
  const setUI = useStore((s) => s.setUI);
  const subs = useMemo(
    () => Object.values(db.items).filter((i) => i.kind === "issue" && i.parentId === item.id && !i.archived).sort((a, b) => a.createdAt - b.createdAt),
    [db.items, item.id],
  );
  const done = subs.filter((s) => db.settings.states.find((st) => st.id === s.stateId)?.type === "completed").length;
  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <h2 className="text-[13px] font-medium">Sub-issues</h2>
        {subs.length > 0 && (
          <span className="text-[12px] text-faint">
            {done}/{subs.length}
          </span>
        )}
        <button
          className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-fg"
          onClick={() => setUI({ createIssue: { teamId: item.teamId, parentId: item.id, projectId: item.projectId ?? undefined } })}
        >
          <Plus size={12} /> Add sub-issue
        </button>
      </div>
      <div className="-mx-4">
        {subs.map((s) => (
          <IssueRow key={s.id} item={s} showProject={false} />
        ))}
      </div>
    </section>
  );
}

function ActivityAndComments({ item }: { item: Item }) {
  const db = useStore((s) => s.db);
  const [body, setBody] = useState("");
  const me = db.members[db.settings.currentUserId];
  const feed = useMemo(() => {
    const comments = Object.values(db.comments)
      .filter((c) => c.itemId === item.id)
      .map((c) => ({ kind: "comment" as const, at: c.createdAt, id: c.id, authorId: c.authorId, text: c.body }));
    const acts = Object.values(db.activity)
      .filter((a) => a.itemId === item.id && a.verb !== "commented on")
      .map((a) => ({ kind: "activity" as const, at: a.createdAt, id: a.id, authorId: a.actorId, text: a.verb + (a.detail ? ` · ${a.detail}` : "") }));
    const proposals = Object.values(db.proposals)
      .filter((p) => p.itemId === item.id && p.status === "pending")
      .map((p) => ({ kind: "proposal" as const, at: p.createdAt, id: p.id, authorId: p.agentId, text: p.rationale }));
    return [...comments, ...acts, ...proposals].sort((a, b) => a.at - b.at);
  }, [db.comments, db.activity, db.proposals, item.id]);

  const submit = () => {
    if (!body.trim()) return;
    addComment(item.id, body.trim());
    setBody("");
  };

  return (
    <section className="mt-10">
      <h2 className="border-b border-line pb-2 text-[13px] font-medium">Activity</h2>
      <ol className="mt-3 space-y-3">
        <li className="flex items-center gap-2 text-[12px] text-muted">
          <Avatar member={db.members[item.createdBy]} size={16} />
          <span className="text-fg">{db.members[item.createdBy]?.name ?? "Someone"}</span> created the issue
          <span className="text-faint">· {relativeTime(item.createdAt)}</span>
        </li>
        {feed.map((f) => {
          const who = db.members[f.authorId];
          if (f.kind === "comment")
            return (
              <li key={f.id} className="rounded-lg border border-line bg-panel p-3">
                <div className="flex items-center gap-2 text-[12px]">
                  <Avatar member={who} size={18} />
                  <span className="font-medium">{who?.name ?? "Someone"}</span>
                  {who?.kind === "agent" && <span className="rounded bg-accent-soft px-1 text-[10px] text-accent">agent</span>}
                  <span className="text-faint">{relativeTime(f.at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed">{f.text}</p>
              </li>
            );
          if (f.kind === "proposal")
            return (
              <li key={f.id} className="flex items-center gap-2 rounded-lg border border-dashed border-accent/50 bg-accent-soft px-3 py-2 text-[12px]">
                <Avatar member={who} size={16} />
                <span>
                  <span className="font-medium">{who?.name}</span> proposed an action: <span className="text-muted">{f.text}</span>
                </span>
                <Link href="/approvals" className="ml-auto text-accent hover:underline">
                  Review
                </Link>
              </li>
            );
          return (
            <li key={f.id} className="flex items-center gap-2 text-[12px] text-muted">
              <Avatar member={who} size={16} />
              <span className="text-fg">{who?.name ?? "Someone"}</span> {f.text}
              <span className="text-faint">· {relativeTime(f.at)}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 rounded-lg border border-line bg-panel focus-within:border-line-strong">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="Leave a comment…"
          aria-label="Comment"
          className="w-full resize-none bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-faint"
        />
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="flex items-center gap-1.5 text-[11px] text-faint">
            <Avatar member={me} size={14} /> ⌘↵ to send
          </span>
          <Button size="sm" variant="primary" disabled={!body.trim()} onClick={submit}>
            Comment
          </Button>
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <span className="w-20 shrink-0 text-[12px] text-faint">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function PropertySidebar({ item }: { item: Item }) {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const state = db.settings.states.find((s) => s.id === item.stateId);
  const archive = () => {
    if (!confirm("Delete this issue? It will be archived.")) return;
    void useStore.getState().dispatch([
      { type: "update", coll: "items", id: item.id, patch: { archived: true, updatedAt: Date.now() } },
      activityOp(db.settings.currentUserId, "deleted", item.id),
    ]);
    router.push(item.teamId ? `/team/${db.teams[item.teamId]?.key}/issues` : "/my-issues");
  };
  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-line bg-elev px-4 py-4 md:block" aria-label="Issue properties">
      <div className="space-y-0.5">
        <Row label="Status">
          <StatusMenu value={item.stateId} showLabel onChange={(stateId) => updateIssue(item.id, { stateId })} />
        </Row>
        <Row label="Priority">
          <PriorityMenu value={item.priority} showLabel onChange={(priority) => updateIssue(item.id, { priority })} />
        </Row>
        <Row label="Assignee">
          <AssigneeMenu value={item.assigneeId} showLabel onChange={(assigneeId) => updateIssue(item.id, { assigneeId })} />
        </Row>
        <Row label="Labels">
          <LabelsMenu value={item.labelIds} onChange={(labelIds) => updateIssue(item.id, { labelIds })} />
        </Row>
        <Row label="Project">
          <ProjectMenu value={item.projectId} onChange={(projectId) => updateIssue(item.id, { projectId })} />
        </Row>
        <Row label="Cycle">
          <CycleMenu value={item.cycleId} teamId={item.teamId} onChange={(cycleId) => updateIssue(item.id, { cycleId })} />
        </Row>
        <Row label="Estimate">
          <EstimateMenu value={item.estimate} onChange={(estimate) => updateIssue(item.id, { estimate })} />
        </Row>
        <Row label="Due date">
          <DueDateInput value={item.dueDate} onChange={(dueDate) => updateIssue(item.id, { dueDate })} />
        </Row>
      </div>
      <div className="mt-6 space-y-1 border-t border-line pt-4 text-[12px] text-faint">
        <div className="flex items-center gap-2">
          <StatusIcon state={state} size={12} /> {state?.name}
        </div>
        <div>Created {relativeTime(item.createdAt)}</div>
        <div>Updated {relativeTime(item.updatedAt)}</div>
      </div>
      <button onClick={archive} className="mt-6 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] text-faint hover:bg-hover hover:text-danger">
        <Trash2 size={12} /> Delete issue
      </button>
    </aside>
  );
}
