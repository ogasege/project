"use client";

import { PageIcon } from "@/components/PageIcon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { childPages } from "@/lib/workspace";
import type { DB, Item } from "@/lib/types";
import { clsx } from "@/components/ui";
import { createPage } from "@/components/pages/actions";

function Node({ db, page, depth, ancestors }: { db: DB; page: Item; depth: number; ancestors: Set<string> }) {
  const path = usePathname();
  const router = useRouter();
  const kids = useMemo(() => childPages(db, page.id), [db, page.id]);
  const [open, setOpen] = useState(ancestors.has(page.id));
  const active = path === `/page/${page.id}`;

  // Reveal the active page: expand every ancestor when navigation lands below this node.
  useEffect(() => {
    if (ancestors.has(page.id)) setOpen(true);
  }, [ancestors, page.id]);

  return (
    <div>
      <div
        className={clsx("group/node flex h-7 items-center gap-1 rounded-md pr-1 text-[13px]", active ? "bg-active text-fg" : "text-muted hover:bg-hover hover:text-fg")}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <button
          aria-label={open ? `Collapse ${page.title || "Untitled"}` : `Expand ${page.title || "Untitled"}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={clsx("rounded p-0.5 text-faint hover:bg-active", !kids.length && "invisible")}
        >
          <ChevronRight size={12} className={clsx("transition-transform", open && "rotate-90")} />
        </button>
        <Link href={`/page/${page.id}`} className="flex min-w-0 flex-1 items-center gap-1.5">
          <PageIcon icon={page.icon} />
          <span className="truncate">{page.title || "Untitled"}</span>
        </Link>
        <button
          aria-label={`Add a page inside ${page.title || "Untitled"}`}
          title="Add a page inside"
          onClick={async () => {
            const id = await createPage(page.id);
            setOpen(true);
            router.push(`/page/${id}`);
          }}
          className="rounded p-0.5 text-faint opacity-0 hover:bg-active hover:text-fg focus:opacity-100 group-hover/node:opacity-100"
        >
          <Plus size={12} />
        </button>
      </div>
      {open && kids.map((k) => <Node key={k.id} db={db} page={k} depth={depth + 1} ancestors={ancestors} />)}
    </div>
  );
}

export function PageTree() {
  const db = useStore((s) => s.db);
  const path = usePathname();
  const roots = useMemo(() => childPages(db, null), [db]);

  const activeId = path.startsWith("/page/") ? path.slice(6) : null;
  const ancestors = useMemo(() => {
    const set = new Set<string>();
    let cur = activeId ? db.items[activeId] : undefined;
    while (cur?.parentId && !set.has(cur.parentId)) {
      set.add(cur.parentId);
      cur = db.items[cur.parentId];
    }
    return set;
  }, [activeId, db.items]);

  if (!roots.length) return <div className="px-2 py-1 text-[12px] text-faint">No pages yet</div>;
  return (
    <div>
      {roots.map((p) => (
        <Node key={p.id} db={db} page={p} depth={0} ancestors={ancestors} />
      ))}
    </div>
  );
}
