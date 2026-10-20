"use client";

import { PageIcon } from "@/components/PageIcon";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { uid } from "@/lib/id";
import { markdownToBlocks } from "@/lib/markdown";
import { useStore } from "@/lib/store";
import type { Block, BlockType, DB, Item } from "@/lib/types";
import { identifier, itemHref } from "@/lib/workspace";
import { BlockRow, type MentionInfo } from "./BlockRow";
import { CONTINUING, MARKDOWN_SHORTCUTS, SLASH_ITEMS, TEXTUAL } from "./blockTypes";
import { caretAtEdge, caretRect, getCaretOffset, hasSelectionRange, setCaret } from "./caret";
import { InlineMenu, type InlineMenuItem } from "./InlineMenu";

export interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}

type Focus = { id: string; pos: number | "start" | "end" };
type MenuState = {
  kind: "slash" | "mention";
  blockId: string;
  start: number; // index of the trigger character
  query: string;
  active: number;
  rect: { left: number; top: number; bottom: number };
};

const newBlock = (type: BlockType = "p", extra: Partial<Block> = {}): Block => ({ id: uid("b"), type, text: "", ...extra });

function normalize(blocks: Block[]): Block[] {
  return blocks.length ? blocks : [newBlock()];
}

function mentionInfo(db: DB, id?: string): MentionInfo | undefined {
  const it = id ? db.items[id] : undefined;
  if (!it || it.archived) return { title: "", icon: "", href: "#", missing: true };
  return { title: it.title, icon: it.kind === "issue" ? "issue" : it.icon ?? "page", href: itemHref(it, db), ident: identifier(db, it) || undefined };
}

