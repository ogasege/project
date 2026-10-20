// Team views: how the room draws the whole team working an outcome. The lead sits at the
// centre of each one; specialists are placed around it. While a specialist works, handoff
// particles flow out from the lead; when it finishes, a pulse travels back. Plain 2D canvas.

import { rgba } from "./presence";
import type { WorkstreamStatus } from "./types";

export interface TeamNode {
  id: string;
  name: string;
  color: string;
  status: WorkstreamStatus | "lead";
  thinking: boolean;
  backAge: number; // seconds since it reported back (Infinity if not recently)
}

export interface TeamFrame {
  lead: TeamNode;
  reps: TeamNode[];
}

type Pt = [number, number];

export interface Scratch {
  roots?: Record<string, Pt[]>;
  w?: number;
  h?: number;
}

interface View {
  id: string;
  name: string;
  blurb: string;
  draw(c: CanvasRenderingContext2D, w: number, h: number, t: number, f: TeamFrame, st: Scratch): void;
}

const TAU = Math.PI * 2;
const LINE = "#24262b";
const LABEL = "#9a9ca3";
const AMBER = "#f2994a";

const busy = (n: TeamNode) => n.status === "working" || n.status === "lead";
const lerp = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

function label(c: CanvasRenderingContext2D, x: number, y: number, text: string, strong = false) {
  c.font = `${strong ? 600 : 500} 11px "Inter Variable", system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "top";
  c.fillStyle = strong ? "#e6e7ea" : LABEL;
  c.fillText(text, x, y);
}

/** A savant: a solid disc in its colour; working adds a pulse ring, thinking a spinning arc,
 *  waiting on you an amber dot, done a calm outline. */
function node(c: CanvasRenderingContext2D, [x, y]: Pt, r: number, n: TeamNode, t: number) {
  if (busy(n)) {
    const p = (t * 0.9 + (n.id.length % 5) * 0.2) % 1;
    c.strokeStyle = rgba(n.color, 0.5 * (1 - p));
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(x, y, r * (1.2 + p * 0.9), 0, TAU);
    c.stroke();
  }
  c.fillStyle = n.status === "queued" ? rgba(n.color, 0.45) : n.color;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  if (n.thinking) {
    const a0 = t * 4;
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(x, y, r + 4, a0, a0 + 1.4);
    c.stroke();
  }
  if (n.status === "done") {
    c.strokeStyle = rgba(n.color, 0.6);
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x, y, r + 4, 0, TAU);
    c.stroke();
  }
  if (n.status === "needs-you") {
    c.fillStyle = AMBER;
    c.beginPath();
    c.arc(x + r * 0.75, y - r * 0.75, Math.max(3, r * 0.3), 0, TAU);
    c.fill();
  }
}

/** Handoff particles along any path from the lead (u=0) to a rep (u=1). */
function flow(c: CanvasRenderingContext2D, at: (u: number) => Pt, n: TeamNode, t: number, size = 2.2) {
  if (n.status === "working") {
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.45 + k / 3) % 1;
      const [x, y] = at(u);
      c.fillStyle = rgba(n.color, 0.35 + 0.65 * Math.sin(u * Math.PI));
      c.beginPath();
      c.arc(x, y, size, 0, TAU);
      c.fill();
    }
  }
  if (n.backAge < 2.5) {
    const u = 1 - n.backAge / 2.5;
    const [x, y] = at(u);
    c.fillStyle = rgba(n.color, 0.9);
    c.shadowColor = n.color;
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(x, y, size * 1.8, 0, TAU);
    c.fill();
    c.shadowBlur = 0;
  }
}

function line(c: CanvasRenderingContext2D, a: Pt, b: Pt, color = LINE, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.stroke();
}

const sizeOf = (w: number, h: number) => Math.min(w, h);

export const TEAM_VIEWS: View[] = [
  {
    id: "orbit",
    name: "Planetary orbit",
    blurb: "The lead is the sun; specialists orbit it. Work goes out as comets and comes back as pulses.",
    draw(c, w, h, t, f) {
      const cx = w / 2, cy = h / 2, m = sizeOf(w, h);
      const sun: Pt = [cx, cy];
      const n = f.reps.length;
      // Sun glow and orbit paths.
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, m * 0.16);
      g.addColorStop(0, rgba(f.lead.color, 0.45));
      g.addColorStop(1, rgba(f.lead.color, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, m * 0.16, 0, TAU);
      c.fill();
      const pos = f.reps.map((r, i): Pt => {
        // Ellipses that fill the stage without touching its edges.
        const k = (i + 1) / Math.max(1, n);
        const rx = w * (0.12 + 0.3 * k), ry = h * (0.14 + 0.28 * k);
        c.strokeStyle = LINE;
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(cx, cy, rx, ry, 0, 0, TAU);
        c.stroke();
        const a = t * (0.32 / (1 + i * 0.35)) + i * 2.1;
        return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
      });
      f.reps.forEach((r, i) => flow(c, (u) => lerp(sun, pos[i], u), r, t));
      node(c, sun, m * 0.055, f.lead, t);
      label(c, cx, cy + m * 0.055 + 8, f.lead.name, true);
      f.reps.forEach((r, i) => {
        node(c, pos[i], m * (busy(r) ? 0.03 : 0.024), r, t);
        label(c, pos[i][0], pos[i][1] + m * 0.03 + 6, r.name);
      });
    },
  },
  {
    id: "constellation",
    name: "Council constellation",
    blurb: "Everyone linked to everyone. Links light up between the lead and whoever it hands work to.",
    draw(c, w, h, t, f) {
      const all = [f.lead, ...f.reps];
      const cx = w / 2, cy = h / 2, R = sizeOf(w, h) * 0.36;
      const pos = all.map((_, i): Pt => {
        const a = -Math.PI / 2 + (i / all.length) * TAU;
        return [cx + Math.cos(a) * R * (w / h > 1.4 ? 1.5 : 1), cy + Math.sin(a) * R];
      });
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) line(c, pos[i], pos[j], i === 0 && busy(all[j]) ? rgba(all[j].color, 0.5) : LINE);
      f.reps.forEach((r, i) => flow(c, (u) => lerp(pos[0], pos[i + 1], u), r, t));
      all.forEach((n, i) => {
        const r = sizeOf(w, h) * (i === 0 ? 0.05 : 0.032);
        node(c, pos[i], r, n, t);
        label(c, pos[i][0], pos[i][1] + r + 7, n.name, i === 0);
      });
    },
  },
  {
    id: "atom",
    name: "Atom",
    blurb: "Specialists ride tilted electron orbits around the lead's nucleus.",
    draw(c, w, h, t, f) {
      const cx = w / 2, cy = h / 2, m = sizeOf(w, h), R = m * 0.4;
      const nuc: Pt = [cx, cy];
      const pos = f.reps.map((r, i): Pt => {
        const tilt = (i / Math.max(1, f.reps.length)) * Math.PI;
        c.save();
        c.translate(cx, cy);
        c.rotate(tilt);
        c.strokeStyle = busy(r) ? rgba(r.color, 0.35) : LINE;
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(0, 0, R * 1.25, R * 0.38, 0, 0, TAU);
        c.stroke();
        c.restore();
        const a = t * (0.8 + i * 0.15) + i;
        const ex = Math.cos(a) * R * 1.25, ey = Math.sin(a) * R * 0.38;
        return [cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)];
      });
      f.reps.forEach((r, i) => flow(c, (u) => lerp(nuc, pos[i], u), r, t, 1.8));
      node(c, nuc, m * 0.06, f.lead, t);
      label(c, cx, cy + m * 0.06 + 6, f.lead.name, true);
      f.reps.forEach((r, i) => {
        node(c, pos[i], m * 0.026, r, t);
        label(c, pos[i][0], pos[i][1] + m * 0.026 + 5, r.name);
      });
    },
  },
  {
    id: "tree",
    name: "Relay tree",
    blurb: "An org chart that moves: work flows down the branches to each specialist and results flow back up.",
    draw(c, w, h, t, f) {
      const m = sizeOf(w, h), top: Pt = [w / 2, h * 0.2], n = f.reps.length;
      const pos = f.reps.map((_, i): Pt => [w * (0.12 + (0.76 * (i + 0.5)) / Math.max(1, n)), h * 0.72]);
      const curve = (b: Pt) => (u: number): Pt => {
        const mid = (top[1] + b[1]) / 2;
        const p0 = top, p1: Pt = [top[0], mid], p2: Pt = [b[0], mid], p3 = b;
        const v = 1 - u;
        return [v ** 3 * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u ** 3 * p3[0], v ** 3 * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u ** 3 * p3[1]];
      };
      f.reps.forEach((r, i) => {
        const at = curve(pos[i]);
        c.strokeStyle = busy(r) ? rgba(r.color, 0.45) : LINE;
        c.lineWidth = 1.2;
        c.beginPath();
        for (let k = 0; k <= 30; k++) {
          const [x, y] = at(k / 30);
          if (k) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.stroke();
        flow(c, at, r, t);
      });
      node(c, top, m * 0.06, f.lead, t);
      label(c, top[0], top[1] + m * 0.06 + 6, f.lead.name, true);
      f.reps.forEach((r, i) => {
        node(c, pos[i], m * 0.04, r, t);
        label(c, pos[i][0], pos[i][1] + m * 0.04 + 7, r.name);
      });
    },
  },
  {
    id: "radar",
    name: "Radar",
    blurb: "A sweep from the lead finds each specialist; working ones ping back.",
    draw(c, w, h, t, f) {
      const cx = w / 2, cy = h / 2, R = sizeOf(w, h) * 0.44;
      for (let k = 1; k <= 3; k++) {
        c.strokeStyle = LINE;
        c.lineWidth = 1;
        c.beginPath();
        c.arc(cx, cy, (R * k) / 3, 0, TAU);
        c.stroke();
      }
      const sweep = (t * 0.9) % TAU;
      const g = c.createConicGradient(sweep - 0.9, cx, cy);
      g.addColorStop(0, rgba(f.lead.color, 0));
      g.addColorStop(0.14, rgba(f.lead.color, 0.28));
      g.addColorStop(0.15, rgba(f.lead.color, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, R, 0, TAU);
      c.fill();
      line(c, [cx, cy], [cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R], rgba(f.lead.color, 0.7));
      f.reps.forEach((r, i) => {
        const a = (i / f.reps.length) * TAU + 0.4, d = R * (0.45 + (i % 3) * 0.2);
        const p: Pt = [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
        const since = (sweep - a + TAU * 4) % TAU;
        if (busy(r) && since < 1.2) {
          c.strokeStyle = rgba(r.color, 0.7 * (1 - since / 1.2));
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(p[0], p[1], 6 + since * 18, 0, TAU);
          c.stroke();
        }
        flow(c, (u) => lerp([cx, cy], p, u), r, t, 1.8);
        node(c, p, sizeOf(w, h) * 0.026, r, t);
        label(c, p[0], p[1] + sizeOf(w, h) * 0.026 + 5, r.name);
      });
      node(c, [cx, cy], sizeOf(w, h) * 0.045, f.lead, t);
      label(c, cx, cy + sizeOf(w, h) * 0.045 + 6, f.lead.name, true);
    },
  },
  {
    id: "swarm",
    name: "Swarm",
    blurb: "Each specialist is a small swarm. Idle swarms circle the lead; working ones fly out to their task.",
    draw(c, w, h, t, f) {
      const cx = w / 2, cy = h / 2, m = sizeOf(w, h);
      f.reps.forEach((r, i) => {
        const a = (i / f.reps.length) * TAU - Math.PI / 2;
        const home: Pt = busy(r) || r.status === "done" || r.status === "needs-you" ? [cx + Math.cos(a) * w * 0.36, cy + Math.sin(a) * h * 0.34] : [cx + Math.cos(a + t * 0.3) * m * 0.16, cy + Math.sin(a + t * 0.3) * m * 0.16];
        for (let k = 0; k < 16; k++) {
          const ph = k * 2.399 + i;
          const rad = m * (0.02 + 0.035 * ((k % 4) / 4)) * (busy(r) ? 1.2 : 0.8);
          const x = home[0] + Math.cos(t * (1.2 + (k % 3) * 0.4) + ph) * rad + Math.sin(t * 2.3 + ph) * 3;
          const y = home[1] + Math.sin(t * (1.1 + (k % 4) * 0.3) + ph) * rad;
          c.fillStyle = rgba(r.color, r.status === "queued" ? 0.4 : 0.85);
          c.beginPath();
          c.arc(x, y, 1.8, 0, TAU);
          c.fill();
        }
        flow(c, (u) => lerp([cx, cy], home, u), r, t, 1.6);
        if (r.status === "needs-you") node(c, home, 0.01, { ...r, status: "needs-you", thinking: false }, t);
        label(c, home[0], home[1] + m * 0.07, r.name);
      });
      node(c, [cx, cy], m * 0.05, f.lead, t);
      label(c, cx, cy + m * 0.05 + 6, f.lead.name, true);
    },
  },
  {
    id: "roots",
    name: "Roots",
    blurb: "Work grows from the lead like roots toward each specialist; light runs along a root while it works.",
    draw(c, w, h, t, f, st) {
      const m = sizeOf(w, h), src: Pt = [w / 2, h * 0.18];
      const ends = f.reps.map((_, i): Pt => [w * (0.1 + (0.8 * (i + 0.5)) / Math.max(1, f.reps.length)), h * 0.78]);
      if (!st.roots || st.w !== w || st.h !== h) {
        st.roots = {};
        st.w = w;
        st.h = h;
      }
      f.reps.forEach((r, i) => {
        let pts = st.roots![r.id];
        if (!pts) {
          pts = [];
          let seed = r.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
          const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
          for (let k = 0; k <= 24; k++) {
            const u = k / 24;
            const [x, y] = lerp(src, ends[i], u);
            pts.push([x + Math.sin(u * Math.PI) * (rnd() - 0.5) * m * 0.12, y + (rnd() - 0.5) * m * 0.02]);
          }
          st.roots![r.id] = pts;
        }
        c.strokeStyle = busy(r) ? rgba(r.color, 0.55) : LINE;
        c.lineWidth = busy(r) ? 1.6 : 1;
        c.beginPath();
        pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
        // Small rootlets.
        for (let k = 4; k < pts.length - 2; k += 5) line(c, pts[k], [pts[k][0] + Math.sin(k + i) * m * 0.04, pts[k][1] + m * 0.03], LINE);
        const at = (u: number): Pt => {
          const x = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(x));
          return lerp(pts[k], pts[k + 1], x - k);
        };
        flow(c, at, r, t);
        node(c, ends[i], m * 0.035, r, t);
        label(c, ends[i][0], ends[i][1] + m * 0.035 + 6, r.name);
      });
      node(c, src, m * 0.055, f.lead, t);
      label(c, src[0] + m * 0.1, src[1] - 6, f.lead.name, true);
    },
  },
  {
    id: "metro",
    name: "Metro map",
    blurb: "Each specialist has its own line from the lead's hub station. Trains run while the work does.",
    draw(c, w, h, t, f) {
      const m = sizeOf(w, h), hub: Pt = [w * 0.5, h * 0.5];
      f.reps.forEach((r, i) => {
        const a = (i / f.reps.length) * TAU - Math.PI / 2;
        const dir: Pt = [Math.round(Math.cos(a)), Math.round(Math.sin(a))];
        const bend: Pt = [hub[0] + dir[0] * m * 0.18, hub[1] + dir[1] * m * 0.18];
        const end: Pt = [hub[0] + Math.cos(a) * w * 0.4, hub[1] + Math.sin(a) * h * 0.38];
        // Out of the hub on a straight track, then one bend to the terminus, like a transit map.
        const pts: Pt[] = [hub, bend, end];
        c.strokeStyle = rgba(r.color, busy(r) || r.status === "done" ? 0.9 : 0.35);
        c.lineWidth = 4;
        c.lineJoin = "round";
        c.beginPath();
        pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
        const lens = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
        const total = lens.reduce((s, v) => s + v, 0) || 1;
        const at = (u: number): Pt => {
          let d = u * total;
          for (let k = 0; k < lens.length; k++) {
            if (d <= lens[k] || k === lens.length - 1) return lerp(pts[k], pts[k + 1], Math.min(1, d / (lens[k] || 1)));
            d -= lens[k];
          }
          return end;
        };
        if (r.status === "working") {
          const [x, y] = at((t * 0.25 + i * 0.3) % 1);
          c.fillStyle = "#ffffff";
          c.beginPath();
          c.roundRect(x - 5, y - 3, 10, 6, 3);
          c.fill();
        }
        flow(c, at, { ...r, status: r.status === "working" ? "queued" : r.status }, t, 2.5);
        c.fillStyle = "#121317";
        c.strokeStyle = r.color;
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(end[0], end[1], 7, 0, TAU);
        c.fill();
        c.stroke();
        if (r.status === "needs-you") node(c, end, 0.01, r, t);
        label(c, end[0], end[1] + 11, r.name);
      });
      c.fillStyle = "#121317";
      c.strokeStyle = "#e6e7ea";
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(hub[0] - 14, hub[1] - 9, 28, 18, 9);
      c.fill();
      c.stroke();
      label(c, hub[0], hub[1] + 14, f.lead.name, true);
    },
  },
  {
    id: "broadcast",
    name: "Broadcast",
    blurb: "The lead sends out waves; each specialist lights up as a wave reaches it and answers with its own.",
    draw(c, w, h, t, f) {
      const cx = w / 2, cy = h / 2, m = sizeOf(w, h), R = m * 0.42;
      for (let k = 0; k < 3; k++) {
        const p = (t * 0.35 + k / 3) % 1;
        c.strokeStyle = rgba(f.lead.color, 0.45 * (1 - p));
        c.lineWidth = 1.5;
        c.beginPath();
        c.ellipse(cx, cy, p * R * (w / h > 1.4 ? 1.6 : 1), p * R, 0, 0, TAU);
        c.stroke();
      }
      f.reps.forEach((r, i) => {
        const a = (i / f.reps.length) * TAU - Math.PI / 2;
        const p: Pt = [cx + Math.cos(a) * R * 0.85 * (w / h > 1.4 ? 1.6 : 1), cy + Math.sin(a) * R * 0.85];
        if (busy(r)) {
          const q = (t * 0.8 + i * 0.2) % 1;
          c.strokeStyle = rgba(r.color, 0.6 * (1 - q));
          c.lineWidth = 1.2;
          c.beginPath();
          c.arc(p[0], p[1], 6 + q * m * 0.08, 0, TAU);
          c.stroke();
        }
        flow(c, (u) => lerp([cx, cy], p, u), r, t, 1.8);
        node(c, p, m * 0.03, r, t);
        label(c, p[0], p[1] + m * 0.03 + 6, r.name);
      });
      node(c, [cx, cy], m * 0.05, f.lead, t);
      label(c, cx, cy + m * 0.05 + 6, f.lead.name, true);
    },
  },
  {
    id: "lanes",
    name: "Swimlanes",
    blurb: "One lane per specialist. Work leaves the lead on the left and moves right as it gets done.",
    draw(c, w, h, t, f) {
      const n = f.reps.length, top = h * 0.1, lh = (h * 0.8) / Math.max(1, n), left = w * 0.2, right = w * 0.94;
      const stops = ["queued", "working", "needs-you", "done"];
      c.font = `500 10px "Inter Variable", system-ui, sans-serif`;
      c.fillStyle = "#5c5e66";
      c.textAlign = "center";
      ["Queued", "Working", "Needs you", "Done"].forEach((s, k) => c.fillText(s, left + ((right - left) * (k + 0.5)) / 4, top - 14));
      f.reps.forEach((r, i) => {
        const y = top + lh * (i + 0.5);
        line(c, [left, y], [right, y], LINE);
        const k = Math.max(0, stops.indexOf(r.status));
        const target = left + ((right - left) * (k + 0.5)) / 4;
        flow(c, (u) => [w * 0.1 + (target - w * 0.1) * u, top + (h * 0.8) / 2 + (y - top - (h * 0.8) / 2) * Math.min(1, u * 3)], r, t, 1.8);
        node(c, [target, y], Math.min(lh * 0.22, sizeOf(w, h) * 0.03), r, t);
        c.font = `500 11px "Inter Variable", system-ui, sans-serif`;
        c.textAlign = "left";
        c.textBaseline = "middle";
        c.fillStyle = LABEL;
        c.fillText(r.name, w * 0.12 + 18, y);
      });
      node(c, [w * 0.1, top + (h * 0.8) / 2], sizeOf(w, h) * 0.045, f.lead, t);
      label(c, w * 0.1, top + (h * 0.8) / 2 + sizeOf(w, h) * 0.045 + 6, f.lead.name, true);
    },
  },
];

export const TEAM_VIEW_BY_ID = Object.fromEntries(TEAM_VIEWS.map((v) => [v.id, v])) as Record<string, View>;
