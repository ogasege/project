import type { BlockType } from "@/lib/types";

export interface SlashItem {
  id: string;
  label: string;
  hint: string;
  glyph: string;
  type?: BlockType;
  keywords: string;
}

export const SLASH_ITEMS: SlashItem[] = [
  { id: "p", type: "p", label: "Text", hint: "Plain paragraph", glyph: "Aa", keywords: "text paragraph plain" },
  { id: "h1", type: "h1", label: "Heading 1", hint: "Big section heading", glyph: "H1", keywords: "heading title h1 #" },
  { id: "h2", type: "h2", label: "Heading 2", hint: "Medium section heading", glyph: "H2", keywords: "heading subtitle h2 ##" },
  { id: "h3", type: "h3", label: "Heading 3", hint: "Small section heading", glyph: "H3", keywords: "heading h3 ###" },
  { id: "bullet", type: "bullet", label: "Bulleted list", hint: "Simple bulleted list", glyph: "•", keywords: "bullet list unordered ul -" },
  { id: "numbered", type: "numbered", label: "Numbered list", hint: "List with numbering", glyph: "1.", keywords: "numbered ordered list ol 1." },
  { id: "todo", type: "todo", label: "To-do list", hint: "Track tasks with a checkbox", glyph: "☐", keywords: "todo task checkbox check []" },
  { id: "toggle", type: "toggle", label: "Toggle", hint: "Collapse nested content", glyph: "▸", keywords: "toggle collapse fold details" },
  { id: "quote", type: "quote", label: "Quote", hint: "Capture a quote", glyph: "❝", keywords: "quote blockquote >" },
  { id: "callout", type: "callout", label: "Callout", hint: "Make writing stand out", glyph: "💡", keywords: "callout note info tip warning" },
  { id: "code", type: "code", label: "Code", hint: "Code snippet", glyph: "</>", keywords: "code snippet pre ```" },
  { id: "divider", type: "divider", label: "Divider", hint: "Visually divide blocks", glyph: "—", keywords: "divider separator hr line ---" },
  { id: "mention", label: "Mention page or issue", hint: "Link to another item", glyph: "@", keywords: "mention link page issue embed @" },
];

export const TURN_INTO: BlockType[] = ["p", "h1", "h2", "h3", "bullet", "numbered", "todo", "toggle", "quote", "callout", "code"];

export const TYPE_LABEL: Record<BlockType, string> = {
  p: "Text",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  bullet: "Bulleted list",
  numbered: "Numbered list",
  todo: "To-do",
  toggle: "Toggle",
  quote: "Quote",
  callout: "Callout",
  code: "Code",
  divider: "Divider",
  mention: "Mention",
};

/** Types whose Enter creates another block of the same type. */
export const CONTINUING: BlockType[] = ["bullet", "numbered", "todo"];

export const TEXTUAL = (t: BlockType) => t !== "divider" && t !== "mention";

export const CODE_LANGS = ["plain", "typescript", "javascript", "python", "bash", "json", "sql", "go", "rust", "markdown", "yaml", "html", "css"];

export const MARKDOWN_SHORTCUTS: [RegExp, BlockType, Partial<{ checked: boolean }>?][] = [
  [/^###\s$/, "h3"],
  [/^##\s$/, "h2"],
  [/^#\s$/, "h1"],
  [/^[-*+]\s$/, "bullet"],
  [/^1[.)]\s$/, "numbered"],
  [/^\[\s?\]\s$/, "todo", { checked: false }],
  [/^\[[xX]\]\s$/, "todo", { checked: true }],
  [/^>\s$/, "quote"],
  [/^```$/, "code"],
];
