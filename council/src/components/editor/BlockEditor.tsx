"use client";

import type { Block } from "@/lib/types";

// Placeholder: replaced by the full Notion-style block editor.
export interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}

export function BlockEditor({ blocks }: BlockEditorProps) {
  return <div className="doc">{blocks.map((b) => <p key={b.id}>{b.text}</p>)}</div>;
}
