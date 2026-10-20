"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Item, Priority } from "@/lib/types";
import { identifier } from "@/lib/workspace";
import { Button, Kbd, Menu, Modal } from "@/components/ui";
import { createIssue, issueHref } from "./helpers";
import { AssigneeMenu, LabelsMenu, PriorityMenu, ProjectMenu, StatusMenu } from "./PropertyMenus";

/** Global "new issue" modal, driven by `ui.createIssue` in the store. */
export function CreateIssueModal() {
  const db = useStore((s) => s.db);
  const req = useStore((s) => s.ui.createIssue);
  const setUI = useStore((s) => s.setUI);
  const teams = useMemo(() => Object.values(db.teams), [db.teams]);

  const [teamId, setTeamId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stateId, setStateId] = useState("st_todo");
  const [priority, setPriority] = useState<Priority>(0);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [createMore, setCreateMore] = useState(false);
  const [created, setCreated] = useState<Item | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset the form each time the modal opens with new defaults.
  useEffect(() => {
    if (!req) return;
    const parent = req.parentId ? db.items[req.parentId] : null;
    setTeamId(req.teamId ?? parent?.teamId ?? teams[0]?.id ?? "");
    setTitle("");
    setDescription("");
    setStateId(req.stateId ?? "st_todo");
    setPriority(0);
    setAssigneeId(req.assigneeId ?? null);
    setLabelIds([]);
    setProjectId(req.projectId ?? parent?.projectId ?? null);
    setParentId(req.parentId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  useEffect(() => {
    if (!created) return;
    const t = setTimeout(() => setCreated(null), 5000);
    return () => clearTimeout(t);
  }, [created]);

  const close = () => setUI({ createIssue: null });
  const team = db.teams[teamId];
  const parent = parentId ? db.items[parentId] : null;

  const submit = async () => {
    if (!title.trim() || !team) return;
    const item = await createIssue({ teamId, title, description, stateId, priority, assigneeId, labelIds, projectId, parentId });
    setCreated(item);
    if (createMore) {
      setTitle("");
      setDescription("");
      titleRef.current?.focus();
    } else close();
  };

  return (
    <>
      <Modal open={!!req} onClose={close} label="Create issue" className="w-[720px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        >
          <div className="flex items-center gap-2 px-4 pt-3 text-[12px] text-muted">
            <Menu
              className="h-6 rounded-md border border-line bg-panel px-2 text-fg hover:bg-hover"
              trigger={
                <>
                  <span className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-white" style={{ background: team?.color }}>
                    {team?.icon}
                  </span>
                  {team?.key}
                </>
              }
              value={teamId}
              options={teams.map((t) => ({ value: t.id, label: t.name, hint: t.key }))}
              onSelect={setTeamId}
            />
            <span>›</span>
            <span>New issue</span>
            {parent && (
              <span className="truncate">
                · sub-issue of <span className="font-mono text-faint">{identifier(db, parent)}</span> {parent.title}
              </span>
            )}
            <button type="button" onClick={close} aria-label="Close" className="ml-auto rounded p-1 hover:bg-hover hover:text-fg">
              <X size={14} />
            </button>
          </div>
          <div className="px-4 pt-3">
            <input
              ref={titleRef}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              aria-label="Issue title"
              className="w-full bg-transparent text-[18px] font-medium outline-none placeholder:text-faint"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description… (Markdown supported)"
              aria-label="Description"
              rows={5}
              className="mt-2 w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-faint"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 px-3 pb-3">
            <Chip><StatusMenu value={stateId} onChange={setStateId} showLabel /></Chip>
            <Chip><PriorityMenu value={priority} onChange={setPriority} showLabel /></Chip>
            <Chip><AssigneeMenu value={assigneeId} onChange={setAssigneeId} showLabel size={16} /></Chip>
            <Chip><LabelsMenu value={labelIds} onChange={setLabelIds} /></Chip>
            <Chip><ProjectMenu value={projectId} onChange={setProjectId} /></Chip>
          </div>
          <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={createMore} onChange={(e) => setCreateMore(e.target.checked)} className="accent-[var(--accent)]" />
              Create more
            </label>
            <span className="ml-auto flex items-center gap-1 text-[11px] text-faint">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
            </span>
            <Button type="submit" variant="primary" disabled={!title.trim()}>
              Create issue
            </Button>
          </div>
        </form>
      </Modal>
      {created && (
        <div role="status" className="animate-fade-in fixed bottom-4 right-4 z-[95] flex items-center gap-3 rounded border border-line-strong bg-bg px-4 py-3 shadow-[var(--shadow)]">
          <span className="text-success">●</span>
          <span>
            Created <span className="font-mono text-muted">{identifier(db, created)}</span>
          </span>
          <Link href={issueHref(db, created)} className="text-accent hover:underline" onClick={() => setCreated(null)}>
            View issue
          </Link>
        </div>
      )}
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md border border-line bg-panel">{children}</span>;
}
