// How a savant looks while it listens, thinks and speaks. Each look is a small canvas drawing
// driven by the same four states and a smoothed voice level, ported from the presence studies
// (signal meter, Siri-style wave, ChatGPT/LiveKit aura and bars, Paper Shaders metaballs,
// dot orbit, dithering and halftone, point sphere, oscilloscope, smoke ring, ASCII, LED matrix,
// spectral rings, breathing ring). Plain 2D canvas, no libraries.

export type PresenceState = "idle" | "listening" | "thinking" | "speaking";

export type PresenceLook =
  | "signal"
  | "breath"
  | "wave"
  | "aura"
  | "bars"
  | "metaballs"
  | "orbit"
  | "sphere"
  | "halftone"
  | "dither"
  | "scope"
  | "smoke"
  | "rings"
  | "matrix"
  | "ascii";

export interface DrawInput {
  state: PresenceState;
  lv: number; // smoothed voice level, 0..1
  color: string;
  seed: number;
}

export interface Scratch {
  img?: ImageData;
  tmp?: HTMLCanvasElement;
  points?: [number, number, number][];
  hist?: number[];
}

interface Look {
  id: PresenceLook;
  name: string;
  from: string;
  blurb: string;
  draw(c: CanvasRenderingContext2D, w: number, h: number, t: number, s: DrawInput, st: Scratch): void;
}

const TAU = Math.PI * 2;
const QUIET = "#2a2d33";
const PANEL = "#121317";
const ACCENT = "#8b93ff";

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
// Cheap smooth noise from layered sines: organic motion without a noise library.
function n2(x: number, y: number): number {
  return (Math.sin(x * 1.7 + y * 2.3) + Math.sin(x * 3.1 - y * 1.3 + 1.7) * 0.5 + Math.sin(x * 0.7 + y * 4.1 + 4.2) * 0.25) / 1.75;
}

/** A believable voice level when no audio is available: syllables riding on phrase swells. */
export function simulatedLevel(state: PresenceState, t: number, seed = 0): number {
  if (state === "speaking") {
    const syll = Math.max(0, Math.sin(t * 9.5 + seed) * 0.5 + 0.5) ** 2;
    const phrase = Math.max(0, Math.sin(t * 1.3 + seed * 2) * 0.5 + 0.55);
    return Math.min(1, 0.15 + syll * phrase * 0.95 + (Math.sin(t * 23 + seed) * 0.5 + 0.5) * 0.08);
  }
  if (state === "listening") return 0.12 + (Math.sin(t * 6 + seed) * 0.5 + 0.5) * 0.18;
  return 0;
}

const voiced = (s: DrawInput) => s.state === "speaking" || s.state === "listening";

