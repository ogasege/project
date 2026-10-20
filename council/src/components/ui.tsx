"use client";

import clsx from "clsx";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Member, Priority, StatusType, WorkflowState } from "@/lib/types";
import { initials } from "@/lib/workspace";

export { clsx };

// ---------- Avatar ----------
export function Avatar({ member, size = 20, ring = false }: { member?: Member | null; size?: number; ring?: boolean }) {
  if (!member)
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-faint"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        aria-label="Unassigned"
      >
        ·
      </span>
    );
  const isAgent = member.kind === "agent";
  return (
    <span
      title={`${member.name}${isAgent ? ` · ${member.agent?.role ?? "Agent"}` : ""}`}
      className={clsx("relative inline-flex shrink-0 items-center justify-center font-semibold text-white", isAgent ? "rounded-[30%]" : "rounded-full", ring && "ring-2 ring-bg")}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.42),
        background: isAgent ? `radial-gradient(circle at 30% 25%, ${member.color}, ${member.color}aa 60%, #0008)` : member.color,
      }}
    >
      {isAgent ? member.avatar ?? member.name[0] : initials(member.name)}
    </span>
  );
}

// ---------- Status icon (Linear style) ----------
export function StatusIcon({ state, size = 14 }: { state?: WorkflowState; size?: number }) {
  const type: StatusType = state?.type ?? "backlog";
  const color = state?.color ?? "#8a8f98";
  const r = 6;
  const c = 2 * Math.PI * 3;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-label={state?.name ?? "Status"} role="img" className="shrink-0">
      {type === "backlog" && <circle cx="7" cy="7" r={r} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />}
      {type === "unstarted" && <circle cx="7" cy="7" r={r} fill="none" stroke={color} strokeWidth="1.5" />}
      {(type === "started" || type === "review") && (
        <>
          <circle cx="7" cy="7" r={r} fill="none" stroke={color} strokeWidth="1.5" />
          <circle cx="7" cy="7" r="3" fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${c * (type === "review" ? 0.75 : 0.5)} ${c}`} transform="rotate(-90 7 7)" />
        </>
      )}
      {type === "completed" && (
        <>
          <circle cx="7" cy="7" r="7" fill={color} />
          <path d="M4 7.2l2 2 4-4.2" fill="none" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {type === "canceled" && (
        <>
          <circle cx="7" cy="7" r="7" fill={color} />
          <path d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// ---------- Priority icon ----------
export function PriorityIcon({ priority = 0, size = 14 }: { priority?: Priority; size?: number }) {
  const label = ["No priority", "Urgent", "High", "Medium", "Low"][priority];
  if (priority === 1)
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" role="img" aria-label={label} className="shrink-0">
        <rect x="1" y="1" width="12" height="12" rx="3" fill="#f2994a" />
        <path d="M7 3.8v4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="7" cy="10.2" r="1" fill="#fff" />
      </svg>
    );
  if (priority === 0)
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" role="img" aria-label={label} className="shrink-0">
        {[2.5, 6, 9.5].map((x) => (
          <rect key={x} x={x} y="6.4" width="2" height="1.4" rx=".5" fill="var(--fg-faint)" />
        ))}
      </svg>
    );
  const filled = 4 - priority + 1; // high=3, medium=2, low=1
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" role="img" aria-label={label} className="shrink-0">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={2 + i * 3.6} y={9 - i * 3} width="2.4" height={3 + i * 3} rx=".6" fill={i < filled ? "var(--fg-muted)" : "var(--border-strong)"} />
      ))}
    </svg>
  );
}

// ---------- Buttons ----------
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "subtle" | "danger"; size?: "sm" | "md" };
export function Button({ variant = "subtle", size = "md", className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={clsx(
        "inline-flex select-none items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-6 px-2 text-xs" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-accent text-accent-fg hover:brightness-110",
        variant === "subtle" && "border border-line bg-panel text-fg hover:bg-hover",
        variant === "ghost" && "text-muted hover:bg-hover hover:text-fg",
        variant === "danger" && "bg-danger text-white hover:brightness-110",
        className,
      )}
    />
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

// ---------- Popover menu with type-to-filter ----------
export interface MenuOption<T> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
}

export function Menu<T>({
  trigger,
  options,
  value,
  onSelect,
  placeholder = "Filter…",
  align = "start",
  className,
  multi = false,
}: {
  trigger: React.ReactNode;
  options: MenuOption<T>[];
  value?: T | T[];
  onSelect: (v: T) => void;
  placeholder?: string;
  align?: "start" | "end";
  className?: string;
  multi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const filtered = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const isSelected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = 240;
    const left = align === "end" ? Math.max(8, r.right - width) : Math.min(r.left, window.innerWidth - width - 8);
    const top = Math.min(r.bottom + 4, window.innerHeight - 320);
    setPos({ top, left });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu-panel]") && !btnRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (o: MenuOption<T>) => {
    onSelect(o.value);
    if (!multi) setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={clsx("inline-flex items-center gap-1.5 rounded-md text-left", className)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            data-menu-panel
            className="animate-fade-in fixed z-[100] w-60 overflow-hidden rounded-lg border border-line-strong bg-elev shadow-[var(--shadow)]"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                else if (e.key === "Enter" && filtered[active]) { e.preventDefault(); choose(filtered[active]); }
                else if (e.key === "Escape") setOpen(false);
              }}
              placeholder={placeholder}
              className="w-full border-b border-line bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-faint"
            />
            <div role="listbox" className="max-h-72 overflow-y-auto p-1">
              {filtered.length === 0 && <div className="px-2 py-1.5 text-faint">No results</div>}
              {filtered.map((o, i) => (
                <button
                  key={String(o.value) + i}
                  role="option"
                  aria-selected={isSelected(o.value)}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={clsx("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left", i === active && "bg-hover")}
                >
                  {o.icon}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-xs text-faint">{o.hint}</span>}
                  {isSelected(o.value) && <span className="text-accent">✓</span>}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, children, className, label }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={clsx("animate-fade-in w-[640px] max-w-[94vw] overflow-hidden rounded-xl border border-line-strong bg-elev shadow-[var(--shadow)]", className)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Layout bits ----------
export function PageHeader({ title, icon, children }: { title: React.ReactNode; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
      {icon}
      <h1 className="truncate text-[13px] font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-1.5">{children}</div>
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="text-[15px] font-medium">{title}</div>
      {body && <p className="max-w-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function LabelPill({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full border border-line px-2 text-[11px] text-muted">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}
