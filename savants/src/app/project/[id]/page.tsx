"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, LayoutGrid, List, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { issues as allIssues } from "@/lib/workspace";
import { Avatar, Button, EmptyState, Menu, PageHeader, clsx } from "@/components/ui";
import { Board } from "@/components/issues/Board";
import { FilterBar } from "@/components/issues/FilterBar";
import { IssueList } from "@/components/issues/IssueList";
import { ProjectGlyph } from "@/components/issues/PropertyMenus";
import { PROJECT_STATUSES, ProgressRing, ProjectStatusBadge } from "@/components/issues/ProjectBits";
import { EMPTY_FILTERS, applyFilters, statusProgress, type IssueFilters } from "@/components/issues/helpers";

function updateProject(id: string, patch: Partial<Project>) {
  void useStore.getState().dispatch([{ type: "update", coll: "projects", id, patch: patch as Record<string, unknown> }]);
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const db = useStore((s) => s.db);
  const setUI = useStore((s) => s.setUI);
  const project = db.projects[id];
  const [mode, setMode] = useState<"list" | "board">("list");
  const [filters, setFilters] = useState<IssueFilters>(EMPTY_FILTERS);
  const [desc, setDesc] = useState(project?.description ?? "");

  useEffect(() => {
    if (project) setDesc(project.description);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const projectIssues = useMemo(() => allIssues(db).filter((i) => i.projectId === id), [db, id]);
  const filtered = useMemo(() => applyFilters(projectIssues, filters), [projectIssues, filters]);
  const prog = useMemo(() => statusProgress(db, projectIssues), [db, projectIssues]);
  const members = useMemo(() => Object.values(db.members), [db.members]);

  if (!project) return <EmptyState title="Project not found" action={<Link href="/projects" className="text-accent hover:underline">All projects</Link>} />;

  const lead = project.leadId ? db.members[project.leadId] : null;
  const defaultTeam = project.teamIds[0];

  return (
    <>
      <PageHeader
        icon={<ProjectGlyph icon={project.icon} color={project.color} size={18} />}
        title={
          <span className="flex items-center gap-1.5">
            <Link href="/projects" className="text-muted hover:text-fg">
              Projects
            </Link>
            <ChevronRight size={12} className="text-faint" />
            {project.name}
          </span>
        }
      >
        <span className="mr-1 flex rounded-md border border-line">
          <button aria-label="List view" onClick={() => setMode("list")} className={clsx("rounded-l-md p-1.5", mode === "list" ? "bg-active text-fg" : "text-muted hover:text-fg")}>
            <List size={13} />
          </button>
          <button aria-label="Board view" onClick={() => setMode("board")} className={clsx("rounded-r-md p-1.5", mode === "board" ? "bg-active text-fg" : "text-muted hover:text-fg")}>
            <LayoutGrid size={13} />
          </button>
        </span>
        <Button size="sm" variant="primary" onClick={() => setUI({ createIssue: { teamId: defaultTeam, projectId: project.id } })}>
          <Plus size={13} /> New issue
        </Button>
      </PageHeader>

      <div className="flex shrink-0 flex-wrap items-start gap-8 border-b border-line px-6 py-5">
        <div className="min-w-[280px] flex-1">
          <h1 className="text-[20px] font-semibold">{project.name}</h1>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => desc !== project.description && updateProject(project.id, { description: desc })}
            rows={2}
            placeholder="Add a short summary…"
            aria-label="Project summary"
            className="mt-1 w-full resize-none bg-transparent text-muted outline-none placeholder:text-faint"
          />
        </div>
        <dl className="grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1.5 text-[12px]">
          <dt className="text-faint">Status</dt>
          <dd>
            <Menu
              className="h-6 rounded-md px-1.5 hover:bg-hover"
              trigger={<ProjectStatusBadge status={project.status} />}
              value={project.status}
              options={PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label, icon: <span className="h-2 w-2 rounded" style={{ background: s.color }} /> }))}
              onSelect={(status) => updateProject(project.id, { status })}
            />
          </dd>
          <dt className="text-faint">Lead</dt>
          <dd>
            <Menu
              className="h-6 rounded-md px-1.5 hover:bg-hover"
              trigger={
                <>
                  <Avatar member={lead} size={16} />
                  <span className={lead ? "" : "text-muted"}>{lead?.name ?? "No lead"}</span>
                </>
              }
              value={project.leadId ?? "__none"}
              options={[{ value: "__none", label: "No lead" }, ...members.map((m) => ({ value: m.id, label: m.name, icon: <Avatar member={m} size={16} /> }))]}
              onSelect={(v) => updateProject(project.id, { leadId: v === "__none" ? null : v })}
            />
          </dd>
          <dt className="text-faint">Target</dt>
          <dd>
            <input
              type="date"
              value={project.targetDate ?? ""}
              onChange={(e) => updateProject(project.id, { targetDate: e.target.value || null })}
              aria-label="Target date"
              className="h-6 rounded-md bg-transparent px-1.5 outline-none hover:bg-hover"
            />
          </dd>
          <dt className="text-faint">Progress</dt>
          <dd className="flex items-center gap-2 px-1.5">
            <ProgressRing pct={prog.pct} color={project.color} />
            {prog.pct}% · {prog.done}/{prog.total}
          </dd>
        </dl>
      </div>

      <FilterBar filters={filters} onChange={setFilters} count={filtered.length} />
      {mode === "list" ? (
        <IssueList issues={filtered} showProject={false} createDefaults={{ teamId: defaultTeam, projectId: project.id }} emptyTitle="No issues in this project" />
      ) : (
        <Board issues={filtered} createDefaults={{ teamId: defaultTeam, projectId: project.id }} />
      )}
    </>
  );
}
