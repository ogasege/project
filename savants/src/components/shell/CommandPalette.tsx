"use client";

import { PageIcon } from "@/components/PageIcon";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCheck,
  CircleDot,
  FilePlus,
  FolderKanban,
  Inbox,
  Keyboard,
  Moon,
  Plug,
  Radio,
  Search,
  Settings,
  SquarePen,
  Target,
  UserCheck,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { agents as listAgents, findByIdentifier, identifier, issues as allIssues, pages as allPages } from "@/lib/workspace";
import { Avatar, Kbd, Modal, StatusIcon, clsx } from "@/components/ui";
import { createPage } from "@/components/pages/actions";
import { issueHref, updateIssue } from "@/components/issues/helpers";
import { ProjectGlyph } from "@/components/issues/PropertyMenus";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: React.ReactNode;
  run: () => void;
}

/** Subsequence fuzzy score: higher is better, -1 means no match. Prefers prefix and word-start hits. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx === 0) return 1000 - t.length;
  if (idx > 0) return 800 - idx - (/[\s\-_/]/.test(t[idx - 1]) ? 0 : 100);
  let score = 0;
  let ti = 0;
  let last = -1;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    score += found === last + 1 ? 10 : 1;
    if (found === 0 || /[\s\-_/]/.test(t[found - 1])) score += 5;
    last = found;
    ti = found + 1;
  }
  return score;
}

const GROUP_ORDER = ["Current issue", "Actions", "Navigation", "Issues", "Pages", "Agents", "Projects"];

export function CommandPalette() {
  const open = useStore((s) => s.ui.paletteOpen);
  const setUI = useStore((s) => s.setUI);
  const db = useStore((s) => s.db);
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const close = () => setUI({ paletteOpen: false });
  const go = (href: string) => () => router.push(href);

  const commands = useMemo<Command[]>(() => {
    const me = db.settings.currentUserId;
    const cmds: Command[] = [];

    // Contextual: the issue currently open.
    const m = path.match(/^\/issue\/([^/]+)/);
    const current = m ? db.items[decodeURIComponent(m[1])] ?? findByIdentifier(db, decodeURIComponent(m[1])) : undefined;
    if (current?.kind === "issue") {
      const ident = identifier(db, current);
      for (const s of db.settings.states) {
        if (s.id === current.stateId) continue;
        cmds.push({ id: `cur-st-${s.id}`, group: "Current issue", label: `Set status: ${s.name}`, hint: ident, icon: <StatusIcon state={s} />, run: () => updateIssue(current.id, { stateId: s.id }) });
      }
      if (current.assigneeId !== me) cmds.push({ id: "cur-me", group: "Current issue", label: "Assign to me", hint: ident, icon: <UserCheck size={14} />, run: () => updateIssue(current.id, { assigneeId: me }) });
      for (const a of listAgents(db)) {
        if (current.assigneeId === a.id) continue;
        cmds.push({ id: `cur-ag-${a.id}`, group: "Current issue", label: `Assign to ${a.name}`, hint: a.agent?.role, icon: <Avatar member={a} size={14} />, run: () => updateIssue(current.id, { assigneeId: a.id }) });
      }
      cmds.push({ id: "cur-call", group: "Current issue", label: "Discuss on a call", hint: ident, icon: <Radio size={14} />, run: go(`/call?context=${current.id}`) });
    }

    cmds.push(
      { id: "new-issue", group: "Actions", label: "Create new issue", hint: "C", icon: <SquarePen size={14} />, run: () => setUI({ createIssue: {} }) },
      {
        id: "new-page",
        group: "Actions",
        label: "Create new page",
        hint: "N",
        icon: <FilePlus size={14} />,
        run: () => void createPage(null).then((id) => router.push(`/page/${id}`)),
      },
      { id: "call", group: "Actions", label: "Start a call with the savants", hint: "G C", keywords: "voice talk meeting", icon: <Radio size={14} />, run: go("/call") },
      ...listAgents(db).map((a) => ({
        id: `call-${a.id}`,
        group: "Actions",
        label: `Call ${a.name}`,
        hint: a.agent?.role,
        keywords: "voice talk",
        icon: <Avatar member={a} size={14} />,
        run: go(`/call?agents=${a.id}`),
      })),
      {
        id: "theme",
        group: "Actions",
        label: `Switch to ${db.settings.theme === "dark" ? "light" : "dark"} theme`,
        keywords: "appearance mode",
        icon: <Moon size={14} />,
        run: () => void useStore.getState().dispatch([{ type: "settings", patch: { theme: db.settings.theme === "dark" ? "light" : "dark" } }]),
      },
      { id: "shortcuts", group: "Actions", label: "Show keyboard shortcuts", hint: "?", icon: <Keyboard size={14} />, run: () => setUI({ shortcutsOpen: true }) },
      { id: "nav-outcomes", group: "Navigation", label: "Go to Outcomes", hint: "G O", icon: <Target size={14} />, run: go("/") },
      { id: "nav-inbox", group: "Navigation", label: "Go to Inbox", hint: "G I", icon: <Inbox size={14} />, run: go("/inbox") },
      { id: "nav-my", group: "Navigation", label: "Go to My issues", hint: "G M", icon: <CircleDot size={14} />, run: go("/my-issues") },
      { id: "nav-approvals", group: "Navigation", label: "Go to Approvals", icon: <CheckCheck size={14} />, run: go("/approvals") },
      { id: "nav-projects", group: "Navigation", label: "Go to Projects", hint: "G P", icon: <FolderKanban size={14} />, run: go("/projects") },
      { id: "nav-agents", group: "Navigation", label: "Go to Agents", hint: "G A", icon: <Bot size={14} />, run: go("/agents") },
      { id: "nav-integrations", group: "Navigation", label: "Go to Integrations", icon: <Plug size={14} />, run: go("/integrations") },
      { id: "nav-settings", group: "Navigation", label: "Go to Settings", hint: "G S", icon: <Settings size={14} />, run: go("/settings") },
    );
    for (const t of Object.values(db.teams)) {
      const icon = (
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded text-[9px] text-white" style={{ background: t.color }}>
          {t.icon}
        </span>
      );
      cmds.push(
        { id: `nav-${t.id}-i`, group: "Navigation", label: `${t.name} · Issues`, keywords: t.key, icon, run: go(`/team/${t.key}/issues`) },
        { id: `nav-${t.id}-b`, group: "Navigation", label: `${t.name} · Board`, keywords: t.key, icon, run: go(`/team/${t.key}/board`) },
        { id: `nav-${t.id}-c`, group: "Navigation", label: `${t.name} · Cycles`, keywords: t.key, icon, run: go(`/team/${t.key}/cycles`) },
      );
    }
    for (const i of allIssues(db).sort((a, b) => b.updatedAt - a.updatedAt)) {
      const ident = identifier(db, i);
      const state = db.settings.states.find((s) => s.id === i.stateId);
      cmds.push({ id: i.id, group: "Issues", label: i.title || "Untitled", hint: ident, keywords: ident, icon: <StatusIcon state={state} />, run: go(issueHref(db, i)) });
    }
    for (const p of allPages(db).sort((a, b) => b.updatedAt - a.updatedAt)) {
      cmds.push({ id: p.id, group: "Pages", label: p.title || "Untitled", icon: <PageIcon icon={p.icon} />, run: go(`/page/${p.id}`) });
    }
    for (const a of listAgents(db)) {
      cmds.push({ id: `agent-${a.id}`, group: "Agents", label: a.name, hint: a.agent?.role, icon: <Avatar member={a} size={14} />, run: go(`/agents/${a.id}`) });
    }
    for (const p of Object.values(db.projects)) {
      cmds.push({ id: p.id, group: "Projects", label: p.name, icon: <ProjectGlyph icon={p.icon} color={p.color} size={14} />, run: go(`/project/${p.id}`) });
    }
    return cmds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, path]);

  const results = useMemo(() => {
    if (!q.trim()) {
      // Empty query: contextual + actions + navigation + a few recent issues/pages.
      const limits: Record<string, number> = { "Current issue": 6, Actions: 5, Navigation: 6, Issues: 5, Pages: 3 };
      const counts: Record<string, number> = {};
      return commands.filter((c) => {
        const lim = limits[c.group] ?? 0;
        counts[c.group] = (counts[c.group] ?? 0) + 1;
        return counts[c.group] <= lim;
      });
    }
    const scored = commands
      .map((c) => ({ c, s: Math.max(fuzzyScore(q, c.label), c.hint ? fuzzyScore(q, c.hint) : -1, c.keywords ? fuzzyScore(q, c.keywords) - 5 : -1) }))
      .filter((x) => x.s >= 0);
    const byGroup = new Map<string, { c: Command; s: number }[]>();
    for (const x of scored) byGroup.set(x.c.group, [...(byGroup.get(x.c.group) ?? []), x]);
    return GROUP_ORDER.flatMap((g) => (byGroup.get(g) ?? []).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.c));
  }, [commands, q]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (c?: Command) => {
    if (!c) return;
    close();
    c.run();
  };

  let lastGroup = "";
  return (
    <Modal open={open} onClose={close} label="Command menu" className="w-[620px]">
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search size={15} className="text-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(results[active]);
            }
          }}
          placeholder="Type a command or search issues, pages, agents…"
          aria-label="Command"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
        />
        <Kbd>esc</Kbd>
      </div>
      <div ref={listRef} id="palette-list" role="listbox" className="max-h-[420px] overflow-y-auto p-1.5">
        {!results.length && <div className="px-3 py-8 text-center text-muted">No results for “{q}”</div>}
        {results.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          return (
            <div key={c.id}>
              {header && <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-faint">{header}</div>}
              <button
                data-index={i}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => active !== i && setActive(i)}
                onClick={() => run(c)}
                className={clsx("flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left", i === active ? "bg-hover text-fg" : "text-muted")}
              >
                <span className="flex w-4 justify-center">{c.icon}</span>
                <span className={clsx("flex-1 truncate", i === active && "text-fg")}>{c.label}</span>
                {c.hint && <span className="shrink-0 font-mono text-[11px] text-faint">{c.hint}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
