"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import type { Member } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { AUTONOMY } from "./constants";

export function TrackRecord({ agent }: { agent: Member }) {
  const s = agent.agent?.stats ?? { proposed: 0, approved: 0, rejected: 0 };
  const decided = s.approved + s.rejected;
  const rate = decided ? Math.round((s.approved / decided) * 100) : null;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-faint">
        <span>{s.proposed} proposed · {s.approved} approved · {s.rejected} rejected</span>
        <span>{rate === null ? "no decisions yet" : `${rate}% approved`}</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded bg-active">
        {decided > 0 && (
          <>
            <div className="bg-success" style={{ width: `${(s.approved / decided) * 100}%` }} />
            <div className="bg-danger" style={{ width: `${(s.rejected / decided) * 100}%` }} />
          </>
        )}
      </div>
    </div>
  );
}

export function AgentCard({ agent }: { agent: Member }) {
  const a = agent.agent;
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-strong">
      <Link href={`/agents/${agent.id}`} className="absolute inset-0 rounded-xl" aria-label={`Open ${agent.name}`} />
      <div className="flex items-center gap-3">
        <Avatar member={agent} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium">
            {agent.name}
            {a?.lead && <span className="rounded bg-accent-soft px-1 text-[10px] text-accent">lead</span>}
          </div>
          <div className="text-xs text-muted">{a?.role}</div>
        </div>
        <Link href={`/call?agents=${agent.id}`} className="relative z-10 ml-auto rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg" title={`Call ${agent.name}`} aria-label={`Call ${agent.name}`}>
          <Phone size={14} />
        </Link>
      </div>
      <p className="line-clamp-3 text-xs leading-relaxed text-muted">{a?.persona}</p>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded border border-line px-2 py-0.5 text-muted">{a?.model}</span>
        <span className="rounded border border-line px-2 py-0.5 text-muted">{AUTONOMY.find((x) => x.value === a?.autonomy)?.label}</span>
      </div>
      <TrackRecord agent={agent} />
    </div>
  );
}
