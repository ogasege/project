"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { issues as allIssues } from "@/lib/workspace";
import { Avatar, Button, PageHeader, clsx } from "@/components/ui";
import { FilterBar } from "@/components/issues/FilterBar";
import { IssueList } from "@/components/issues/IssueList";
import { EMPTY_FILTERS, applyFilters, type IssueFilters } from "@/components/issues/helpers";

type Tab = "assigned" | "created" | "agents";

export default function MyIssuesPage() {
  const db = useStore((s) => s.db);
  const setUI = useStore((s) => s.setUI);
  const me = db.settings.currentUserId;
  const [tab, setTab] = useState<Tab>("assigned");
  const [filters, setFilters] = useState<IssueFilters>(EMPTY_FILTERS);

  const base = useMemo(() => {
    const list = allIssues(db);
    if (tab === "assigned") return list.filter((i) => i.assigneeId === me);
    if (tab === "created") return list.filter((i) => i.createdBy === me);
    return list.filter((i) => i.assigneeId && db.members[i.assigneeId]?.kind === "agent");
  }, [db, tab, me]);
  const filtered = useMemo(() => applyFilters(base, filters), [base, filters]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "assigned", label: "Assigned" },
    { id: "created", label: "Created" },
    { id: "agents", label: "Agents' work" },
  ];

  return (
    <>
      <PageHeader
        icon={<Avatar member={db.members[me]} size={18} />}
        title={
          <span className="flex items-center gap-3">
            My issues
            <span className="flex items-center gap-0.5" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx("rounded-md px-2 py-0.5 text-[12px]", tab === t.id ? "bg-active text-fg" : "text-muted hover:bg-hover hover:text-fg")}
                >
                  {t.label}
                </button>
              ))}
            </span>
          </span>
        }
      >
        <Button size="sm" onClick={() => setUI({ createIssue: tab === "assigned" ? { assigneeId: me } : {} })}>
          <Plus size={13} /> New issue
        </Button>
      </PageHeader>
      <FilterBar filters={filters} onChange={setFilters} count={filtered.length} />
      <IssueList
        issues={filtered}
        createDefaults={tab === "assigned" ? { assigneeId: me } : undefined}
        emptyTitle={tab === "agents" ? "No issues assigned to agents" : "Nothing here"}
        emptyBody={tab === "agents" ? "Assign an issue to Atlas, Vera, Forge or Scout and it will show up here." : "Issues you're assigned to or created will show up here."}
      />
    </>
  );
}
