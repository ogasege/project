"use client";

import { useEffect, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A living participant orb. Breathes when idle, ripples with `getLevel()` when speaking,
 * shimmers while thinking. Drawn on canvas so many orbs stay cheap.
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
    const [r, g, b] = hexToRgb(color);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let smooth = 0;
    let raf = 0;
    const rings: { r: number; a: number }[] = [];
    let lastRing = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const st = stateRef.current;
      const target = st === "speaking" || st === "listening" ? levelFn.current() : 0;
      smooth += (target - smooth) * 0.18;
      const cx = S / 2;
      const cy = S / 2;
      const base = size / 2;
      const breathe = reduce ? 0 : Math.sin(t * 1.4) * 0.025;
      const radius = base * (0.78 + breathe + smooth * 0.14);
      ctx.clearRect(0, 0, S, S);

      // outer glow
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.65);
      glow.addColorStop(0, `rgba(${r},${g},${b},${0.32 + smooth * 0.35})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.65, 0, Math.PI * 2);
      ctx.fill();

      // ripples
      if (!reduce && (st === "speaking" || st === "listening") && smooth > 0.15 && now - lastRing > 260 - smooth * 120) {
        rings.push({ r: radius, a: 0.55 * smooth + 0.15 });
        lastRing = now;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += 1.2 + smooth * 1.6;
        ring.a *= 0.965;
        if (ring.a < 0.02 || ring.r > S / 2) {
          rings.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},${ring.a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // core sphere with a wobbling surface
      ctx.save();
      ctx.beginPath();
      const pts = 72;
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const wob = reduce ? 0 : (Math.sin(a * 3 + t * 2.1) * 0.012 + Math.sin(a * 5 - t * 3.3) * 0.01) * (1 + smooth * 4);
        const rr = radius * (1 + wob);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const core = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.05, cx, cy, radius);
      core.addColorStop(0, `rgba(255,255,255,0.85)`);
      core.addColorStop(0.18, `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)},0.95)`);
      core.addColorStop(0.65, `rgba(${r},${g},${b},0.9)`);
      core.addColorStop(1, `rgba(${(r * 0.25) | 0},${(g * 0.25) | 0},${(b * 0.25) | 0},0.95)`);
      ctx.fillStyle = core;
      ctx.fill();
      ctx.clip();

      // inner swirl
      if (!reduce) {
        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < 3; k++) {
          const ang = t * (0.5 + k * 0.23) + k * 2.1;
          const sx = cx + Math.cos(ang) * radius * 0.45;
          const sy = cy + Math.sin(ang * 1.3) * radius * 0.4;
          const sw = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 0.7);
          sw.addColorStop(0, `rgba(255,255,255,${0.08 + smooth * 0.12})`);
          sw.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = sw;
          ctx.fillRect(0, 0, S, S);
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();

      // thinking shimmer
      if (st === "thinking") {
        const a0 = reduce ? 0 : t * 3.2;
        ctx.lineCap = "round";
        for (let k = 0; k < 2; k++) {
          ctx.strokeStyle = `rgba(255,255,255,${0.55 - k * 0.25})`;
          ctx.lineWidth = 2.5 - k;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * (1.12 + k * 0.1), a0 + k * Math.PI, a0 + k * Math.PI + Math.PI * 0.6);
          ctx.stroke();
        }
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
      style={{ width: size * 1.7, height: size * 1.7, margin: -size * 0.35, opacity: dim ? 0.55 : 1, transition: "opacity 400ms" }}
    />
  );
}
