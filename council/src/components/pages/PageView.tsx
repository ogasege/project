"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ChevronRight, FileText, MoreHorizontal, Plus, Radio, Star, Ticket } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Block, Item } from "@/lib/types";
import { childPages, itemHref, relativeTime } from "@/lib/workspace";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { Avatar, Button, clsx, EmptyState, Menu } from "@/components/ui";
import { archiveItem, convertToIssue, createPage, patchItem } from "./actions";
import { IconPicker } from "./IconPicker";

export const COVERS = [
  "linear-gradient(120deg,#6d5df6 0%,#c165dd 55%,#f7797d 100%)",
  "linear-gradient(120deg,#0f2027 0%,#203a43 50%,#2c5364 100%)",
  "linear-gradient(120deg,#f7971e 0%,#ffd200 100%)",
  "linear-gradient(120deg,#11998e 0%,#38ef7d 100%)",
  "linear-gradient(120deg,#ee0979 0%,#ff6a00 100%)",
  "linear-gradient(120deg,#1e3c72 0%,#2a5298 100%)",
  "linear-gradient(120deg,#232526 0%,#414345 100%)",
  "radial-gradient(circle at 20% 30%,#d4a017 0%,#5a3d00 70%)",
];

function useDebounced<T>(fn: (v: T) => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ v: T } | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (latest.current) {
      const { v } = latest.current;
      latest.current = null;
      fnRef.current(v);
    }
  }, []);
  const call = useCallback(
    (v: T) => {
      latest.current = { v };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, ms);
    },
    [flush, ms],
  );
  useEffect(() => flush, [flush]);
  return call;
}

export function PageView({ id }: { id: string }) {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const item = db.items[id];

  useEffect(() => {
    if (item?.kind === "issue") router.replace(itemHref(item, db));
  }, [item, db, router]);

  if (!item || item.archived) {
    return (
      <EmptyState
        title={item?.archived ? "This page was archived" : "Page not found"}
        body="It may have been archived or never existed."
        action={
          <Link href="/inbox" className="text-accent hover:underline">
            Back to inbox
          </Link>
        }
      />
    );
  }
  if (item.kind !== "page") return null;
  return <PageBody key={item.id} item={item} />;
}

