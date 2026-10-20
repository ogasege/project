import type { Block, BlockType } from "./types";
import { uid } from "./id";

// Minimal markdown <-> block conversion. Agents write markdown; the editor stores blocks.

function stripInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1$2");
}

export function markdownToBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trimStart().startsWith("```")) {
      const lang = raw.trim().slice(3).trim() || undefined;
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) body.push(lines[i++]);
      i++;
      blocks.push({ id: uid("b"), type: "code", text: body.join("\n"), lang });
      continue;
    }
    i++;
    if (!raw.trim()) continue;
    const indentSpaces = raw.length - raw.trimStart().length;
    const indent = Math.min(4, Math.floor(indentSpaces / 2));
    const line = raw.trimStart();
    // Blocks hold plain text, so inline emphasis markers are dropped.
    const push = (type: BlockType, text: string, extra: Partial<Block> = {}) =>
      blocks.push({ id: uid("b"), type, text: stripInline(text), indent: indent || undefined, ...extra });
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) push(`h${m[1].length}` as BlockType, m[2]);
    else if ((m = line.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/))) push("todo", m[2], { checked: m[1].toLowerCase() === "x" });
    else if ((m = line.match(/^[-*]\s+(.*)$/))) push("bullet", m[1]);
    else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) push("numbered", m[1]);
    else if ((m = line.match(/^>\s?(.*)$/))) {
      const c = m[1].match(/^\[!(\w+)\]\s*(.*)$/);
      if (c) push("callout", c[2]);
      else push("quote", m[1]);
    } else if (/^(-{3,}|\*{3,})$/.test(line)) push("divider", "");
    else push("p", line);
  }
  return blocks.length ? blocks : [{ id: uid("b"), type: "p", text: "" }];
}

export function blocksToMarkdown(blocks: Block[]): string {
  let n = 0;
  return blocks
    .map((b) => {
      const pad = "  ".repeat(b.indent ?? 0);
      if (b.type !== "numbered") n = 0;
      switch (b.type) {
        case "h1": return `# ${b.text}`;
        case "h2": return `## ${b.text}`;
        case "h3": return `### ${b.text}`;
        case "bullet": return `${pad}- ${b.text}`;
        case "numbered": return `${pad}${++n}. ${b.text}`;
        case "todo": return `${pad}- [${b.checked ? "x" : " "}] ${b.text}`;
        case "toggle": return `${pad}▸ ${b.text}`;
        case "quote": return `> ${b.text}`;
        case "callout": return `> [!note] ${b.text}`;
        case "code": return "```" + (b.lang ?? "") + "\n" + b.text + "\n```";
        case "divider": return "---";
        case "mention": return `[[${b.refId}]]`;
        default: return `${pad}${b.text}`;
      }
    })
    .join("\n");
}

export function plainText(blocks: Block[], max = 4000): string {
  return blocksToMarkdown(blocks).slice(0, max);
}
