"use client";

import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { clsx, EmptyState, PageHeader } from "@/components/ui";
import { ProposalCard } from "@/components/approvals/ProposalCard";

export default function ApprovalsPage() {
  const db = useStore((s) => s.db);
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const all = useMemo(() => Object.values(db.proposals).sort((a, b) => b.createdAt - a.createdAt), [db.proposals]);
  const pending = all.filter((p) => p.status === "pending");
  const decided = all.filter((p) => p.status !== "pending");
  const list = tab === "pending" ? pending : decided;

  return (
    <>
      <PageHeader title="Approvals" icon={<CheckCheck size={14} className="text-muted" />}>
        <div className="flex rounded-md border border-line p-0.5" role="tablist">
          {(["pending", "decided"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("rounded px-2.5 py-0.5 text-xs", tab === t ? "bg-active text-fg" : "text-muted hover:text-fg")}>
              {t === "pending" ? `Pending ${pending.length}` : `Decided ${decided.length}`}
            </button>
          ))}
        </div>
      </PageHeader>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <p className="mb-5 text-muted">
            The human gate. Agents propose; you decide. Every decision is recorded and shapes each agent&apos;s track record — and how much autonomy it earns.
          </p>
          {!list.length ? (
            <EmptyState title={tab === "pending" ? "Nothing waiting on you" : "No decisions yet"} body={tab === "pending" ? "When an agent proposes a change on a call or while working an issue, it shows up here." : undefined} />
          ) : (
            <div className="space-y-3">
              {list.map((p) => (
                <ProposalCard key={p.id} proposal={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
