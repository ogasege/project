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
  Inbox,
  Layers,
  Moon,
  Plug,
  Plus,
  Radio,
  Search,
  Settings,
  SquarePen,
  Sun,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { agents as listAgents, currentUser } from "@/lib/workspace";
import { Avatar, clsx } from "@/components/ui";
import { PageTree } from "./PageTree";
import { createPage } from "@/components/pages/actions";

// Sidebar measured against Linear: 244px wide, 28px rows, 13px medium text in the sidebar grey,
// selected row on a raised background, section labels at 12px.

function NavLink({ href, icon, label, badge, exact, accent }: { href: string; icon: React.ReactNode; label: string; badge?: number; exact?: boolean; accent?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={clsx(
        "group flex h-7 items-center gap-2 rounded-md pl-2 pr-1.5 text-[13px] font-medium transition-colors duration-100",
        active ? "bg-active text-fg" : "text-sidebar hover:bg-hover hover:text-muted",
      )}
    >
      <span className={clsx("flex w-4 shrink-0 justify-center", accent ? "text-accent" : active ? "text-fg" : "text-faint group-hover:text-muted")}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {!!badge && <span className="text-[12px] font-medium text-faint">{badge}</span>}
    </Link>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-5">
      <div className="group flex h-6 items-center pl-2 pr-1.5">
        <button className="flex flex-1 items-center gap-1 text-[12px] font-medium text-faint hover:text-muted" onClick={() => setOpen(!open)} aria-expanded={open}>
          {title}
          <ChevronDown size={11} className={clsx("transition-transform duration-150", !open && "-rotate-90")} />
        </button>
        <span className="opacity-0 transition-opacity group-hover:opacity-100">{action}</span>
      </div>
      {open && <div className="mt-0.5 space-y-px">{children}</div>}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={label} aria-label={label} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-hover hover:text-fg">
      {children}
    </button>
  );
}

export function Sidebar() {
  const db = useStore((s) => s.db);
  const setUI = useStore((s) => s.setUI);
  const router = useRouter();
  const me = currentUser(db);
  const teams = useMemo(() => Object.values(db.teams), [db.teams]);
  const savants = useMemo(() => listAgents(db), [db]);
  const pending = useMemo(() => Object.values(db.proposals).filter((p) => p.status === "pending").length, [db.proposals]);
  const unread = useMemo(() => Object.values(db.activity).filter((a) => a.actorId !== db.settings.currentUserId && !(a.readBy ?? []).includes(db.settings.currentUserId)).length, [db.activity, db.settings.currentUserId]);
  const liveCalls = useMemo(() => Object.values(db.calls).filter((c) => c.status === "live").length, [db.calls]);
  const dark = db.settings.theme === "dark";

  return (
    <aside className="flex w-[244px] shrink-0 flex-col">
      {/* Workspace row */}
      <div className="flex h-[52px] items-center gap-1 pl-3 pr-2">
        <button className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-hover" onClick={() => router.push("/settings")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dark ? "/brand/emeka-icon-white.svg" : "/brand/emeka-icon-black.svg"} alt="" className="h-[18px] w-auto" />
          <span className="truncate text-[13px] font-semibold text-fg">{db.settings.workspaceName}</span>
          <ChevronDown size={12} className="shrink-0 text-faint" />
        </button>
        <IconButton label="Search (⌘K)" onClick={() => setUI({ paletteOpen: true })}>
          <Search size={15} />
        </IconButton>
        <IconButton label="New issue (C)" onClick={() => setUI({ createIssue: {} })}>
          <SquarePen size={15} />
        </IconButton>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="space-y-px">
          <NavLink href="/inbox" icon={<Inbox size={15} />} label="Inbox" badge={unread} />
          <NavLink href="/my-issues" icon={<CircleDot size={15} />} label="My issues" />
          <NavLink href="/approvals" icon={<CheckCheck size={15} />} label="Approvals" badge={pending} />
          <NavLink href="/call" icon={<Radio size={15} />} label={liveCalls ? `Call the savants · ${liveCalls} live` : "Call the savants"} accent />
        </div>

        <Section title="Workspace">
          <NavLink href="/projects" icon={<Layers size={15} />} label="Projects" />
          <NavLink href="/agents" icon={<Bot size={15} />} label="Savants" exact />
          <NavLink href="/integrations" icon={<Plug size={15} />} label="Integrations" />
        </Section>

        <Section title="Your teams">
          {teams.map((t) => (
            <TeamNav key={t.id} teamKey={t.key} name={t.name} icon={t.icon} color={t.color} />
          ))}
        </Section>

        <Section
          title="Pages"
          action={
            <button className="flex h-5 w-5 items-center justify-center rounded text-faint hover:bg-hover hover:text-fg" aria-label="New page" onClick={() => void createPage(null).then((id) => router.push(`/page/${id}`))}>
              <Plus size={13} />
            </button>
          }
        >
          <PageTree />
        </Section>

        <Section title="Savants">
          {savants.map((a) => (
            <Link key={a.id} href={`/agents/${a.id}`} className="group flex h-7 items-center gap-2 rounded-md pl-2 pr-1.5 text-[13px] font-medium text-sidebar transition-colors hover:bg-hover hover:text-muted">
              <Avatar member={a} size={16} />
              <span className="flex-1 truncate">{a.name}</span>
              <span className="truncate text-[12px] font-normal text-faint opacity-0 transition-opacity group-hover:opacity-100">{a.agent?.role}</span>
            </Link>
          ))}
        </Section>
      </nav>

      <div className="flex items-center gap-1 px-3 pb-3 pt-2">
        <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-[13px] font-medium text-sidebar hover:bg-hover hover:text-muted">
          <Avatar member={me} size={18} />
          <span className="truncate">{me?.name}</span>
        </Link>
        <IconButton label={dark ? "Light theme" : "Dark theme"} onClick={() => void useStore.getState().dispatch([{ type: "settings", patch: { theme: dark ? "light" : "dark" } }])}>
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </IconButton>
        <Link href="/settings" title="Settings" aria-label="Settings" className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-hover hover:text-fg">
          <Settings size={14} />
        </Link>
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
      <button onClick={() => setOpen(!open)} className="group flex h-7 w-full items-center gap-2 rounded-md pl-2 pr-1.5 text-[13px] font-medium text-sidebar transition-colors hover:bg-hover hover:text-muted" aria-expanded={open}>
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[10px] font-semibold text-white" style={{ background: color }}>
          {icon}
        </span>
        <span className="truncate text-left">{name}</span>
        <ChevronRight size={11} className={clsx("text-faint transition-transform duration-150", open && "rotate-90")} />
      </button>
      {open && (
        <div className="space-y-px">
          <SubLink href={`${base}/issues`} label="Issues" />
          <SubLink href={`${base}/board`} label="Board" />
          <SubLink href={`${base}/cycles`} label="Cycles" />
        </div>
      )}
    </div>
  );
}

function SubLink({ href, label }: { href: string; label: string }) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");
  return (
    <Link href={href} className={clsx("flex h-7 items-center rounded-md pl-[34px] pr-1.5 text-[13px] font-medium transition-colors duration-100", active ? "bg-active text-fg" : "text-sidebar hover:bg-hover hover:text-muted")}>
      {label}
    </Link>
  );
}
