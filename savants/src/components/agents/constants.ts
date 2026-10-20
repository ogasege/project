import type { Autonomy } from "@/lib/types";

export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "default · strongest reasoning per dollar" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: "fast, capable" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", hint: "fastest, cheapest" },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1", hint: "most capable" },
];

export const AUTONOMY: { value: Autonomy; label: string; body: string }[] = [
  { value: "ask", label: "Ask every time", body: "Every write waits in Approvals. Where every agent starts." },
  { value: "low-risk", label: "Low-risk on its own", body: "Comments and new pages run immediately; issues and updates still need sign-off." },
  { value: "autonomous", label: "Autonomous", body: "Acts without asking. Grant it once the track record earns it; everything stays on record." },
];

export const TOOLS: { id: string; label: string; write: boolean }[] = [
  { id: "search_workspace", label: "Search the workspace", write: false },
  { id: "read_item", label: "Read pages and issues", write: false },
  { id: "list_integrations", label: "See and use integrations", write: false },
  { id: "create_issue", label: "Create issues", write: true },
  { id: "update_issue", label: "Update issues", write: true },
  { id: "create_page", label: "Write pages", write: true },
  { id: "append_to_item", label: "Edit pages and descriptions", write: true },
  { id: "comment", label: "Comment", write: true },
  { id: "run_integration", label: "Run integration actions", write: true },
];

export const AGENT_COLORS = ["#8b5cf6", "#f43f5e", "#f59e0b", "#10b981", "#38bdf8", "#ec4899", "#a3e635", "#f97316"];
export const GLYPHS = ["◆", "▲", "■", "●", "✦", "⬢", "✳", "◉"];
