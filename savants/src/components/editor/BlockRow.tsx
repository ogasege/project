"use client";

import { PageIcon } from "@/components/PageIcon";
import Link from "next/link";
import { memo, useLayoutEffect, useRef } from "react";
import { ChevronRight, GripVertical, Info } from "lucide-react";
import type { Block } from "@/lib/types";
import { clsx, Menu } from "@/components/ui";
import { CODE_LANGS, TURN_INTO, TYPE_LABEL } from "./blockTypes";

export interface MentionInfo {
  title: string;
  icon: string;
  href: string;
  ident?: string;
  missing?: boolean;
}

export interface BlockRowProps {
  block: Block;
  number?: number;
  readOnly?: boolean;
  placeholder?: string;
  mention?: MentionInfo;
  register: (id: string, el: HTMLElement | null) => void;
  onInput: (block: Block, el: HTMLElement) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, block: Block, el: HTMLElement) => void;
  onPaste: (e: React.ClipboardEvent<HTMLElement>, block: Block, el: HTMLElement) => void;
  onFocus: (id: string) => void;
  onPatch: (id: string, patch: Partial<Block>) => void;
  onMenu: (id: string, action: string) => void;
}

const TEXT_CLASS: Partial<Record<Block["type"], string>> = {
  h1: "text-[30px] font-semibold leading-tight tracking-tight",
  h2: "text-[23px] font-semibold leading-snug tracking-tight",
  h3: "text-[18px] font-semibold leading-snug",
  code: "font-mono text-[13px] leading-relaxed",
};

const ROW_SPACING: Partial<Record<Block["type"], string>> = {
  h1: "mt-7 mb-1",
  h2: "mt-5 mb-0.5",
  h3: "mt-3",
  divider: "my-2",
  code: "my-1.5",
  callout: "my-1.5",
  quote: "my-1",
};

