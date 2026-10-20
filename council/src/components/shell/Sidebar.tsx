"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bot,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FolderKanban,
  Inbox,
  Plug,
  Plus,
  Radio,
  Search,
  Settings,
  SquarePen,
  RefreshCcw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { agents as listAgents, currentUser } from "@/lib/workspace";
import { Avatar, clsx, Kbd } from "@/components/ui";
import { PageTree } from "./PageTree";
import { createPage } from "@/components/pages/actions";

function NavLink({ href, icon, label, badge, exact }: { href: string; icon: React.ReactNode; label: string; badge?: number; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={clsx(
        "group flex h-7 items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
        active ? "bg-active text-fg" : "text-muted hover:bg-hover hover:text-fg",
      )}
    >
      <span className="flex w-4 justify-center text-faint group-hover:text-muted">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {!!badge && <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-fg">{badge}</span>}
    </Link>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-4">
      <div className="group flex h-6 items-center px-2 text-[11px] font-medium text-faint">
        <button className="flex flex-1 items-center gap-1 hover:text-muted" onClick={() => setOpen(!open)} aria-expanded={open}>
          {title}
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span className="opacity-0 group-hover:opacity-100">{action}</span>
      </div>
      {open && <div className="mt-0.5 space-y-px">{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const db = useStore((s) => s.db);
  const setUI = useStore((s) => s.setUI);
  const router = useRouter();
  const connected = useStore((s) => s.connected);
  const me = currentUser(db);
  const teams = useMemo(() => Object.values(db.teams), [db.teams]);
  const council = useMemo(() => listAgents(db), [db]);
  const pending = useMemo(() => Object.values(db.proposals).filter((p) => p.status === "pending").length, [db.proposals]);
  const liveCalls = useMemo(() => Object.values(db.calls).filter((c) => c.status === "live").length, [db.calls]);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-elev">
      <div className="flex h-11 items-center gap-2 px-3">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[11px] font-bold text-white">◆</div>
        <span className="flex-1 truncate font-semibold">{db.settings.workspaceName}</span>
        <span title={connected ? "Live sync connected" : "Reconnecting…"} className={clsx("h-1.5 w-1.5 rounded-full", connected ? "bg-success" : "bg-warning")} />
        <button
          className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg"
          title="New issue (C)"
          aria-label="New issue"
          onClick={() => setUI({ createIssue: {} })}
        >
          <SquarePen size={15} />
        </button>
      </div>

      <div className="px-2">
        <button
          onClick={() => setUI({ paletteOpen: true })}
          className="flex h-7 w-full items-center gap-2 rounded-md border border-line bg-panel px-2 text-muted hover:text-fg"
        >
          <Search size={13} />
          <span className="flex-1 text-left">Search or command…</span>
          <Kbd>⌘K</Kbd>
        </button>

        <Link
          href="/call"
          className="mt-2 flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600/90 to-fuchsia-600/80 px-3 font-medium text-white shadow-sm hover:brightness-110"
        >
          <Radio size={15} />
          <span className="flex-1">Call the council</span>
          {liveCalls > 0 && <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{liveCalls} live</span>}
        </Link>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        <div className="space-y-px">
          <NavLink href="/inbox" icon={<Inbox size={14} />} label="Inbox" />
          <NavLink href="/my-issues" icon={<CircleDot size={14} />} label="My issues" />
          <NavLink href="/approvals" icon={<CheckCheck size={14} />} label="Approvals" badge={pending} />
          <NavLink href="/projects" icon={<FolderKanban size={14} />} label="Projects" />
        </div>

        <Section title="Teams">
          {teams.map((t) => (
            <TeamNav key={t.id} teamKey={t.key} name={t.name} icon={t.icon} color={t.color} />
          ))}
        </Section>

        <Section
          title="Pages"
          action={
            <button className="rounded p-0.5 hover:bg-hover" aria-label="New page" onClick={() => void createPage(null).then((id) => router.push(`/page/${id}`))}>
              <Plus size={12} />
            </button>
          }
        >
          <PageTree />
        </Section>

        <Section title="Council">
          {council.map((a) => (
            <Link key={a.id} href={`/agents/${a.id}`} className="flex h-7 items-center gap-2 rounded-md px-2 text-muted hover:bg-hover hover:text-fg">
              <Avatar member={a} size={16} />
              <span className="flex-1 truncate">{a.name}</span>
              <span className="truncate text-[11px] text-faint">{a.agent?.role}</span>
            </Link>
          ))}
          <NavLink href="/agents" icon={<Bot size={14} />} label="Manage agents" exact />
        </Section>

        <Section title="Workspace">
          <NavLink href="/integrations" icon={<Plug size={14} />} label="Integrations" />
          <NavLink href="/settings" icon={<Settings size={14} />} label="Settings" />
        </Section>
      </nav>

      <div className="flex items-center gap-2 border-t border-line px-3 py-2">
        <Avatar member={me} size={20} />
        <span className="flex-1 truncate text-muted">{me?.name}</span>
        <button
          title="Toggle theme"
          aria-label="Toggle theme"
          className="rounded p-1 text-faint hover:bg-hover hover:text-fg"
          onClick={() => void useStore.getState().dispatch([{ type: "settings", patch: { theme: db.settings.theme === "dark" ? "light" : "dark" } }])}
        >
          <RefreshCcw size={12} />
        </button>
      </div>
    </aside>
  );
}

function TeamNav({ teamKey, name, icon, color }: { teamKey: string; name: string; icon: string; color: string }) {
  const path = usePathname();
  const base = `/team/${teamKey}`;
  const [open, setOpen] = useState(path.startsWith(base) || teamKey === "ENG");
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-muted hover:bg-hover hover:text-fg" aria-expanded={open}>
        <span className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-white" style={{ background: color }}>
          {icon}
        </span>
        <span className="flex-1 truncate text-left">{name}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="ml-4 space-y-px border-l border-line pl-2">
          <NavLink href={`${base}/issues`} icon={<span className="text-[10px]">◇</span>} label="Issues" />
          <NavLink href={`${base}/board`} icon={<span className="text-[10px]">▦</span>} label="Board" />
          <NavLink href={`${base}/cycles`} icon={<span className="text-[10px]">↻</span>} label="Cycles" />
        </div>
      )}
    </div>
  );
}
