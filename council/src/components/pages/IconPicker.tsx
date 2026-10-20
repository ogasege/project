"use client";

import { useEffect, useRef } from "react";

const ICONS = [
  "📄", "📝", "📌", "📎", "📚", "🗂", "🧭", "🧠", "💡", "🎯", "🚀", "⚡",
  "🔥", "✨", "🏛", "⚖", "🎬", "🪪", "📨", "📈", "📊", "🧪", "🛠", "⚙",
  "🔁", "◆", "🌍", "🌱", "✿", "❄", "⛏", "🏭", "🚚", "💰", "🤝", "🗣",
  "🎙", "📞", "🤖", "👥", "✅", "❓", "⚠️", "🔒", "🧾", "🗓", "🏁", "🌙",
];

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
    <div ref={ref} role="dialog" aria-label="Choose an icon" className="animate-fade-in absolute left-0 top-[78px] z-50 w-[320px] rounded-lg border border-line-strong bg-elev p-2 shadow-[var(--shadow)]">
      <div className="grid grid-cols-8 gap-0.5">
        {ICONS.map((i) => (
          <button key={i} onClick={() => onPick(i)} aria-label={`Icon ${i}`} className="flex h-9 w-9 items-center justify-center rounded-md text-[20px] hover:bg-hover">
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}
