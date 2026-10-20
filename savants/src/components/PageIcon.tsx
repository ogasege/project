"use client";

import {
  Archive,
  BookOpen,
  Building2,
  Clapperboard,
  Compass,
  FileText,
  FlaskConical,
  Gauge,
  Home,
  IdCard,
  Lightbulb,
  ListChecks,
  Mail,
  MessagesSquare,
  Mic,
  Network,
  RotateCcw,
  Scale,
  Send,
  Target,
  type LucideIcon,
} from "lucide-react";

// Page icons are line glyphs, not emoji (Emeka: emoji never appear in any context).
// `Item.icon` stores one of these keys; anything else (including legacy emoji) renders as a page.
export const PAGE_ICONS: Record<string, LucideIcon> = {
  page: FileText,
  home: Home,
  retro: RotateCcw,
  direction: Compass,
  scale: Scale,
  video: Clapperboard,
  profile: IdCard,
  send: Send,
  mail: Mail,
  idea: Lightbulb,
  target: Target,
  checklist: ListChecks,
  research: FlaskConical,
  notes: BookOpen,
  meeting: MessagesSquare,
  call: Mic,
  org: Building2,
  system: Network,
  metrics: Gauge,
  archive: Archive,
};

export function PageIcon({ icon, size = 14, className }: { icon?: string | null; size?: number; className?: string }) {
  const Icon = (icon && PAGE_ICONS[icon]) || FileText;
  return <Icon size={size} className={className ?? "shrink-0 text-faint"} aria-hidden />;
}
