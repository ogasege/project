"use client";

import { LOOKS, type PresenceLook } from "@/lib/presence";
import { Presence } from "@/components/presence/Presence";
import { clsx, Modal } from "@/components/ui";

/** Every look, drawn live in this savant's colour, so the user picks by seeing. */
export function LookPicker({ name, color, value, onChange, onClose }: { name: string; color: string; value: PresenceLook; onChange: (l: PresenceLook) => void; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} label={`How ${name} looks`} className="w-[720px] max-w-[calc(100vw-32px)]">
      <div data-theme="dark" className="rounded-xl bg-[#0b0c0e] p-4 text-fg">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">How {name} looks while working</h2>
          <span className="text-[12px] text-faint">Hover to see it think</span>
        </div>
        <div className="grid max-h-[62vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
          {LOOKS.map((l) => (
            <LookTile key={l.id} look={l.id} name={l.name} blurb={l.blurb} color={color} selected={value === l.id} onPick={() => (onChange(l.id), onClose())} />
          ))}
        </div>
      </div>
    </Modal>
  );
}

function LookTile({ look, name, blurb, color, selected, onPick }: { look: PresenceLook; name: string; blurb: string; color: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      title={blurb}
      aria-pressed={selected}
      className={clsx(
        "group flex flex-col items-center gap-1 rounded-lg border-[0.5px] px-1 pb-2 pt-3 transition-colors",
        selected ? "border-white/60 bg-white/[0.06]" : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]",
      )}
    >
      <span className="flex h-[76px] w-[76px] items-center justify-center">
        <HoverPresence look={look} color={color} />
      </span>
      <span className="text-[12px] font-medium text-[#e6e7ea]">{name}</span>
    </button>
  );
}

// Speaks normally; thinks while hovered, so both states can be compared.
function HoverPresence({ look, color }: { look: PresenceLook; color: string }) {
  return (
    <span className="relative flex items-center justify-center">
      <span className="group-hover:hidden">
        <Presence look={look} color={color} state="speaking" size={60} />
      </span>
      <span className="hidden group-hover:flex">
        <Presence look={look} color={color} state="thinking" size={60} />
      </span>
    </span>
  );
}
