// Caret helpers for plain-text contentEditable elements.

export function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.focusNode)) return el.textContent?.length ?? 0;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.setEnd(sel.focusNode!, sel.focusOffset);
  return range.toString().length;
}

export function hasSelectionRange(): boolean {
  const sel = window.getSelection();
  return !!sel && !sel.isCollapsed;
}

export function setCaret(el: HTMLElement, offset: number | "start" | "end") {
  el.focus({ preventScroll: false });
  const sel = window.getSelection();
  if (!sel) return;
  const total = el.textContent?.length ?? 0;
  let target = offset === "start" ? 0 : offset === "end" ? total : Math.max(0, Math.min(offset, total));
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (target <= len) {
      range.setStart(node, target);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    target -= len;
    node = walker.nextNode();
  }
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function caretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rects = range.getClientRects();
  if (rects.length) return rects[0];
  const node = sel.focusNode;
  const el = node instanceof HTMLElement ? node : node?.parentElement;
  return el ? el.getBoundingClientRect() : null;
}

/** Whether the caret sits on the first / last visual line of the element. */
export function caretAtEdge(el: HTMLElement, edge: "top" | "bottom"): boolean {
  if (!el.textContent) return true;
  const r = caretRect();
  if (!r || (r.width === 0 && r.height === 0)) return true;
  const box = el.getBoundingClientRect();
  const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
  return edge === "top" ? r.top - box.top < line * 0.75 : box.bottom - r.bottom < line * 0.75;
}
