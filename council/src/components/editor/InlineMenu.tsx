"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "@/components/ui";

export interface InlineMenuItem {
  id: string;
  label: string;
  hint?: string;
  glyph: React.ReactNode;
}

/** Caret-anchored floating list used by the slash menu and the @-mention picker. */
export function InlineMenu({
  rect,
  title,
  items,
  active,
  onHover,
  onPick,
  empty = "No results",
}: {
  rect: { left: number; top: number; bottom: number };
  title: string;
  items: InlineMenuItem[];
  active: number;
  onHover: (i: number) => void;
  onPick: (item: InlineMenuItem) => void;
  empty?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const height = 320;
  const below = rect.bottom + 6 + height < window.innerHeight;
  const top = below ? rect.bottom + 6 : Math.max(8, rect.top - height - 6);
  const left = Math.min(rect.left, window.innerWidth - 300);

  return createPortal(
    <div
      className="animate-fade-in fixed z-[110] w-72 overflow-hidden rounded-lg border border-line-strong bg-elev shadow-[var(--shadow)]"
      style={{ top, left }}
      onMouseDown={(e) => e.preventDefault() /* keep the caret in the block */}
      role="listbox"
      aria-label={title}
    >
      <div className="border-b border-line px-3 py-1.5 text-[11px] font-medium text-faint">{title}</div>
      <div ref={listRef} className="max-h-[280px] overflow-y-auto p-1">
        {items.length === 0 && <div className="px-2 py-2 text-faint">{empty}</div>}
        {items.map((it, i) => (
          <button
            key={it.id}
            data-idx={i}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => onHover(i)}
            onClick={() => onPick(it)}
            className={clsx("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left", i === active && "bg-hover")}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-[12px] font-medium text-muted">{it.glyph}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px]">{it.label}</span>
              {it.hint && <span className="block truncate text-[11px] text-faint">{it.hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
