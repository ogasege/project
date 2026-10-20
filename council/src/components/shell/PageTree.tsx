"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { childPages } from "@/lib/workspace";
import type { DB, Item } from "@/lib/types";
import { clsx } from "@/components/ui";

function Node({ db, page, depth }: { db: DB; page: Item; depth: number }) {
  const path = usePathname();
  const kids = useMemo(() => childPages(db, page.id), [db, page.id]);
  const [open, setOpen] = useState(false);
  const active = path === `/page/${page.id}`;
  return (
    <div>
      <div
        className={clsx("group flex h-7 items-center gap-1 rounded-md pr-2 text-[13px]", active ? "bg-active text-fg" : "text-muted hover:bg-hover hover:text-fg")}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <button
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen(!open)}
          className={clsx("rounded p-0.5 text-faint hover:bg-active", !kids.length && "invisible")}
        >
          <ChevronRight size={12} className={clsx("transition-transform", open && "rotate-90")} />
        </button>
        <Link href={`/page/${page.id}`} className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="w-4 text-center text-[13px]">{page.icon ?? "📄"}</span>
          <span className="truncate">{page.title || "Untitled"}</span>
        </Link>
      </div>
      {open && kids.map((k) => <Node key={k.id} db={db} page={k} depth={depth + 1} />)}
    </div>
  );
}

export function PageTree() {
  const db = useStore((s) => s.db);
  const roots = useMemo(() => childPages(db, null), [db]);
  return (
    <div>
      {roots.map((p) => (
        <Node key={p.id} db={db} page={p} depth={0} />
      ))}
    </div>
  );
}
