"use client";

import { useEffect, useRef } from "react";
import { LOOK_BY_ID, seedOf, simulatedLevel, type PresenceLook, type PresenceState, type Scratch } from "@/lib/presence";

/**
 * A savant drawn in its chosen look. `size` is the visual diameter; the canvas is 1.7× that so
 * ticks, glows and orbits have room, and negative margins keep layout at `size`.
 * Without `getLevel` the voice level is simulated from the state, which is what work views use.
 * Canvases off screen stop drawing.
 */
export function Presence({
  look = "signal",
  color,
  state,
  getLevel,
  size = 120,
  dim = false,
  seedKey = color,
}: {
  look?: PresenceLook;
  color: string;
  state: PresenceState;
  getLevel?: () => number;
  size?: number;
  dim?: boolean;
  seedKey?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, getLevel });
  live.current = { state, getLevel };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const B = Math.round(size * 1.7);
    canvas.width = B * dpr;
    canvas.height = B * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const study = LOOK_BY_ID[look] ?? LOOK_BY_ID.signal;
    const seed = seedOf(seedKey);
    const scratch: Scratch = {};
    let visible = true;
    let lv = 0;
    let raf = 0;
    const t0 = performance.now();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = (Math.max(0, now - t0) / 1000) * (reduce ? 0.25 : 1);
      const { state: st, getLevel: gl } = live.current;
      const voiced = st === "speaking" || st === "listening";
      const target = voiced ? (gl ? gl() : simulatedLevel(st, t, seed % 7)) : 0;
      lv += (target - lv) * 0.22;
      ctx.clearRect(0, 0, B, B);
      study.draw(ctx, B, B, t, { state: st, lv, color, seed }, scratch);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [look, color, size, seedKey]);

  const B = Math.round(size * 1.7);
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ width: B, height: B, margin: -Math.round(size * 0.35), opacity: dim ? 0.5 : 1, transition: "opacity 220ms", flexShrink: 0 }}
    />
  );
}
