"use client";

import { useEffect, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

/**
 * A participant drawn as a radial signal meter (Emeka: 1px rules, no glow, no gradients).
 * Ticks around the ring extend with `getLevel()` while the participant speaks or listens.
 * Thinking is the system's indeterminate-progress mark: a 1.5s accent sweep along the ring.
 * Motion reports state only; idle is still.
 */
export function Orb({ color, state, getLevel, size = 160, dim = false }: { color: string; state: OrbState; getLevel: () => number; size?: number; dim?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const levelFn = useRef(getLevel);
  stateRef.current = state;
  levelFn.current = getLevel;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = size * 1.7;
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const TICKS = 96;
    // Per-tick phase offsets give the meter an irregular, voice-like profile.
    const phase = Array.from({ length: TICKS }, (_, i) => Math.sin(i * 12.9898) * 43758.5453 % (Math.PI * 2));
    let smooth = 0;
    let raf = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const st = stateRef.current;
      const active = st === "speaking" || st === "listening";
      const target = active ? levelFn.current() : 0;
      smooth += (target - smooth) * 0.22;
      const cx = S / 2;
      const cy = S / 2;
      const R = size * 0.42;
      ctx.clearRect(0, 0, S, S);

      // Ticks: inert grey when silent, the participant's colour while speaking.
      ctx.lineWidth = 1;
      for (let i = 0; i < TICKS; i++) {
        const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
        const wave = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 9 + phase[i]) * Math.sin(t * 3.1 + i * 0.4);
        const len = 4 + (active ? smooth * size * 0.32 * (0.35 + wave * 0.65) : 0);
        ctx.strokeStyle = active && smooth > 0.04 ? color : "#2A2F33";
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
        ctx.stroke();
      }

      // Inner disc: panel fill, one 1px rule in the participant's colour.
      ctx.fillStyle = "#0E1114";
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Thinking: accent sweep along a 1px track, 1.5s per revolution.
      if (st === "thinking") {
        const a0 = reduce ? 0 : ((t % 1.5) / 1.5) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = "#1E2226";
        ctx.beginPath();
        ctx.arc(cx, cy, R + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#19D1FF";
        ctx.beginPath();
        ctx.arc(cx, cy, R + 10, a0, a0 + Math.PI * 0.5);
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [color, size]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ width: size * 1.7, height: size * 1.7, margin: -size * 0.35, opacity: dim ? 0.5 : 1, transition: "opacity 220ms" }}
    />
  );
}
