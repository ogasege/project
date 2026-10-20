"use client";

import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsHelp, useGlobalShortcuts } from "./Shortcuts";

// Mount point for app-wide overlays: command palette, create-issue modal, shortcut help,
// and the global keyboard shortcut handler.
export function GlobalOverlays() {
  useGlobalShortcuts();
  return (
    <>
      <CommandPalette />
      <CreateIssueModal />
      <ShortcutsHelp />
    </>
  );
}
