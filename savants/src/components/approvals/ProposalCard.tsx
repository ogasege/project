"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { identifier, relativeTime } from "@/lib/workspace";
import type { Proposal, ProposalAction } from "@/lib/types";
import { Avatar, Button, clsx } from "@/components/ui";
import { describeProposal, patchLines } from "./describe";

export async function decideProposal(id: string, approve: boolean, action?: ProposalAction): Promise<string | null> {
  const res = await fetch(`/api/proposals/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approve, action }),
  });
  if (!res.ok) return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Failed";
  return null;
}

const STATUS_STYLE: Record<Proposal["status"], string> = {
  pending: "text-warning",
  approved: "text-success",
  auto: "text-accent",
  rejected: "text-danger",
};
const STATUS_LABEL: Record<Proposal["status"], string> = { pending: "Awaiting approval", approved: "Approved", auto: "Auto-run (autonomy)", rejected: "Rejected" };

export function ProposalCard({ proposal, compact = false, tone = "app" }: { proposal: Proposal; compact?: boolean; tone?: "app" | "call" }) {
  const db = useStore((s) => s.db);
  const agent = db.members[proposal.agentId];
  const a = proposal.action;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState(a.type === "create_issue" || a.type === "create_page" ? a.title : "");
  const [body, setBody] = useState(a.type === "create_issue" ? a.description ?? "" : a.type === "create_page" || a.type === "append_to_item" ? a.markdown : a.type === "comment" ? a.body : "");
  const result = proposal.resultItemId ? db.items[proposal.resultItemId] : undefined;
  const ctxItem = proposal.itemId ? db.items[proposal.itemId] : undefined;

  const edited = (): ProposalAction | undefined => {
    if (!editing) return undefined;
    switch (a.type) {
      case "create_issue": return { ...a, title, description: body };
      case "create_page": return { ...a, title, markdown: body };
      case "append_to_item": return { ...a, markdown: body };
      case "comment": return { ...a, body };
      default: return undefined;
    }
  };

  const act = async (approve: boolean) => {
    setBusy(true);
    setErr(await decideProposal(proposal.id, approve, approve ? edited() : undefined));
    setBusy(false);
    setEditing(false);
  };

  const headline = a.type === "create_issue" || a.type === "create_page" ? a.title : null;
  const preview = a.type === "create_issue" ? a.description : a.type === "create_page" || a.type === "append_to_item" ? a.markdown : a.type === "comment" ? a.body : a.type === "integration_action" ? JSON.stringify(a.input) : null;
  const callTone = tone === "call";

  return (
    <div className={clsx("rounded-lg border p-3", callTone ? "border-line bg-elev" : "border-line bg-panel")}>
      <div className="flex items-center gap-2">
        <Avatar member={agent} size={18} />
        <span className="font-medium">{agent?.name ?? "Agent"}</span>
        <span className={clsx("text-xs", callTone ? "text-faint" : "text-faint")}>{describeProposal(db, a)}</span>
        <span className={clsx("ml-auto text-[11px]", STATUS_STYLE[proposal.status])}>{STATUS_LABEL[proposal.status]}</span>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {(a.type === "create_issue" || a.type === "create_page") && (
            <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-line bg-bg px-2 py-1 outline-none focus:border-accent" />
          )}
          <textarea aria-label="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={compact ? 4 : 7} className="w-full rounded-md border border-line bg-bg px-2 py-1 font-mono text-xs outline-none focus:border-accent" />
        </div>
      ) : (
        <>
          {headline && <div className={clsx("mt-1.5 font-medium", compact ? "text-[13px]" : "text-[14px]")}>{headline}</div>}
          {a.type === "update_issue" && (
            <ul className={clsx("mt-1.5 space-y-0.5 text-xs", callTone ? "text-muted" : "text-muted")}>
              {patchLines(db, a).map((l) => <li key={l}>{l}</li>)}
            </ul>
          )}
          {preview && <p className={clsx("mt-1 whitespace-pre-wrap text-xs", compact ? "line-clamp-3" : "line-clamp-6", callTone ? "text-muted" : "text-muted")}>{preview}</p>}
        </>
      )}
      {proposal.rationale && !compact && <p className="mt-2 text-xs italic text-faint">“{proposal.rationale}”</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {!compact && <span className="text-faint">{relativeTime(proposal.createdAt)}</span>}
        {ctxItem && !compact && (
          <Link className="text-faint underline-offset-2 hover:underline" href={ctxItem.kind === "issue" ? `/issue/${identifier(db, ctxItem)}` : `/page/${ctxItem.id}`}>
            on {ctxItem.kind === "issue" ? identifier(db, ctxItem) : ctxItem.title}
          </Link>
        )}
        {result && (
          <Link className="text-accent hover:underline" href={result.kind === "issue" ? `/issue/${identifier(db, result)}` : `/page/${result.id}`}>
            → {result.kind === "issue" ? identifier(db, result) : result.title}
          </Link>
        )}
        {proposal.status === "pending" && (
          <div className="ml-auto flex gap-1.5">
            {["create_issue", "create_page", "append_to_item", "comment"].includes(a.type) && !editing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit before approving">
                <Pencil size={12} /> Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(false)}>
              <X size={12} /> Reject
            </Button>
            <Button size="sm" variant="primary" disabled={busy} onClick={() => void act(true)}>
              <Check size={12} /> {editing ? "Save & approve" : "Approve"}
            </Button>
          </div>
        )}
      </div>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}
