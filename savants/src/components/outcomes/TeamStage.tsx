"use client";

import { useEffect, useRef } from "react";
import { TEAM_VIEW_BY_ID, TEAM_VIEWS, type Scratch, type TeamFrame, type TeamNode } from "@/lib/team-views";
import { clsx } from "@/components/ui";

export interface StageMember {
  id: string;
  name: string;
  color: string;
  status: TeamNode["status"];
  thinking?: boolean;
}

/** The whole team drawn in one of the team views. Fills its container's width. */
export function TeamStage({ view, lead, reps, height = 320 }: { view: string; lead: StageMember; reps: StageMember[]; height?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const data = useRef({ lead, reps });
  data.current = { lead, reps };
  // When a specialist stops working, remember when, so its result can travel back to the lead.
  const reported = useRef<Record<string, number>>({});
  const prev = useRef<Record<string, string>>({});
  for (const r of reps) {
    if (prev.current[r.id] === "working" && r.status !== "working") reported.current[r.id] = performance.now();
    prev.current[r.id] = r.status;
  }

  useEffect(() => {
    const canvas = ref.current, box = wrap.current;
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const v = TEAM_VIEW_BY_ID[view] ?? TEAM_VIEWS[0];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st: Scratch = {};
    let w = 0;
    let visible = true;
    let raf = 0;
    const t0 = performance.now();
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = box.clientWidth;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || !w) return;
      const t = (Math.max(0, now - t0) / 1000) * (reduce ? 0.25 : 1);
      const toNode = (m: StageMember): TeamNode => ({
        ...m,
        thinking: !!m.thinking,
        backAge: reported.current[m.id] ? (now - reported.current[m.id]) / 1000 : Infinity,
      });
      const f: TeamFrame = { lead: toNode(data.current.lead), reps: data.current.reps.map(toNode) };
      ctx.clearRect(0, 0, w, height);
      v.draw(ctx, w, height, t, f, st);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [view, height]);

  return (
    <div ref={wrap} className="w-full">
      <canvas ref={ref} role="img" aria-label={`${lead.name} and ${reps.length} specialists, shown as ${TEAM_VIEW_BY_ID[view]?.name ?? "a team view"}`} />
    </div>
  );
}

export function ViewPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Team view" className="flex flex-wrap gap-1">
      {TEAM_VIEWS.map((v) => (
        <button
          key={v.id}
          role="radio"
          aria-checked={value === v.id}
          title={v.blurb}
          onClick={() => onChange(v.id)}
          className={clsx(
            "h-7 rounded-full border-[0.5px] px-2.5 text-[12px] font-medium transition-colors",
            value === v.id ? "border-transparent bg-white/90 text-[#0b0c0e]" : "border-white/10 text-[#9a9ca3] hover:border-white/20 hover:text-white",
          )}
        >
          {v.name}
        </button>
      ))}
    </div>
  );
}