export const BlockRow = memo(function BlockRow(p: BlockRowProps) {
  const { block } = p;
  const ref = useRef<HTMLDivElement>(null);

  // Write text into the DOM only when it differs, so re-renders never move the caret.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== block.text) el.textContent = block.text;
  }, [block.text, block.type]);

  const editable = (
    <div
      ref={(el) => {
        ref.current = el;
        p.register(block.id, el);
      }}
      data-block-id={block.id}
      contentEditable={p.readOnly ? false : "plaintext-only"}
      suppressContentEditableWarning
      spellCheck={block.type !== "code"}
      role="textbox"
      aria-multiline="true"
      aria-label={TYPE_LABEL[block.type]}
      data-placeholder={p.placeholder}
      onInput={(e) => p.onInput(block, e.currentTarget)}
      onKeyDown={(e) => p.onKeyDown(e, block, e.currentTarget)}
      onPaste={(e) => p.onPaste(e, block, e.currentTarget)}
      onFocus={() => p.onFocus(block.id)}
      className={clsx(
        "min-h-[1.65em] min-w-0 flex-1 whitespace-pre-wrap break-words outline-none",
        TEXT_CLASS[block.type],
        block.type === "todo" && block.checked && "text-faint line-through",
      )}
    />
  );

  let body: React.ReactNode;
  switch (block.type) {
    case "bullet":
      body = (
        <>
          <span className="flex w-6 shrink-0 select-none justify-center text-[18px] leading-[1.45] text-muted">{["•", "◦", "▪"][(block.indent ?? 0) % 3]}</span>
          {editable}
        </>
      );
      break;
    case "numbered":
      body = (
        <>
          <span className="w-6 shrink-0 select-none pr-1 text-right tabular-nums text-muted">{p.number ?? 1}.</span>
          {editable}
        </>
      );
      break;
    case "todo":
      body = (
        <>
          <span className="flex h-[1.65em] w-6 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              aria-label="Done"
              checked={!!block.checked}
              disabled={p.readOnly}
              onChange={() => p.onPatch(block.id, { checked: !block.checked })}
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
            />
          </span>
          {editable}
        </>
      );
      break;
    case "toggle":
      body = (
        <>
          <button
            aria-label={block.collapsed ? "Expand" : "Collapse"}
            aria-expanded={!block.collapsed}
            onClick={() => p.onPatch(block.id, { collapsed: !block.collapsed })}
            className="flex h-[1.65em] w-6 shrink-0 items-center justify-center rounded text-muted hover:bg-hover"
          >
            <ChevronRight size={14} className={clsx("transition-transform", !block.collapsed && "rotate-90")} />
          </button>
          {editable}
        </>
      );
      break;
    case "quote":
      body = <div className="flex flex-1 border-l-[3px] border-fg/70 pl-3.5">{editable}</div>;
      break;
    case "callout":
      body = (
        <div className="flex flex-1 gap-2.5 rounded border border-line bg-accent-soft px-3.5 py-3">
          <Info size={16} className="mt-[0.3em] shrink-0 text-accent" aria-hidden />
          {editable}
        </div>
      );
      break;
    case "code":
      body = (
        <div className="relative flex-1 rounded-md border border-line bg-panel px-4 pb-3 pt-7">
          <select
            aria-label="Code language"
            value={block.lang ?? "plain"}
            disabled={p.readOnly}
            onChange={(e) => p.onPatch(block.id, { lang: e.target.value === "plain" ? undefined : e.target.value })}
            className="absolute left-3 top-1.5 cursor-pointer bg-transparent text-[11px] text-faint outline-none hover:text-muted"
          >
            {CODE_LANGS.map((l) => (
              <option key={l} value={l} className="bg-elev">
                {l === "plain" ? "Plain text" : l}
              </option>
            ))}
          </select>
          {editable}
        </div>
      );
      break;
    case "divider":
      body = (
        <div
          ref={(el) => {
            p.register(block.id, el);
          }}
          tabIndex={p.readOnly ? -1 : 0}
          role="separator"
          aria-label="Divider"
          onKeyDown={(e) => p.onKeyDown(e, block, e.currentTarget)}
          onFocus={() => p.onFocus(block.id)}
          className="flex h-6 flex-1 items-center rounded outline-none focus:bg-accent-soft"
        >
          <hr className="w-full border-line-strong" />
        </div>
      );
      break;
    case "mention": {
      const m = p.mention;
      body = (
        <div
          ref={(el) => {
            p.register(block.id, el);
          }}
          tabIndex={p.readOnly ? -1 : 0}
          onKeyDown={(e) => p.onKeyDown(e, block, e.currentTarget)}
          onFocus={() => p.onFocus(block.id)}
          className="flex flex-1 rounded py-0.5 outline-none focus:bg-accent-soft"
        >
          {m && !m.missing ? (
            <Link href={m.href} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-0.5 text-[14px] hover:bg-hover">
              {m.icon === "issue" ? <span className="font-mono text-[11px] text-faint">ISSUE</span> : <PageIcon icon={m.icon} />}
              {m.ident && <span className="text-[12px] text-faint">{m.ident}</span>}
              <span className="truncate underline decoration-line-strong underline-offset-2">{m.title || "Untitled"}</span>
            </Link>
          ) : (
            <span className="rounded-md border border-dashed border-line px-2 py-0.5 text-[13px] text-faint">Deleted or missing item</span>
          )}
        </div>
      );
      break;
    }
    default:
      body = editable;
  }

  const menuOptions = [
    ...TURN_INTO.filter((t) => t !== block.type).map((t) => ({ value: `turn:${t}`, label: `Turn into ${TYPE_LABEL[t]}` })),
    { value: "duplicate", label: "Duplicate" },
    { value: "delete", label: "Delete" },
  ];

  return (
    <div
      className={clsx("group/block relative flex items-start", ROW_SPACING[block.type] ?? "my-px")}
      style={{ paddingLeft: (block.indent ?? 0) * 26 }}
      data-block-row={block.id}
    >
      {!p.readOnly && (
        <div className="absolute top-[3px] -ml-7 opacity-0 transition-opacity group-hover/block:opacity-100 focus-within:opacity-100" style={{ left: (block.indent ?? 0) * 26 }}>
          <Menu
            trigger={<GripVertical size={14} />}
            className="h-6 w-6 justify-center text-faint hover:bg-hover hover:text-muted"
            options={menuOptions}
            onSelect={(v) => p.onMenu(block.id, v)}
            placeholder="Turn into, duplicate, delete…"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 items-start">{body}</div>
    </div>
  );
});
