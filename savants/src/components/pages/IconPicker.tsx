"use client";

import { useEffect, useRef } from "react";
import { PAGE_ICONS, PageIcon } from "@/components/PageIcon";

export function IconPicker({ onPick, onClose }: { onPick: (icon: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);
  return (
    <div ref={ref} role="dialog" aria-label="Choose an icon" className="animate-fade-in absolute left-0 top-[78px] z-50 w-[280px] rounded border border-line bg-bg p-2">
      <div className="mono-label px-1 pb-2">PAGE ICON</div>
      <div className="grid grid-cols-7 gap-0.5">
        {Object.keys(PAGE_ICONS).map((key) => (
          <button key={key} onClick={() => onPick(key)} aria-label={`Icon ${key}`} title={key} className="flex h-9 w-9 items-center justify-center rounded text-muted hover:bg-hover hover:text-fg">
            <PageIcon icon={key} size={18} className="text-current" />
          </button>
        ))}
      </div>
    </div>
  );
}