export function BlockEditor({ blocks: external, onChange, placeholder = "Type '/' for commands", readOnly, autoFocus }: BlockEditorProps) {
  const db = useStore((s) => s.db);
  const [blocks, setBlocks] = useState<Block[]>(() => normalize(external));
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const emitted = useRef(new WeakSet<Block[]>());
  const els = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<Focus | null>(autoFocus ? { id: blocks[blocks.length - 1].id, pos: "end" } : null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Adopt external changes (another client, an agent) but ignore echoes of what we emitted.
  useEffect(() => {
    if (external === blocksRef.current || emitted.current.has(external)) return;
    setBlocks(normalize(external));
  }, [external]);

  const commit = useCallback((next: Block[], focus?: Focus) => {
    const n = normalize(next);
    emitted.current.add(n);
    blocksRef.current = n;
    setBlocks(n);
    if (focus) pendingFocus.current = focus;
    onChangeRef.current(n);
  }, []);

  useLayoutEffect(() => {
    const f = pendingFocus.current;
    if (!f) return;
    const el = els.current.get(f.id);
    if (!el) return;
    pendingFocus.current = null;
    if (el.isContentEditable) setCaret(el, f.pos);
    else el.focus();
  });

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  }, []);

  // ---------- derived render info ----------
  const { numbers, hidden } = useMemo(() => {
    const numbers = new Map<string, number>();
    const hidden = new Set<string>();
    const counters: number[] = [];
    let collapseAt: number | null = null;
    for (const b of blocks) {
      const lvl = b.indent ?? 0;
      if (collapseAt !== null) {
        if (lvl > collapseAt) {
          hidden.add(b.id);
          continue;
        }
        collapseAt = null;
      }
      if (b.type === "numbered") {
        counters[lvl] = (counters[lvl] ?? 0) + 1;
        counters.length = lvl + 1;
        numbers.set(b.id, counters[lvl]);
      } else {
        counters.length = Math.min(counters.length, lvl);
      }
      if (b.type === "toggle" && b.collapsed) collapseAt = lvl;
    }
    return { numbers, hidden };
  }, [blocks]);

  const visible = useMemo(() => blocks.filter((b) => !hidden.has(b.id)), [blocks, hidden]);

  // ---------- helpers ----------
  const indexOf = (id: string) => blocksRef.current.findIndex((b) => b.id === id);

  const neighbour = (id: string, dir: -1 | 1): Block | undefined => {
    const vis = blocksRef.current.filter((b) => !hidden.has(b.id));
    const i = vis.findIndex((b) => b.id === id);
    return vis[i + dir];
  };

  const patchBlock = useCallback(
    (id: string, patch: Partial<Block>, focus?: Focus) => {
      commit(
        blocksRef.current.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        focus,
      );
    },
    [commit],
  );

  const insertAfter = (id: string, inserted: Block[], focus?: Focus) => {
    const list = [...blocksRef.current];
    list.splice(indexOf(id) + 1, 0, ...inserted);
    commit(list, focus);
  };

  const removeBlock = (id: string, focus?: Focus) => {
    commit(
      blocksRef.current.filter((b) => b.id !== id),
      focus,
    );
  };

  const closeMenu = () => setMenu(null);

  // ---------- menu items ----------
  const menuItems: (InlineMenuItem & { type?: BlockType; refId?: string })[] = useMemo(() => {
    if (!menu) return [];
    const q = menu.query.toLowerCase();
    if (menu.kind === "slash") {
      return SLASH_ITEMS.filter((s) => !q || s.label.toLowerCase().includes(q) || s.keywords.includes(q)).map((s) => ({
        id: s.id,
        label: s.label,
        hint: s.hint,
        glyph: s.glyph,
        type: s.type,
      }));
    }
    const items = Object.values(db.items).filter((i: Item) => !i.archived);
    return items
      .map((i) => ({ i, ident: identifier(db, i) }))
      .filter(({ i, ident }) => !q || i.title.toLowerCase().includes(q) || ident.toLowerCase().includes(q))
      .sort((a, b) => b.i.updatedAt - a.i.updatedAt)
      .slice(0, 12)
      .map(({ i, ident }) => ({
        id: i.id,
        refId: i.id,
        label: i.title || "Untitled",
        hint: i.kind === "issue" ? `${ident} · issue` : "page",
        glyph: i.kind === "issue" ? <span className="font-mono text-[9px]">ISS</span> : <PageIcon icon={i.icon} />,
      }));
  }, [menu, db]);

  const menuItemsRef = useRef(menuItems);
  menuItemsRef.current = menuItems;

  const pickMenuItem = (item: (typeof menuItems)[number]) => {
    const m = menuRef.current;
    if (!m) return;
    const block = blocksRef.current.find((b) => b.id === m.blockId);
    if (!block) return closeMenu();
    // Strip the "/query" or "@query" trigger text.
    const text = block.text.slice(0, m.start) + block.text.slice(m.start + 1 + m.query.length);
    closeMenu();

    if (m.kind === "mention" || item.id === "mention") {
      if (m.kind === "slash") {
        // Swap the slash menu for the mention picker at the same spot.
        const el = els.current.get(block.id);
        patchBlock(block.id, { text: text.slice(0, m.start) + "@" + text.slice(m.start) }, { id: block.id, pos: m.start + 1 });
        requestAnimationFrame(() => {
          if (el) setMenu({ kind: "mention", blockId: block.id, start: m.start, query: "", active: 0, rect: rectOf(el) });
        });
        return;
      }
      const mention = newBlock("mention", { refId: item.refId, indent: block.indent });
      const list = [...blocksRef.current];
      const i = indexOf(block.id);
      if (!text.trim()) {
        const after = list[i + 1];
        const trailing = after && TEXTUAL(after.type) ? [] : [newBlock("p", { indent: block.indent })];
        list.splice(i, 1, mention, ...trailing);
        commit(list, { id: trailing[0]?.id ?? after.id, pos: "start" });
      } else {
        const trailing = newBlock("p", { indent: block.indent });
        list.splice(i, 1, { ...block, text }, mention, trailing);
        commit(list, { id: trailing.id, pos: "start" });
      }
      return;
    }

    const type = item.type ?? "p";
    if (type === "divider") {
      const p = newBlock("p", { indent: block.indent });
      const list = [...blocksRef.current];
      const i = indexOf(block.id);
      if (!text.trim()) list.splice(i, 1, { ...block, type: "divider", text: "" }, p);
      else list.splice(i, 1, { ...block, text }, newBlock("divider"), p);
      commit(list, { id: p.id, pos: "start" });
      return;
    }
    if (!text.trim()) {
      patchBlock(block.id, { type, text: "", checked: type === "todo" ? false : undefined }, { id: block.id, pos: "start" });
    } else {
      const nb = newBlock(type, { indent: block.indent });
      const list = blocksRef.current.map((b) => (b.id === block.id ? { ...b, text } : b));
      list.splice(indexOf(block.id) + 1, 0, nb);
      commit(list, { id: nb.id, pos: "start" });
    }
  };

  // ---------- event handlers ----------
  const onInput = useCallback(
    (block: Block, el: HTMLElement) => {
      const text = el.textContent ?? "";
      const caret = getCaretOffset(el);

      // Markdown shortcuts at the start of a paragraph.
      if (block.type === "p") {
        const before = text.slice(0, caret);
        if (/^(-{3}|\*{3})$/.test(text)) {
          const p = newBlock("p", { indent: block.indent });
          const list = [...blocksRef.current];
          list.splice(indexOf(block.id), 1, { ...block, type: "divider", text: "" }, p);
          commit(list, { id: p.id, pos: "start" });
          return;
        }
        for (const [re, type, extra] of MARKDOWN_SHORTCUTS) {
          const m = before.match(re);
          if (m) {
            const rest = text.slice(m[0].length);
            el.textContent = rest;
            patchBlock(block.id, { type, text: rest, ...(extra ?? {}) }, { id: block.id, pos: 0 });
            return;
          }
        }
      }

      // Slash / mention triggers.
      const m = menuRef.current;
      if (m && m.blockId === block.id) {
        const query = text.slice(m.start + 1, caret);
        const trigger = text[m.start];
        if (caret <= m.start || trigger !== (m.kind === "slash" ? "/" : "@") || /\s{2}|\n/.test(query) || query.length > 40) setMenu(null);
        else setMenu({ ...m, query, active: 0 });
      } else if (block.type !== "code") {
        const typed = text[caret - 1];
        const prev = caret >= 2 ? text[caret - 2] : " ";
        if ((typed === "/" || typed === "@") && /\s/.test(prev)) {
          setMenu({ kind: typed === "/" ? "slash" : "mention", blockId: block.id, start: caret - 1, query: "", active: 0, rect: rectOf(el) });
        }
      }

      patchBlock(block.id, { text });
    },
    [commit, patchBlock],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>, block: Block, el: HTMLElement) => {
      const m = menuRef.current;
      if (m && m.blockId === block.id) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMenu({ ...m, active: Math.min(m.active + 1, Math.max(0, menuItemsRef.current.length - 1)) });
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMenu({ ...m, active: Math.max(0, m.active - 1) });
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          const item = menuItemsRef.current[m.active];
          if (item) {
            e.preventDefault();
            pickMenuItem(item);
            return;
          }
          setMenu(null);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setMenu(null);
          return;
        }
      }

      const textual = TEXTUAL(block.type);
      const caret = textual ? getCaretOffset(el) : 0;
      const text = textual ? el.textContent ?? "" : "";
      const mod = e.metaKey || e.ctrlKey;

      // Non-text blocks (divider, mention) act like a single selectable unit.
      if (!textual) {
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          const prev = neighbour(block.id, -1) ?? neighbour(block.id, 1);
          removeBlock(block.id, prev ? { id: prev.id, pos: "end" } : undefined);
        } else if (e.key === "Enter") {
          e.preventDefault();
          const p = newBlock("p", { indent: block.indent });
          insertAfter(block.id, [p], { id: p.id, pos: "start" });
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          const prev = neighbour(block.id, -1);
          if (prev) {
            e.preventDefault();
            focusBlock(prev.id, "end");
          }
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          const next = neighbour(block.id, 1);
          if (next) {
            e.preventDefault();
            focusBlock(next.id, "start");
          }
        }
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        if (block.type === "code" && !mod) return; // newline inside code
        e.preventDefault();
        const indent = block.indent;
        if (CONTINUING.includes(block.type) && !text) {
          if ((indent ?? 0) > 0) patchBlock(block.id, { indent: (indent ?? 0) - 1 || undefined }, { id: block.id, pos: 0 });
          else patchBlock(block.id, { type: "p", checked: undefined }, { id: block.id, pos: 0 });
          return;
        }
        if (caret === 0 && text && block.type !== "code") {
          const before = newBlock(CONTINUING.includes(block.type) ? block.type : "p", { indent });
          const list = [...blocksRef.current];
          list.splice(indexOf(block.id), 0, before);
          commit(list, { id: block.id, pos: 0 });
          return;
        }
        const head = block.type === "code" ? text : text.slice(0, caret);
        const tail = block.type === "code" ? "" : text.slice(caret);
        const nextType: BlockType = CONTINUING.includes(block.type) ? block.type : "p";
        const childIndent = block.type === "toggle" && !block.collapsed ? (indent ?? 0) + 1 : indent;
        const nb = newBlock(nextType, { text: tail, indent: childIndent || undefined, checked: nextType === "todo" ? false : undefined });
        el.textContent = head;
        const list = blocksRef.current.map((b) => (b.id === block.id ? { ...b, text: head } : b));
        list.splice(indexOf(block.id) + 1, 0, nb);
        commit(list, { id: nb.id, pos: 0 });
        return;
      }

      if (e.key === "Backspace" && caret === 0 && !hasSelectionRange()) {
        if (block.type !== "p") {
          e.preventDefault();
          patchBlock(block.id, { type: "p", checked: undefined, lang: undefined, emoji: undefined, collapsed: undefined }, { id: block.id, pos: 0 });
          return;
        }
        if ((block.indent ?? 0) > 0) {
          e.preventDefault();
          patchBlock(block.id, { indent: (block.indent ?? 0) - 1 || undefined }, { id: block.id, pos: 0 });
          return;
        }
        const prev = neighbour(block.id, -1);
        if (!prev) return;
        e.preventDefault();
        if (!TEXTUAL(prev.type)) {
          if (!text) removeBlock(block.id, { id: prev.id, pos: "end" });
          else commit(blocksRef.current.filter((b) => b.id !== prev.id), { id: block.id, pos: 0 });
          return;
        }
        const joinAt = prev.text.length;
        commit(
          blocksRef.current.filter((b) => b.id !== block.id).map((b) => (b.id === prev.id ? { ...b, text: b.text + text } : b)),
          { id: prev.id, pos: joinAt },
        );
        return;
      }

      if (e.key === "Delete" && caret === text.length && !hasSelectionRange()) {
        const next = neighbour(block.id, 1);
        if (next && TEXTUAL(next.type)) {
          e.preventDefault();
          commit(
            blocksRef.current.filter((b) => b.id !== next.id).map((b) => (b.id === block.id ? { ...b, text: text + next.text } : b)),
            { id: block.id, pos: caret },
          );
        }
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        if (block.type === "code" && !e.shiftKey) {
          document.execCommand("insertText", false, "  ");
          return;
        }
        const cur = block.indent ?? 0;
        const next = e.shiftKey ? Math.max(0, cur - 1) : Math.min(4, cur + 1);
        if (next !== cur) patchBlock(block.id, { indent: next || undefined }, { id: block.id, pos: caret });
        return;
      }

      if (e.key === "ArrowUp" && !e.shiftKey && caretAtEdge(el, "top")) {
        const prev = neighbour(block.id, -1);
        if (prev) {
          e.preventDefault();
          focusBlock(prev.id, TEXTUAL(prev.type) ? Math.min(caret, prev.text.length) : "end");
        }
        return;
      }
      if (e.key === "ArrowDown" && !e.shiftKey && caretAtEdge(el, "bottom")) {
        const next = neighbour(block.id, 1);
        if (next) {
          e.preventDefault();
          focusBlock(next.id, TEXTUAL(next.type) ? Math.min(caret, next.text.length) : "start");
        }
        return;
      }
      if (e.key === "ArrowLeft" && caret === 0 && !e.shiftKey) {
        const prev = neighbour(block.id, -1);
        if (prev) {
          e.preventDefault();
          focusBlock(prev.id, "end");
        }
        return;
      }
      if (e.key === "ArrowRight" && caret === text.length && !e.shiftKey) {
        const next = neighbour(block.id, 1);
        if (next) {
          e.preventDefault();
          focusBlock(next.id, "start");
        }
      }
    },
    [commit, patchBlock, hidden],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLElement>, block: Block, el: HTMLElement) => {
      const pasted = e.clipboardData.getData("text/plain");
      if (!pasted.includes("\n") || block.type === "code") return;
      e.preventDefault();
      const caret = getCaretOffset(el);
      const text = el.textContent ?? "";
      const [first, ...restLines] = pasted.replace(/\r\n/g, "\n").split("\n");
      const head = text.slice(0, caret) + first;
      const tail = text.slice(caret);
      const parsed = markdownToBlocks(restLines.join("\n")).filter((b) => b.text || !TEXTUAL(b.type));
      if (!parsed.length) parsed.push(newBlock("p"));
      const last = parsed[parsed.length - 1];
      const lastLen = last.text.length;
      parsed[parsed.length - 1] = { ...last, text: last.text + tail };
      el.textContent = head;
      const list = blocksRef.current.map((b) => (b.id === block.id ? { ...b, text: head } : b));
      list.splice(indexOf(block.id) + 1, 0, ...parsed);
      commit(list, { id: last.id, pos: lastLen });
    },
    [commit],
  );

  const onMenu = useCallback(
    (id: string, action: string) => {
      const b = blocksRef.current.find((x) => x.id === id);
      if (!b) return;
      if (action === "delete") {
        const prev = neighbour(id, -1) ?? neighbour(id, 1);
        removeBlock(id, prev ? { id: prev.id, pos: "end" } : undefined);
      } else if (action === "duplicate") {
        const copy = { ...b, id: uid("b") };
        insertAfter(id, [copy], TEXTUAL(copy.type) ? { id: copy.id, pos: "end" } : undefined);
      } else if (action.startsWith("turn:")) {
        const type = action.slice(5) as BlockType;
        patchBlock(id, { type, checked: type === "todo" ? !!b.checked : undefined }, { id, pos: "end" });
      }
    },
    [patchBlock, hidden],
  );

  const onPatch = useCallback((id: string, patch: Partial<Block>) => patchBlock(id, patch), [patchBlock]);
  const onFocus = useCallback((id: string) => setFocusedId(id), []);

  function focusBlock(id: string, pos: Focus["pos"]) {
    const el = els.current.get(id);
    if (!el) return;
    if (el.isContentEditable) setCaret(el, pos);
    else el.focus();
  }

  // Close the menu when focus leaves the block it belongs to.
  useEffect(() => {
    if (menu && focusedId !== menu.blockId) setMenu(null);
  }, [focusedId, menu]);

  const onlyEmpty = blocks.length === 1 && blocks[0].type === "p" && !blocks[0].text;

  return (
    <div
      className="doc relative pl-8"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setFocusedId(null);
          setMenu(null);
        }
      }}
      onMouseDown={(e) => {
        // Clicking the empty area below the last block focuses it (or appends a paragraph).
        if (readOnly || e.target !== e.currentTarget) return;
        const last = blocksRef.current[blocksRef.current.length - 1];
        e.preventDefault();
        if (last && TEXTUAL(last.type) && !last.text) focusBlock(last.id, "end");
        else {
          const p = newBlock();
          commit([...blocksRef.current, p], { id: p.id, pos: "start" });
        }
      }}
    >
      {visible.map((b) => (
        <BlockRow
          key={b.id}
          block={b}
          number={numbers.get(b.id)}
          readOnly={readOnly}
          mention={b.type === "mention" ? mentionInfo(db, b.refId) : undefined}
          placeholder={
            readOnly
              ? undefined
              : onlyEmpty
                ? placeholder
                : focusedId === b.id
                  ? b.type === "h1"
                    ? "Heading 1"
                    : b.type === "h2"
                      ? "Heading 2"
                      : b.type === "h3"
                        ? "Heading 3"
                        : b.type === "p"
                          ? "Type '/' for commands, '@' to mention"
                          : b.type === "code"
                            ? "Code"
                            : "List"
                  : undefined
          }
          register={register}
          onInput={onInput}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={onFocus}
          onPatch={onPatch}
          onMenu={onMenu}
        />
      ))}
      <div className="h-6" aria-hidden />
      {menu && (
        <InlineMenu
          rect={menu.rect}
          title={menu.kind === "slash" ? "Blocks" : "Mention a page or issue"}
          items={menuItems}
          active={menu.active}
          onHover={(i) => setMenu((m) => (m ? { ...m, active: i } : m))}
          onPick={(it) => pickMenuItem(it as (typeof menuItems)[number])}
          empty={menu.kind === "slash" ? "No matching blocks" : "No matching pages or issues"}
        />
      )}
    </div>
  );
}

function rectOf(el: HTMLElement) {
  const r = caretRect() ?? el.getBoundingClientRect();
  return { left: r.left, top: r.top, bottom: r.bottom };
}
