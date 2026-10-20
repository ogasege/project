"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Team } from "@/lib/types";
import { issues as allIssues } from "@/lib/workspace";
import { Button, EmptyState, PageHeader, clsx } from "@/components/ui";
import { Board } from "./Board";
import { FilterBar } from "./FilterBar";
import { EMPTY_FILTERS, applyFilters, type IssueFilters } from "./helpers";
import { IssueList } from "./IssueList";

export function useTeam(): Team | undefined {
  const params = useParams<{ key: string }>();
  const db = useStore((s) => s.db);
  const key = decodeURIComponent(params.key ?? "").toUpperCase();
  return useMemo(() => Object.values(db.teams).find((t) => t.key === key), [db.teams, key]);
}

export function TeamHeader({ team }: { team: Team }) {
  const path = usePathname();
  const setUI = useStore((s) => s.setUI);
  const tabs = [
    { href: `/team/${team.key}/issues`, label: "Issues" },
    { href: `/team/${team.key}/board`, label: "Board" },
    { href: `/team/${team.key}/cycles`, label: "Cycles" },
  ];
  return (
    <PageHeader
      icon={
        <span className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-white" style={{ background: team.color }}>
          {team.icon}
        </span>
      }
      title={
        <span className="flex items-center gap-3">
          {team.name}
          <span className="flex items-center gap-0.5">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={clsx("rounded-md px-2 py-0.5 text-[12px]", path === t.href ? "bg-active text-fg" : "text-muted hover:bg-hover hover:text-fg")}
              >
                {t.label}
              </Link>
            ))}
          </span>
        </span>
      }
    >
      <Button size="sm" variant="subtle" onClick={() => setUI({ createIssue: { teamId: team.id } })}>
        <Plus size={13} /> New issue
      </Button>
    </PageHeader>
  );
}

export function TeamIssuesView({ mode }: { mode: "list" | "board" }) {
  const team = useTeam();
  const db = useStore((s) => s.db);
  const [filters, setFilters] = useState<IssueFilters>(EMPTY_FILTERS);
  const teamIssues = useMemo(() => (team ? allIssues(db).filter((i) => i.teamId === team.id) : []), [db, team]);
  const filtered = useMemo(() => applyFilters(teamIssues, filters), [teamIssues, filters]);
  if (!team) return <EmptyState title="Team not found" body="This team doesn't exist in the workspace." />;
  return (
    <>
      <TeamHeader team={team} />
      <FilterBar filters={filters} onChange={setFilters} count={filtered.length} />
      {mode === "list" ? (
        <IssueList issues={filtered} createDefaults={{ teamId: team.id }} emptyTitle={teamIssues.length ? "No matching issues" : "No issues yet"} />
      ) : (
        <Board issues={filtered} createDefaults={{ teamId: team.id }} />
      )}
    </>
  );
}