export const LOOKS: Look[] = [
  {
    id: "signal",
    name: "Signal meter",
    from: "Our call room",
    blurb: "Thin ticks that grow with the voice; an accent arc circles while it thinks.",
    draw(c, w, h, t, s) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.24, N = 96;
      c.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU - Math.PI / 2;
        const wv = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.7 + s.seed) * Math.sin(t * 3 + i * 0.4);
        const L = 4 + s.lv * R * 0.85 * (0.35 + wv * 0.65);
        c.strokeStyle = s.lv > 0.04 ? s.color : QUIET;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        c.lineTo(cx + Math.cos(a) * (R + L), cy + Math.sin(a) * (R + L));
        c.stroke();
      }
      c.fillStyle = PANEL;
      c.strokeStyle = s.color;
      c.beginPath();
      c.arc(cx, cy, R - 6, 0, TAU);
      c.fill();
      c.stroke();
      if (s.state === "thinking") {
        const a0 = ((t % 1.5) / 1.5) * TAU - Math.PI / 2;
        c.strokeStyle = ACCENT;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(cx, cy, R + 12, a0, a0 + 1.4);
        c.stroke();
      }
    },
  },
  {
    id: "breath",
    name: "Breathing ring",
    from: "Calm voice modes",
    blurb: "One ring that breathes. The quietest option; never pulls focus.",
    draw(c, w, h, t, s) {
      const cx = w / 2, cy = h / 2, m = Math.min(w, h);
      const R = m * (0.26 + (s.state === "idle" ? Math.sin(t * 1.2 + s.seed) * 0.01 : s.lv * 0.05));
      c.strokeStyle = s.color;
      c.lineWidth = (2 + s.lv * 14) * (m / 220);
      c.lineCap = "round";
      c.beginPath();
      if (s.state === "thinking") {
        const a0 = t * 3;
        c.arc(cx, cy, R, a0 + 0.5, a0 + TAU - 0.5);
      } else c.arc(cx, cy, R, 0, TAU);
      c.stroke();
      c.lineCap = "butt";
    },
  },
  {
    id: "wave",
    name: "Layered wave",
    from: "Siri",
    blurb: "Soft sine curves that swell with the voice. Instantly reads as speech.",
    draw(c, w, h, t, s) {
      const cy = h / 2;
      const amp = s.state === "thinking" ? 0.18 : s.lv;
      const cols = [s.color, ACCENT, "#4cc9f0"];
      c.globalCompositeOperation = "lighter";
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.lineWidth = 2 - k * 0.4;
        c.strokeStyle = rgba(cols[k], 0.85 - k * 0.2);
        for (let x = 0; x <= w; x += 2) {
          const u = (x / w) * 2 - 1, att = (1 - u * u) ** 2;
          const y = cy + Math.sin(u * (6 + k * 2) + t * (3 + k) + k + s.seed) * att * h * 0.32 * (amp + 0.02);
          if (x) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.stroke();
      }
      c.globalCompositeOperation = "source-over";
    },
  },
  {
    id: "aura",
    name: "Aura",
    from: "ChatGPT voice, LiveKit",
    blurb: "A warm, blurred glow that swells as it talks. Familiar to anyone who uses voice AI.",
    draw(c, w, h, t, s) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * (0.24 + s.lv * 0.06 + Math.sin(t * 1.3) * 0.006);
      c.save();
      c.filter = `blur(${Math.max(4, Math.min(w, h) * 0.045)}px)`;
      for (let k = 0; k < 3; k++) {
        const ox = Math.cos(t * (0.6 + k * 0.3) + k * 2 + s.seed) * R * 0.25, oy = Math.sin(t * (0.7 + k * 0.2) + k) * R * 0.25;
        const g = c.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, R * (1.1 - k * 0.15));
        g.addColorStop(0, rgba(k === 1 ? ACCENT : s.color, 0.85));
        g.addColorStop(1, rgba(s.color, 0));
        c.fillStyle = g;
        c.beginPath();
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * TAU, rr = R * (1 + n2(Math.cos(a) + t * 0.6, Math.sin(a) + k) * (0.08 + s.lv * 0.18));
          if (i) c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          else c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        c.fill();
      }
      c.restore();
      if (s.state === "thinking") {
        c.strokeStyle = "rgba(255,255,255,.55)";
        c.lineWidth = 1.5;
        const a0 = t * 3;
        c.beginPath();
        c.arc(cx, cy, R * 1.15, a0, a0 + 1.2);
        c.stroke();
      }
    },
  },
  {
    id: "bars",
    name: "Agent bars",
    from: "LiveKit",
    blurb: "Five rounded bars. Compact and clear at any size.",
    draw(c, w, h, t, s) {
      const n = 5, bw = Math.min(w, h) * 0.08, gap = bw * 0.7, total = n * bw + (n - 1) * gap, x0 = (w - total) / 2, cy = h / 2;
      const hot = Math.floor(t * 5) % n;
      for (let i = 0; i < n; i++) {
        let v = voiced(s) ? s.lv * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (7 + i * 1.3) + i * 2 + s.seed))) : 0;
        let col = rgba(s.color, s.state === "idle" ? 0.35 : 0.95);
        if (s.state === "thinking") {
          v = 0;
          col = rgba(s.color, i === hot ? 0.95 : 0.25);
        }
        const bh = bw + v * h * 0.45, x = x0 + i * (bw + gap);
        c.fillStyle = col;
        c.beginPath();
        c.roundRect(x, cy - bh / 2, bw, bh, bw / 2);
        c.fill();
      }
    },
  },
  {
    id: "metaballs",
    name: "Metaballs",
    from: "Paper Shaders",
    blurb: "Drops that split when it talks and merge back. A team metaphor.",
    draw(c, w, h, t, s, st) {
      const gw = 72, gh = 72;
      st.img ??= c.createImageData(gw, gh);
      const k = s.state === "idle" ? 1 : 4;
      const balls: [number, number, number][] = [];
      for (let i = 0; i < k; i++) {
        const sp = s.state === "thinking" ? 1.4 : 0.7 + s.lv;
        const r = 0.28 + s.lv * 0.35;
        balls.push([0.5 + Math.cos(t * sp + i * 1.9 + s.seed) * r * 0.5, 0.5 + Math.sin(t * sp * 1.2 + i * 2.6) * r * 0.5, k === 1 ? 0.045 : 0.012 + (i ? 0.006 : 0.012) + s.lv * 0.006]);
      }
      const [r0, g0, b0] = rgb(s.color), d = st.img.data;
      for (let y = 0; y < gh; y++)
        for (let x = 0; x < gw; x++) {
          const u = x / gw, v = y / gh;
          let f = 0;
          for (const [bx, by, bs] of balls) f += bs / ((u - bx) ** 2 + (v - by) ** 2 + 1e-4);
          const o = (y * gw + x) * 4, a = f > 1 ? 1 : f > 0.75 ? (f - 0.75) * 4 * 0.6 : 0;
          d[o] = r0;
          d[o + 1] = g0;
          d[o + 2] = b0;
          d[o + 3] = a * 255;
        }
      if (!st.tmp) {
        st.tmp = document.createElement("canvas");
        st.tmp.width = gw;
        st.tmp.height = gh;
      }
      st.tmp.getContext("2d")?.putImageData(st.img, 0, 0);
      c.imageSmoothingEnabled = true;
      c.drawImage(st.tmp, 0, 0, w, h);
    },
  },
  {
    id: "orbit",
    name: "Dot orbit",
    from: "Paper Shaders",
    blurb: "Particles on orbits that gather while it thinks. Reads as attention.",
    draw(c, w, h, t, s) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3, k = Math.min(w, h) / 220;
      const conv = s.state === "thinking" ? 0.55 + 0.25 * Math.sin(t * 3) : 1;
      for (let ring = 1; ring <= 4; ring++)
        for (let i = 0; i < ring * 9; i++) {
          const a = (i / (ring * 9)) * TAU + t * (0.3 + ring * 0.15) * (ring % 2 ? 1 : -1) * (1 + s.lv * 2) + s.seed;
          const r = ((R * ring) / 4) * conv * (1 + s.lv * 0.25 * Math.sin(t * 8 + i));
          c.fillStyle = rgba(s.color, 0.35 + ring * 0.15);
          c.beginPath();
          c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, (1.2 + (4 - ring) * 0.35 + s.lv * 1.2) * Math.max(0.6, k), 0, TAU);
          c.fill();
        }
    },
  },
  {
    id: "sphere",
    name: "Point sphere",
    from: "Neural point clouds",
    blurb: "A slowly turning cloud of points that ripples as it speaks. Feels like a mind at work.",
    draw(c, w, h, t, s, st) {
      if (!st.points) {
        st.points = [];
        const N = 360;
        for (let i = 0; i < N; i++) {
          const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996;
          st.points.push([Math.cos(a) * r, y, Math.sin(a) * r]);
        }
      }
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3, ry = t * 0.4 + s.seed, rx = 0.4;
      const sy = Math.sin(ry), cyr = Math.cos(ry), sx = Math.sin(rx), cxr = Math.cos(rx);
      const dot = Math.max(1, Math.min(w, h) / 140);
      for (const [x0, y0, z0] of st.points) {
        const disp = 1 + (s.state === "thinking" ? -0.12 * (0.5 + 0.5 * Math.sin(t * 3)) : s.lv * 0.22 * n2(x0 * 3 + t * 2, y0 * 3 + z0));
        let x = x0 * disp, y = y0 * disp, z = z0 * disp;
        [x, z] = [x * cyr - z * sy, x * sy + z * cyr];
        [y, z] = [y * cxr - z * sx, y * sx + z * cxr];
        const p = 1.6 / (2.6 - z);
        c.fillStyle = rgba(s.color, 0.25 + (z + 1) * 0.35);
        c.fillRect(cx + x * R * p, cy + y * R * p, dot * p, dot * p);
      }
    },
  },
  {
    id: "halftone",
    name: "Halftone pulse",
    from: "Paper Shaders",
    blurb: "A dot grid that ripples outward with each word. Speech as visible rhythm.",
    draw(c, w, h, t, s) {
      const step = Math.max(6, Math.min(w, h) / 20), cx = w / 2, cy = h / 2;
      c.fillStyle = s.color;
      for (let y = step / 2; y < h; y += step)
        for (let x = step / 2; x < w; x += step) {
          const d = Math.hypot(x - cx, y - cy) / Math.min(w, h), a = Math.atan2(y - cy, x - cx);
          let v = s.state === "thinking" ? 0.5 + 0.5 * Math.sin(d * 18 - t * 4 + a * 2) : 0.5 + 0.5 * Math.sin(d * 22 - t * 6);
          v *= Math.max(0, 1 - d * 1.7) * (s.state === "idle" ? 0.25 : 0.35 + s.lv * 0.9);
          if (v > 0.03) {
            c.beginPath();
            c.arc(x, y, v * step * 0.55, 0, TAU);
            c.fill();
          }
        }
    },
  },
  {
    id: "dither",
    name: "Dithered sphere",
    from: "Paper Shaders, 1-bit design",
    blurb: "A lit sphere in 1-bit dots. Technical and a little retro.",
    draw(c, w, h, t, s) {
      const px = Math.max(3, Math.round(Math.min(w, h) / 55)), cols = Math.floor(w / px), rows = Math.floor(h / px), cx = cols / 2, cy = rows / 2;
      const R = Math.min(cols, rows) * (0.3 + s.lv * 0.05);
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const la = s.state === "thinking" ? t * 2.5 : t * 0.5 + s.seed;
      const L = [Math.cos(la) * 0.6, -0.5, 0.65];
      c.fillStyle = s.color;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const dx = (x - cx) / R, dy = (y - cy) / R, rr = dx * dx + dy * dy;
          if (rr > 1) continue;
          const dz = Math.sqrt(1 - rr), lum = Math.max(0, dx * L[0] + dy * L[1] + dz * L[2]) * (0.75 + s.lv * 0.6) + 0.06;
          if (lum * 16 > B[(y & 3) * 4 + (x & 3)]) c.fillRect(x * px, y * px, px - 1, px - 1);
        }
    },
  },
  {
    id: "scope",
    name: "Oscilloscope",
    from: "Analogue scopes",
    blurb: "A glowing Lissajous trace. Every savant draws a different figure.",
    draw(c, w, h, t, s) {
      const cx = w / 2, cy = h / 2, A = Math.min(w, h) * (0.12 + (s.state === "thinking" ? 0.12 : s.lv * 0.22) + 0.04);
      const b = [2, 4, 5, 3.0001][s.seed % 4], ph = t * (s.state === "thinking" ? 0.6 : 1.4);
      c.strokeStyle = rgba(s.color, 0.9);
      c.lineWidth = 1.4;
      c.shadowColor = s.color;
      c.shadowBlur = 8;
      c.beginPath();
      for (let i = 0; i <= 600; i++) {
        const u = (i / 600) * TAU;
        const x = cx + Math.sin(3 * u + ph) * A * 1.3, y = cy + Math.sin(b * u) * A;
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
      c.shadowBlur = 0;
    },
  },
  {
    id: "smoke",
    name: "Smoke ring",
    from: "Paper Shaders",
    blurb: "Soft, turbulent wisps around a ring. Atmospheric and premium.",
    draw(c, w, h, t, s) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.26;
      c.lineWidth = 1;
      for (let k = 0; k < 22; k++) {
        c.strokeStyle = rgba(k % 3 ? s.color : ACCENT, 0.12);
        c.beginPath();
        for (let i = 0; i <= 90; i++) {
          const a = (i / 90) * TAU + (s.state === "thinking" ? t * 0.8 : 0);
          const rr = R * (1 + n2(Math.cos(a) * 1.5 + k * 0.2 + s.seed, Math.sin(a) * 1.5 + t * 0.8) * (0.06 + s.lv * 0.25));
          if (i) c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          else c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        c.stroke();
      }
    },
  },
  {
    id: "rings",
    name: "Spectral rings",
    from: "Radial spectrograms",
    blurb: "The last few seconds of voice as rings, newest inside. Shows who talked and how much.",
    draw(c, w, h, t, s, st) {
      st.hist ??= [];
      st.hist.unshift(s.state === "thinking" ? 0.2 : s.lv);
      if (st.hist.length > 22) st.hist.pop();
      const cx = w / 2, cy = h / 2, k = Math.min(w, h) / 220;
      st.hist.forEach((v, i) => {
        const r = (14 + i * 4.2) * k;
        c.strokeStyle = rgba(s.color, Math.max(0.06, 0.9 - i * 0.04));
        c.lineWidth = (1 + v * 3) * Math.max(0.7, k);
        const a0 = s.state === "thinking" ? t * 2 + i * 0.3 : -Math.PI / 2;
        c.beginPath();
        c.arc(cx, cy, r, a0, a0 + TAU * Math.max(0.04, v));
        c.stroke();
      });
    },
  },
  {
    id: "matrix",
    name: "Dot matrix",
    from: "LED displays",
    blurb: "A tiny LED panel showing the waveform. Feels like a device, not a mascot.",
    draw(c, w, h, t, s) {
      const cols = 12, rows = 12, m = Math.min(w, h) * 0.7, cw = m / cols, ox = (w - m) / 2, oy = (h - m) / 2, r = cw * 0.28;
      const snake = Math.floor(t * 12) % (cols * 2);
      for (let x = 0; x < cols; x++) {
        const v = voiced(s) ? s.lv * (0.5 + 0.5 * Math.sin(t * 10 - x * 0.9 + s.seed)) * rows * 0.5 : 0;
        for (let y = 0; y < rows; y++) {
          let on = Math.abs(y - (rows - 1) / 2) <= v || (s.state === "idle" && y === rows / 2);
          if (s.state === "thinking") on = (y === 5 || y === 6) && Math.abs(x - (snake < cols ? snake : cols * 2 - snake)) < 3;
          c.fillStyle = on ? s.color : "#1c1d21";
          c.beginPath();
          c.arc(ox + x * cw + cw / 2, oy + y * cw + cw / 2, r, 0, TAU);
          c.fill();
        }
      }
    },
  },
  {
    id: "ascii",
    name: "ASCII",
    from: "Text-mode art",
    blurb: "A sphere drawn in characters that churn as it speaks. For the terminal crowd.",
    draw(c, w, h, t, s) {
      const chars = " .:-=+*#%@", fs = Math.max(6, Math.min(w, h) / 24), cols = Math.floor(w / (fs * 0.62)), rows = Math.floor(h / fs);
      const cx = cols / 2, cy = rows / 2, R = Math.min(cols * 0.62, rows) * 0.42;
      c.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
      c.fillStyle = s.color;
      c.textBaseline = "top";
      for (let y = 0; y < rows; y++) {
        let line = "";
        for (let x = 0; x < cols; x++) {
          const dx = ((x - cx) * 0.62) / R, dy = (y - cy) / R, rr = dx * dx + dy * dy;
          if (rr > 1) {
            line += " ";
            continue;
          }
          let v = Math.sqrt(1 - rr) * (0.55 + 0.45 * Math.sin(dx * 3 + t * (1 + s.lv * 6) + s.seed)) * (0.7 + s.lv * 0.6);
          if (s.state === "thinking" && Math.abs(dy - Math.sin(t * 2)) < 0.12) v = 1;
          line += chars[Math.max(0, Math.min(chars.length - 1, Math.floor(v * chars.length)))];
        }
        c.fillText(line, 0, y * fs);
      }
    },
  },
];

export const LOOK_BY_ID = Object.fromEntries(LOOKS.map((l) => [l.id, l])) as Record<PresenceLook, Look>;

export function isLook(v: unknown): v is PresenceLook {
  return typeof v === "string" && v in LOOK_BY_ID;
}

export function seedOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 1000;
}
