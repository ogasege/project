"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { Kbd, Modal } from "@/components/ui";
import { createPage } from "@/components/pages/actions";
import { isTypingTarget } from "@/components/issues/helpers";

const GO: Record<string, string> = { o: "/", i: "/inbox", m: "/my-issues", p: "/projects", a: "/agents", c: "/call", s: "/settings" };

export const SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  {
    group: "General",
    items: [
      { keys: ["⌘", "K"], label: "Command menu" },
      { keys: ["C"], label: "Create issue" },
      { keys: ["N"], label: "Create page" },
      { keys: ["?"], label: "Keyboard shortcuts" },
      { keys: ["/"], label: "Search" },
    ],
  },
  {
    group: "Navigation",
    items: [
      { keys: ["G", "I"], label: "Go to inbox" },
      { keys: ["G", "M"], label: "Go to my issues" },
      { keys: ["G", "P"], label: "Go to projects" },
      { keys: ["G", "A"], label: "Go to agents" },
      { keys: ["G", "C"], label: "Go to call" },
      { keys: ["G", "S"], label: "Go to settings" },
    ],
  },
  {
    group: "Issue lists",
    items: [
      { keys: ["J"], label: "Next issue" },
      { keys: ["K"], label: "Previous issue" },
      { keys: ["↵"], label: "Open issue" },
    ],
  },
  {
    group: "Editor & forms",
    items: [
      { keys: ["/"], label: "Block commands (in a document)" },
      { keys: ["⌘", "↵"], label: "Submit issue / comment" },
      { keys: ["esc"], label: "Close dialog" },
    ],
  },
  {
    group: "Call",
    items: [{ keys: ["Space"], label: "Push to talk (on a call)" }],
  },
];

/** Global keyboard handler. Ignores keys typed into inputs, editors, open dialogs or menus. */
export function useGlobalShortcuts() {
  const router = useRouter();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { ui, setUI } = useStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setUI({ paletteOpen: !ui.paletteOpen });
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (isTypingTarget(e.target)) return;
      if (ui.paletteOpen || ui.createIssue || ui.shortcutsOpen) return;
      if (document.querySelector("[role=dialog],[data-menu-panel]")) return;
      // The call room owns its own keys (Space = push-to-talk).
      if (window.location.pathname.startsWith("/call/")) return;

      const key = e.key.toLowerCase();
      if (pendingG.current) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const dest = GO[key];
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        return;
      }
      if (key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 900);
        return;
      }
      if (key === "c") {
        e.preventDefault();
        setUI({ createIssue: {} });
      } else if (key === "n") {
        e.preventDefault();
        void createPage(null).then((id) => router.push(`/page/${id}`));
      } else if (e.key === "?") {
        e.preventDefault();
        setUI({ shortcutsOpen: true });
      } else if (e.key === "/") {
        e.preventDefault();
        setUI({ paletteOpen: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}

export function ShortcutsHelp() {
  const open = useStore((s) => s.ui.shortcutsOpen);
  const setUI = useStore((s) => s.setUI);
  return (
    <Modal open={open} onClose={() => setUI({ shortcutsOpen: false })} label="Keyboard shortcuts" className="w-[560px]">
      <div className="border-b border-line px-5 py-3 font-medium">Keyboard shortcuts</div>
      <div className="grid max-h-[60vh] grid-cols-2 gap-x-8 gap-y-5 overflow-y-auto px-5 py-4">
        {SHORTCUTS.map((g) => (
          <section key={g.group}>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-faint">{g.group}</h3>
            <ul className="space-y-1.5">
              {g.items.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="flex-1 text-muted">{s.label}</span>
                  <span className="flex gap-1">
                    {s.keys.map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
