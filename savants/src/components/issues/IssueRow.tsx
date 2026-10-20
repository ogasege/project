"use client";

import { useRouter } from "next/navigation";
import { forwardRef } from "react";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { identifier, relativeTime } from "@/lib/workspace";
import { LabelPill, clsx } from "@/components/ui";
import { issueHref } from "./helpers";
import { IssueAssignee, IssuePriority, IssueStatus, ProjectGlyph } from "./PropertyMenus";

export const IssueRow = forwardRef<HTMLDivElement, { item: Item; selected?: boolean; onHover?: () => void; showProject?: boolean }>(function IssueRow(
  { item, selected, onHover, showProject = true },
  ref,
) {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const href = issueHref(db, item);
  const project = item.projectId ? db.projects[item.projectId] : null;
  const labels = (item.labelIds ?? []).map((id) => db.labels[id]).filter(Boolean);
  const subCount = Object.values(db.items).filter((i) => i.parentId === item.id && i.kind === "issue" && !i.archived).length;

  return (
    <div
      ref={ref}
      role="row"
      tabIndex={-1}
      data-selected={selected || undefined}
      onMouseEnter={onHover}
      onClick={() => router.push(href)}
      onKeyDown={(e) => e.key === "Enter" && router.push(href)}
      className={clsx(
        "group flex h-11 cursor-default items-center gap-2.5 border-b-[0.5px] border-line-row pl-6 pr-4 text-[13px] outline-none transition-colors duration-100",
        selected ? "bg-hover" : "hover:bg-hover",
      )}
    >
      <IssuePriority item={item} />
      <span className="w-[56px] shrink-0 truncate text-[13px] font-normal text-faint tabular-nums">{identifier(db, item)}</span>
      <IssueStatus item={item} />
      <span className="min-w-0 flex-1 truncate font-medium text-fg">
        {item.title || "Untitled"}
        {subCount > 0 && <span className="ml-2 text-[11px] text-faint">{subCount} sub-issue{subCount === 1 ? "" : "s"}</span>}
      </span>
      <span className="hidden items-center gap-1 lg:flex">
        {labels.slice(0, 3).map((l) => (
          <LabelPill key={l.id} name={l.name} color={l.color} />
        ))}
      </span>
      {showProject && project && (
        <span className="hidden h-[22px] max-w-[180px] items-center gap-1.5 truncate rounded-full border-[0.5px] border-line-strong px-2 text-[12px] font-medium text-faint md:flex">
          <ProjectGlyph icon={project.icon} color={project.color} size={12} />
          <span className="truncate">{project.name}</span>
        </span>
      )}
      {item.dueDate && <span className="hidden w-14 shrink-0 text-right text-[12px] text-faint sm:block">{item.dueDate.slice(5)}</span>}
      <span className="w-14 shrink-0 text-right text-[12px] text-faint">{relativeTime(item.updatedAt)}</span>
      <IssueAssignee item={item} />
    </div>
  );
});