function PageBody({ item }: { item: Item }) {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const titleFocused = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [iconOpen, setIconOpen] = useState(false);

  const saveBlocks = useDebounced<Block[]>((blocks) => void patchItem(item.id, { blocks }), 300);
  const saveTitle = useDebounced<string>((t) => void patchItem(item.id, { title: t }), 300);

  // Pick up remote title edits when we're not typing.
  useEffect(() => {
    if (!titleFocused.current) setTitle(item.title);
  }, [item.title]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const crumbs = useMemo(() => {
    const chain: Item[] = [];
    let cur = item.parentId ? db.items[item.parentId] : undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.unshift(cur);
      cur = cur.parentId ? db.items[cur.parentId] : undefined;
    }
    return chain;
  }, [db.items, item.parentId]);

  const kids = useMemo(() => childPages(db, item.id), [db, item.id]);
  const teams = useMemo(() => Object.values(db.teams), [db.teams]);
  const author = db.members[item.createdBy];

  const focusEditor = () => {
    const first = document.querySelector<HTMLElement>("[data-page-editor] [contenteditable]");
    first?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-4">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-[13px] text-muted">
          {crumbs.map((c) => (
            <span key={c.id} className="flex min-w-0 items-center gap-1">
              <Link href={`/page/${c.id}`} className="flex min-w-0 items-center gap-1 rounded px-1 py-0.5 hover:bg-hover hover:text-fg">
                <span>{c.icon ?? "📄"}</span>
                <span className="max-w-[160px] truncate">{c.title || "Untitled"}</span>
              </Link>
              <ChevronRight size={12} className="shrink-0 text-faint" />
            </span>
          ))}
          <span className="flex min-w-0 items-center gap-1 px-1 text-fg">
            <span>{item.icon ?? "📄"}</span>
            <span className="truncate">{title || "Untitled"}</span>
          </span>
        </nav>
        <span className="mr-2 hidden text-[12px] text-faint md:inline">Edited {relativeTime(item.updatedAt)}</span>
        <Button size="sm" variant="ghost" aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"} onClick={() => void patchItem(item.id, { favorite: !item.favorite })}>
          <Star size={14} className={clsx(item.favorite && "fill-warning text-warning")} />
        </Button>
        <Menu
          trigger={
            <>
              <Ticket size={13} /> Convert to issue
            </>
          }
          className="h-6 px-2 text-xs font-medium text-muted hover:bg-hover hover:text-fg"
          options={teams.map((t) => ({ value: t.id, label: t.name, hint: t.key, icon: <span className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-white" style={{ background: t.color }}>{t.icon}</span> }))}
          onSelect={async (teamId) => {
            const ident = await convertToIssue(item.id, teamId);
            if (ident) router.push(`/issue/${ident}`);
          }}
          placeholder="Move to team…"
          align="end"
        />
        <Button size="sm" variant="primary" onClick={() => router.push(`/call?context=${item.id}`)}>
          <Radio size={13} /> Ask the council
        </Button>
        <Menu
          trigger={<MoreHorizontal size={15} />}
          className="h-6 w-6 justify-center text-muted hover:bg-hover hover:text-fg"
          options={[{ value: "archive", label: "Archive page", icon: <Archive size={13} /> }]}
          onSelect={async () => {
            await archiveItem(item.id);
            router.push(item.parentId ? `/page/${item.parentId}` : "/inbox");
          }}
          align="end"
          placeholder="Page actions…"
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <CoverBand item={item} />

        <div className="mx-auto w-full max-w-[760px] px-12 pb-24">
          <div className={clsx("relative", item.cover ? "-mt-10" : "mt-14")}>
            <button
              onClick={() => setIconOpen((o) => !o)}
              aria-label="Change icon"
              className="flex h-[72px] w-[72px] items-center justify-center rounded-lg text-[56px] leading-none hover:bg-hover"
            >
              {item.icon ?? "📄"}
            </button>
            {iconOpen && (
              <IconPicker
                onClose={() => setIconOpen(false)}
                onPick={(icon) => {
                  void patchItem(item.id, { icon });
                  setIconOpen(false);
                }}
              />
            )}
          </div>

          <div className="group/meta mt-1 flex h-6 items-center gap-1 text-[12px] text-faint">
            {!item.cover && (
              <button className="rounded px-1.5 py-0.5 opacity-0 hover:bg-hover hover:text-muted group-hover/meta:opacity-100" onClick={() => void patchItem(item.id, { cover: COVERS[0] })}>
                Add cover
              </button>
            )}
          </div>

          <textarea
            ref={titleRef}
            rows={1}
            autoFocus={!item.title}
            value={title}
            placeholder="Untitled"
            aria-label="Page title"
            onFocus={() => (titleFocused.current = true)}
            onBlur={() => (titleFocused.current = false)}
            onChange={(e) => {
              const t = e.target.value.replace(/\n/g, "");
              setTitle(t);
              saveTitle(t);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                focusEditor();
              }
            }}
            className="mb-3 w-full resize-none overflow-hidden bg-transparent font-sans text-[40px] font-bold leading-[1.15] tracking-tight outline-none placeholder:text-faint/60"
          />

          {author && (
            <div className="mb-5 flex items-center gap-2 text-[12px] text-faint">
              <Avatar member={author} size={16} />
              <span>{author.name}</span>
              <span>·</span>
              <span>Created {relativeTime(item.createdAt)}</span>
            </div>
          )}

          <div data-page-editor className="-ml-8">
            <BlockEditor blocks={item.blocks} onChange={saveBlocks} />
          </div>

          <SubPages parentId={item.id} pages={kids} />
        </div>
      </div>
    </div>
  );
}

function CoverBand({ item }: { item: Item }) {
  if (!item.cover) return null;
  return (
    <div className="group/cover relative h-44 w-full" style={{ background: item.cover }}>
      <div className="absolute bottom-3 right-6 flex gap-1 opacity-0 transition-opacity group-hover/cover:opacity-100">
        <Menu
          trigger={<span className="rounded-md bg-black/45 px-2 py-1 text-[12px] text-white backdrop-blur">Change cover</span>}
          options={COVERS.map((c, i) => ({ value: c, label: `Gradient ${i + 1}`, icon: <span className="h-4 w-8 rounded" style={{ background: c }} /> }))}
          onSelect={(c) => void patchItem(item.id, { cover: c })}
          align="end"
          placeholder="Pick a cover…"
        />
        <button className="rounded-md bg-black/45 px-2 py-1 text-[12px] text-white backdrop-blur" onClick={() => void patchItem(item.id, { cover: "" })}>
          Remove
        </button>
      </div>
    </div>
  );
}

function SubPages({ parentId, pages }: { parentId: string; pages: Item[] }) {
  const router = useRouter();
  return (
    <section className="mt-10 border-t border-line pt-4" aria-label="Sub-pages">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[12px] font-medium uppercase tracking-wide text-faint">Sub-pages</h2>
        <Button size="sm" variant="ghost" onClick={() => void createPage(parentId).then((id) => router.push(`/page/${id}`))}>
          <Plus size={13} /> Add sub-page
        </Button>
      </div>
      {pages.length === 0 ? (
        <p className="text-[13px] text-faint">No sub-pages yet.</p>
      ) : (
        <ul className="space-y-px">
          {pages.map((p) => (
            <li key={p.id}>
              <Link href={`/page/${p.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[14px] hover:bg-hover">
                <span>{p.icon ?? <FileText size={14} />}</span>
                <span className="flex-1 truncate underline decoration-line-strong underline-offset-4">{p.title || "Untitled"}</span>
                <span className="text-[12px] text-faint">{relativeTime(p.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
