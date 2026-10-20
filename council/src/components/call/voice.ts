"use client";

// Browser voice layer for the call: speech-to-text (Web Speech API), text-to-speech (speechSynthesis)
// and a mic level meter (Web Audio). Isolated here so a realtime STT/TTS provider can replace it.

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecognition = any;

export function recognitionCtor(): (new () => AnyRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceSupport() {
  return {
    stt: !!recognitionCtor(),
    tts: typeof window !== "undefined" && "speechSynthesis" in window,
  };
}

// ---------- Speech to text ----------

export interface ListenerHandlers {
  onInterim: (text: string) => void;
  onUtterance: (text: string) => void;
  onActive?: (active: boolean) => void;
  onError?: (message: string) => void;
}

export class Listener {
  private rec: AnyRecognition | null = null;
  private want = false;
  private finalBuf = "";
  private interim = "";
  private consumed = 0;
  private silence: ReturnType<typeof setTimeout> | null = null;
  silenceMs = 900;

  constructor(private h: ListenerHandlers) {}

  get active() {
    return this.want;
  }

  start() {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      this.h.onError?.("Voice input needs Chrome or Edge. You can still type to the council.");
      return;
    }
    this.want = true;
    if (this.rec) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = Math.max(ev.resultIndex, this.consumed); i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          this.finalBuf += r[0].transcript + " ";
          this.consumed = i + 1;
        } else interim += r[0].transcript;
      }
      this.interim = interim;
      const text = (this.finalBuf + interim).trim();
      if (text) this.h.onInterim(text);
      this.armSilence(ev.results.length);
    };
    rec.onerror = (ev: any) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        this.want = false;
        this.h.onError?.("Microphone access was blocked. Allow it in the address bar, or type instead.");
      } else if (ev.error !== "no-speech" && ev.error !== "aborted") {
        this.h.onError?.(`Speech recognition error: ${ev.error}`);
      }
    };
    rec.onstart = () => this.h.onActive?.(true);
    rec.onend = () => {
      this.rec = null;
      this.consumed = 0;
      this.h.onActive?.(false);
      if (this.want) setTimeout(() => this.want && this.start(), 150);
    };
    this.rec = rec;
    try {
      rec.start();
    } catch {
      // already started
    }
  }

  private armSilence(resultCount: number) {
    if (this.silence) clearTimeout(this.silence);
    this.silence = setTimeout(() => {
      // Interim text that was finalized early must not be re-emitted when it turns final.
      this.consumed = Math.max(this.consumed, resultCount);
      this.flush();
    }, this.silenceMs);
  }

  /** Emit whatever has been heard as one utterance. */
  flush() {
    if (this.silence) clearTimeout(this.silence);
    this.silence = null;
    const text = (this.finalBuf + this.interim).trim();
    this.finalBuf = "";
    this.interim = "";
    if (text) this.h.onUtterance(text);
  }

  stop(flush = true) {
    this.want = false;
    if (flush) this.flush();
    try {
      this.rec?.stop();
    } catch {
      // not running
    }
  }
}

// ---------- Text to speech ----------

export interface VoiceSettings {
  pitch: number;
  rate: number;
  index: number; // stable per-agent index used to pick a distinct installed voice
}

export class Speaker {
  private buffer = "";
  private queued = 0;
  private voices: SpeechSynthesisVoice[] = [];
  enabled = true;
  onLevel: (level: number) => void = () => {};
  onIdle: () => void = () => {};
  onStart: () => void = () => {};
  current = ""; // sentence being spoken (for echo filtering)

  constructor() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.enabled = false;
      return;
    }
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const lang = (navigator.language || "en").slice(0, 2);
      const local = all.filter((v) => v.lang.startsWith(lang));
      this.voices = local.length ? local : all;
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
  }

  get speaking() {
    return this.queued > 0;
  }

  /** Feed streamed text; complete sentences are spoken immediately. */
  push(delta: string, v: VoiceSettings) {
    this.buffer += delta;
    const re = /[^.!?]*[.!?]+["')\]]?(\s+|$)/g;
    let m: RegExpExecArray | null;
    let last = 0;
    while ((m = re.exec(this.buffer)) && m[0].length) {
      if (m.index + m[0].length === this.buffer.length && !/\s$/.test(m[0])) break; // may still be growing ("3.5")
      this.say(m[0].trim(), v);
      last = m.index + m[0].length;
    }
    this.buffer = this.buffer.slice(last);
  }

  flush(v: VoiceSettings) {
    const rest = this.buffer.trim();
    this.buffer = "";
    if (rest) this.say(rest, v);
    else if (!this.queued) this.onIdle();
  }

  private say(text: string, v: VoiceSettings) {
    if (!text) return;
    if (!this.enabled) return;
    const u = new SpeechSynthesisUtterance(text);
    if (this.voices.length) u.voice = this.voices[v.index % this.voices.length];
    u.pitch = Math.max(0.1, Math.min(2, v.pitch));
    u.rate = Math.max(0.5, Math.min(2, v.rate));
    this.queued++;
    u.onstart = () => {
      this.current = text;
      this.onStart();
      this.onLevel(0.9);
    };
    u.onboundary = () => this.onLevel(0.6 + Math.random() * 0.4);
    const done = () => {
      this.queued = Math.max(0, this.queued - 1);
      if (!this.queued) {
        this.current = "";
        this.onLevel(0);
        this.onIdle();
      }
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  }

  cancel() {
    this.buffer = "";
    this.queued = 0;
    this.current = "";
    if (this.enabled) window.speechSynthesis.cancel();
    this.onLevel(0);
  }
}

// ---------- Mic level ----------

export class MicMeter {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;

  async start(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      this.ctx = new AudioContext();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      src.connect(this.analyser);
      this.data = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
      return true;
    } catch {
      return false;
    }
  }

  level(): number {
    if (!this.analyser || !this.data) return 0;
    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) {
      const v = (this.data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / this.data.length) * 4);
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
  }
}

/** Fraction of `heard` words that also appear in `spoken` — high means we're hearing our own TTS. */
export function echoRatio(heard: string, spoken: string): number {
  const words = heard.toLowerCase().match(/[a-z']+/g) ?? [];
  if (!words.length) return 1;
  const pool = new Set(spoken.toLowerCase().match(/[a-z']+/g) ?? []);
  return words.filter((w) => pool.has(w)).length / words.length;
}
