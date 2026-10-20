"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { FolderKanban } from "lucide-react";
import { useStore } from "@/lib/store";
import { issues as allIssues } from "@/lib/workspace";
import { Avatar, PageHeader } from "@/components/ui";
import { ProjectGlyph } from "@/components/issues/PropertyMenus";
import { ProjectStatusBadge, ProgressRing } from "@/components/issues/ProjectBits";
import { statusProgress } from "@/components/issues/helpers";

export default function ProjectsPage() {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const rows = useMemo(() => {
    const issues = allIssues(db);
    const order = { started: 0, planned: 1, paused: 2, completed: 3, canceled: 4 } as const;
    return Object.values(db.projects)
      .map((p) => ({ p, prog: statusProgress(db, issues.filter((i) => i.projectId === p.id)) }))
      .sort((a, b) => order[a.p.status] - order[b.p.status] || (a.p.targetDate ?? "9").localeCompare(b.p.targetDate ?? "9"));
  }, [db]);

  return (
    <>
      <PageHeader title="Projects" icon={<FolderKanban size={15} className="text-muted" />} />
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="h-9 border-b border-line text-left text-[12px] text-faint">
              <th className="px-4 font-normal">Name</th>
              <th className="font-normal">Status</th>
              <th className="font-normal">Lead</th>
              <th className="font-normal">Target date</th>
              <th className="pr-4 font-normal">Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, prog }) => (
              <tr
                key={p.id}
                tabIndex={0}
                onClick={() => router.push(`/project/${p.id}`)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/project/${p.id}`)}
                className="h-11 cursor-default border-b border-line/60 hover:bg-hover/70"
              >
                <td className="px-4">
                  <div className="flex items-center gap-2">
                    <ProjectGlyph icon={p.icon} color={p.color} size={18} />
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td>
                  <ProjectStatusBadge status={p.status} />
                </td>
                <td>
                  {p.leadId ? (
                    <span className="flex items-center gap-1.5 text-muted">
                      <Avatar member={db.members[p.leadId]} size={16} /> {db.members[p.leadId]?.name}
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="text-muted">{p.targetDate ? new Date(p.targetDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</td>
                <td className="pr-4">
                  <span className="flex items-center gap-2 text-muted">
                    <ProgressRing pct={prog.pct} color={p.color} />
                    {prog.pct}%
                    <span className="text-faint">
                      · {prog.done}/{prog.total}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
