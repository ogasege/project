"use client";

import { PageIcon } from "@/components/PageIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Captions, CaptionsOff, ChevronLeft, Hand, Mic, MicOff, PanelLeftClose, PanelLeftOpen, PhoneOff, Send, Volume2, VolumeX, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { identifier } from "@/lib/workspace";
import type { Call, CallTurn, Member } from "@/lib/types";
import { Avatar, clsx } from "@/components/ui";
import { Orb, type OrbState } from "./Orb";
import { ReasoningBoard } from "./Board";
import { echoRatio, Listener, MicMeter, Speaker, voiceSupport, type VoiceSettings } from "./voice";

// Dark tokens, forced for the room regardless of the app theme.
type MicMode = "open" | "ptt" | "off";
interface Hand { agentId: string; preview: string; urgency: number }
interface Live { speakerId: string | null; text: string; tools: string[] }
interface Toast { id: number; text: string; color: string }

type StreamEvent =
  | { type: "speaker"; agentId: string }
  | { type: "text"; delta: string }
  | { type: "tool"; name: string; summary: string }
  | { type: "note"; note: { id: string } }
  | { type: "proposal"; summary: string }
  | { type: "done"; turn: CallTurn }
  | { type: "error"; message: string };

function useClock(since: number, stopped?: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (stopped) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [stopped]);
  const s = Math.max(0, Math.floor(((stopped ?? now) - since) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function CallRoom({ callId }: { callId: string }) {
  const router = useRouter();
  const db = useStore((s) => s.db);
  const call = db.calls[callId] as Call | undefined;
  const me = db.members[db.settings.currentUserId];
  const participants = useMemo(() => (call?.participantIds ?? []).map((id) => db.members[id]).filter(Boolean) as Member[], [call?.participantIds, db.members]);
  const proposals = useMemo(() => Object.values(db.proposals).filter((p) => p.callId === callId).sort((a, b) => a.createdAt - b.createdAt), [db.proposals, callId]);

  const [live, setLive] = useState<Live | null>(null);
  const [phase, setPhase] = useState<"idle" | "thinking" | "speaking">("idle");
  const [hands, setHands] = useState<Hand[]>([]);
  const [interim, setInterim] = useState("");
  const [micMode, setMicMode] = useState<MicMode>("off");
  const [micActive, setMicActive] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [aiStatus, setAiStatus] = useState<{ live: boolean; defaultModel: string } | null>(null);
  const [ending, setEnding] = useState(false);
  const [support, setSupport] = useState({ stt: true, tts: true });
  const [freshNotes, setFreshNotes] = useState<Set<string>>(new Set());

  const abortRef = useRef<AbortController | null>(null);
  const speakerRef = useRef<Speaker | null>(null);
  const listenerRef = useRef<Listener | null>(null);
  const meterRef = useRef<MicMeter | null>(null);
  const levelRef = useRef(0);
  const streamDoneRef = useRef(true);
  const liveRef = useRef<Live | null>(null);
  const phaseRef = useRef(phase);
  const handsRef = useRef<Hand[]>([]);
  const openedRef = useRef(false);
  const turnSeq = useRef(0);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  liveRef.current = live;
  phaseRef.current = phase;
  handsRef.current = hands;

  const ended = call?.status === "ended";
  const clock = useClock(call?.startedAt ?? Date.now(), call?.endedAt);
  const voiceIndex = useCallback((agentId: string) => Math.max(0, participants.findIndex((p) => p.id === agentId)) * 3 + 1, [participants]);
  const voiceFor = useCallback(
    (agentId: string): VoiceSettings => {
      const a = db.members[agentId]?.agent;
      return { pitch: a?.voice.pitch ?? 1, rate: a?.voice.rate ?? 1, index: voiceIndex(agentId) };
    },
    [db.members, voiceIndex],
  );

  const toast = useCallback((text: string, color: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, color }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // ---------- setup ----------
  useEffect(() => {
    setSupport(voiceSupport());
    void fetch("/api/ai/status").then((r) => r.json()).then(setAiStatus).catch(() => {});
    const sp = new Speaker();
    sp.onLevel = (l) => (levelRef.current = l);
    sp.onIdle = () => {
      if (streamDoneRef.current) finishTurn();
    };
    speakerRef.current = sp;
    return () => {
      sp.cancel();
      listenerRef.current?.stop(false);
      meterRef.current?.stop();
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (speakerRef.current) speakerRef.current.enabled = voiceOn && support.tts;
    if (!voiceOn) speakerRef.current?.cancel();
  }, [voiceOn, support.tts]);

  // Simulated speaking envelope when TTS gives no boundary events (or voice is off).
  useEffect(() => {
    if (phase !== "speaking") return;
    const t = setInterval(() => {
      if (!speakerRef.current?.speaking || !voiceOn) levelRef.current = 0.35 + Math.random() * 0.5;
      else levelRef.current = Math.max(levelRef.current * 0.85, 0.3 + Math.random() * 0.4);
    }, 110);
    return () => clearInterval(t);
  }, [phase, voiceOn]);

  // Highlight newly pinned notes.
  const noteCount = call?.notes.length ?? 0;
  const prevNotes = useRef(noteCount);
  useEffect(() => {
    if (!call) return;
    if (noteCount > prevNotes.current) {
      const added = call.notes.slice(prevNotes.current);
      setFreshNotes(new Set(added.map((n) => n.id)));
      for (const n of added) toast(`${db.members[n.authorId]?.name ?? "A savant"} pinned ${/^[aeiou]/.test(n.kind) ? "an" : "a"} ${n.kind}`, db.members[n.authorId]?.color ?? "#888");
    }
    prevNotes.current = noteCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteCount]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [call?.turns.length, live?.text]);

  // ---------- turn lifecycle ----------
  function finishTurn() {
    const l = liveRef.current;
    setPhase("idle");
    setLive(null);
    levelRef.current = 0;
    if (l?.speakerId) void checkHands(l.speakerId);
  }

  async function checkHands(lastSpeakerId: string) {
    try {
      const res = await fetch(`/api/call/${callId}/interject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastSpeakerId }) });
      const j = (await res.json()) as { hands?: Hand[] };
      if (phaseRef.current === "idle") setHands(j.hands ?? []);
    } catch {
      // hands are optional
    }
  }

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    speakerRef.current?.cancel();
    streamDoneRef.current = true;
    setPhase("idle");
    setLive(null);
    levelRef.current = 0;
  }, []);

  const sendTurn = useCallback(
    async (text: string, addressedTo?: string) => {
      if (ended) return;
      if (abortRef.current) interrupt();
      setHands([]);
      setNotice(null);
      const ctrl = new AbortController();
      const seq = ++turnSeq.current;
      abortRef.current = ctrl;
      streamDoneRef.current = false;
      setPhase("thinking");
      setLive({ speakerId: addressedTo ?? null, text: "", tools: [] });
      let speakerId = addressedTo ?? "";
      try {
        const res = await fetch(`/api/call/${callId}/turn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, addressedTo }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `Turn failed (${res.status})`);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line) as StreamEvent;
            if (ev.type === "speaker") {
              speakerId = ev.agentId;
              setLive((l) => (l ? { ...l, speakerId: ev.agentId } : l));
            } else if (ev.type === "text") {
              setPhase("speaking");
              setLive((l) => (l ? { ...l, text: l.text + ev.delta } : l));
              speakerRef.current?.push(ev.delta, voiceFor(speakerId));
            } else if (ev.type === "tool") {
              if (ev.name !== "pin_note") setLive((l) => (l ? { ...l, tools: [...l.tools, ev.summary] } : l));
            } else if (ev.type === "proposal") {
              toast(`${db.members[speakerId]?.name ?? "Agent"} proposed: ${ev.summary}`, db.members[speakerId]?.color ?? "#888");
            } else if (ev.type === "error") {
              setNotice(ev.message);
            }
          }
        }
        streamDoneRef.current = true;
        if (abortRef.current === ctrl) abortRef.current = null;
        const sp = speakerRef.current;
        if (sp && voiceOn && support.tts) {
          sp.flush(voiceFor(speakerId));
          // Safety net: some browsers never fire utterance end events (no voices installed, background tabs).
          const words = (liveRef.current?.text ?? "").split(/\s+/).length;
          const budget = (words / 2.4) * 1000 + 4000;
          setTimeout(() => {
            if (turnSeq.current === seq && phaseRef.current !== "idle") {
              sp.cancel();
              finishTurn();
            }
          }, budget);
        } else {
          // No TTS: let captions linger for a beat, then hand back the floor.
          setTimeout(() => turnSeq.current === seq && finishTurn(), 900);
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        streamDoneRef.current = true;
        abortRef.current = null;
        setPhase("idle");
        setLive(null);
        setNotice(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callId, ended, interrupt, voiceFor, voiceOn, support.tts, toast, db.members],
  );

  // The lead opens the call. (Deferred so React strict-mode's mount/unmount/mount doesn't abort it.)
  const sendRef = useRef(sendTurn);
  sendRef.current = sendTurn;
  const leadId = (participants.find((p) => p.agent?.lead) ?? participants[0])?.id;
  const hasTurns = (call?.turns.length ?? 0) > 0;
  useEffect(() => {
    if (!leadId || ended || openedRef.current || hasTurns) return;
    const t = setTimeout(() => {
      openedRef.current = true;
      void sendRef.current("", leadId);
    }, 350);
    return () => clearTimeout(t);
  }, [leadId, ended, hasTurns]);

  // ---------- voice input ----------
  const handleUtterance = useCallback(
    (text: string) => {
      setInterim("");
      const sp = speakerRef.current;
      // Drop our own TTS bleeding into an open mic.
      if (sp?.speaking && echoRatio(text, (liveRef.current?.text ?? "") + " " + sp.current) > 0.6) return;
      const lower = text.toLowerCase().trim();
      const hs = handsRef.current;
      if (hs.length && /^(ok(ay)?[, ]+)?(yes[, ]+)?(go ahead|go on|sure|please)\b/.test(lower)) {
        void sendTurn("", hs[0].agentId);
        return;
      }
      void sendTurn(text);
    },
    [sendTurn],
  );

  const handleInterim = useCallback(
    (text: string) => {
      const sp = speakerRef.current;
      const agentTalking = phaseRef.current !== "idle";
      if (agentTalking) {
        const words = text.trim().split(/\s+/).length;
        const echo = echoRatio(text, (liveRef.current?.text ?? "") + " " + (sp?.current ?? ""));
        if (words >= 2 && echo < 0.6) {
          interrupt(); // barge-in
          setInterim(text);
        }
        return;
      }
      setInterim(text);
    },
    [interrupt],
  );

  // One recognizer for the life of the room; handlers are read through refs so re-renders don't restart it.
  const interimRef = useRef(handleInterim);
  const utteranceRef = useRef(handleUtterance);
  interimRef.current = handleInterim;
  utteranceRef.current = handleUtterance;
  useEffect(() => {
    listenerRef.current = new Listener({
      onInterim: (t) => interimRef.current(t),
      onUtterance: (t) => utteranceRef.current(t),
      onActive: setMicActive,
      onError: (m) => {
        setNotice(m);
        setMicMode("off");
      },
    });
    return () => listenerRef.current?.stop(false);
  }, []);

  const startMeter = useCallback(async () => {
    if (meterRef.current) return true;
    const m = new MicMeter();
    const ok = await m.start();
    if (ok) meterRef.current = m;
    return ok;
  }, []);

  const setMode = useCallback(
    async (mode: MicMode) => {
      setMicMode(mode);
      if (mode === "off") {
        listenerRef.current?.stop(false);
        meterRef.current?.stop();
        meterRef.current = null;
        setInterim("");
        return;
      }
      if (!support.stt) {
        setNotice("Voice input needs Chrome or Edge. You can still type to the savants.");
        setMicMode("off");
        return;
      }
      await startMeter();
      if (mode === "open") listenerRef.current?.start();
      else listenerRef.current?.stop(false);
    },
    [startMeter, support.stt],
  );

  // Push-to-talk: hold Space.
  useEffect(() => {
    if (micMode !== "ptt") return;
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || isTyping(e)) return;
      e.preventDefault();
      if (phaseRef.current !== "idle") interrupt();
      listenerRef.current?.start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e)) return;
      e.preventDefault();
      setTimeout(() => listenerRef.current?.stop(true), 250);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [micMode, interrupt]);

  // Escape interrupts whoever is talking.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phaseRef.current !== "idle") interrupt();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interrupt]);

  const endCall = async () => {
    setEnding(true);
    interrupt();
    await setMode("off");
    const res = await fetch(`/api/call/${callId}/end`, { method: "POST" });
    const j = (await res.json().catch(() => ({}))) as { summaryPageId?: string };
    setEnding(false);
    if (j.summaryPageId) router.push(`/page/${j.summaryPageId}`);
  };

  const submitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    void sendTurn(t);
  };

  if (!call) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-bg text-muted" data-theme="dark">
        <p>This call doesn&apos;t exist.</p>
        <Link href="/call" className="text-accent hover:underline">Start a new call</Link>
      </div>
    );
  }

  const activeSpeaker = live?.speakerId ? db.members[live.speakerId] : null;
  const tint = interim && phase === "idle" ? me?.color ?? "#19D1FF" : activeSpeaker?.color ?? "#19D1FF";
  const orbSize = participants.length > 3 ? 100 : 124;
  // Room for the loudest ticks (they reach ~0.74 × size from the centre), so names never collide.
  const slot = Math.round(orbSize * 1.5);
  const getAgentLevel = (id: string) => () => (live?.speakerId === id ? levelRef.current : 0);
  const getMyLevel = () => meterRef.current?.level() ?? 0;
  const captionText = interim && phase === "idle" ? interim : live?.text ?? "";
  const captionWho = interim && phase === "idle" ? me?.name.split(" ")[0] ?? "You" : activeSpeaker?.name;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-bg text-fg" data-theme="dark" style={{ "--tint": tint } as React.CSSProperties}>

      {/* Header */}
      <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 px-4">
        <Link href="/call" className="rounded-md p-1.5 text-faint hover:bg-active hover:text-fg" aria-label="Back to calls">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-medium">{call.title}</span>
          <span className="flex items-center gap-2 text-[11px] text-faint">
            {ended ? <span>Ended</span> : <span className="flex items-center gap-1.5 text-success"><span className="h-1.5 w-1.5 animate-[blink_2.4s_ease-in-out_infinite] rounded-[1px] bg-success" /> Live</span>}
            <span className="tabular-nums">{clock}</span>
            {aiStatus && <span className="rounded-full border-[0.5px] border-line-strong px-2 text-faint">{aiStatus.live ? aiStatus.defaultModel : "Simulator"}</span>}
          </span>
        </div>
        <div className="ml-4 hidden min-w-0 flex-1 items-center gap-1.5 overflow-hidden md:flex">
          {call.contextItemIds.map((id) => {
            const it = db.items[id];
            if (!it) return null;
            return (
              <Link key={id} href={it.kind === "issue" ? `/issue/${identifier(db, it)}` : `/page/${id}`} className="truncate rounded border border-line bg-elev px-2.5 py-0.5 text-[11px] text-muted hover:bg-active">
                {it.kind === "issue" ? identifier(db, it) : <PageIcon icon={it.icon} size={12} className="inline text-current" />} {it.title}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setShowTranscript((v) => !v)} className="rounded-md p-2 text-faint hover:bg-active hover:text-fg" aria-label="Toggle transcript" title="Transcript">
            {showTranscript ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Transcript */}
        {showTranscript && (
          <aside className="hidden w-72 shrink-0 flex-col border-r border-line lg:flex" aria-label="Transcript">
            <h2 className="px-4 pt-3 pb-2 text-[12px] font-medium text-faint">Transcript</h2>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 text-[12.5px] leading-relaxed">
              {call.turns.map((t) => {
                const m = db.members[t.speakerId];
                return (
                  <div key={t.id}>
                    <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: m?.color }}>
                      <Avatar member={m} size={14} /> {m?.kind === "human" ? m.name.split(" ")[0] : m?.name}
                    </div>
                    <p className="text-muted">
                      {t.text}
                      {t.interrupted && <span className="text-faint"> — interrupted</span>}
                    </p>
                  </div>
                );
              })}
              {live?.text && activeSpeaker && (
                <div>
                  <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: activeSpeaker.color }}>
                    <Avatar member={activeSpeaker} size={14} /> {activeSpeaker.name}
                  </div>
                  <p className="text-muted">{live.text}<span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-muted align-middle" /></p>
                </div>
              )}
              {!call.turns.length && !live?.text && <p className="text-faint">The conversation will appear here.</p>}
              <div ref={transcriptEnd} />
            </div>
          </aside>
        )}

        {/* Stage */}
        <section className="relative flex min-w-0 flex-1 flex-col items-center justify-center px-6" aria-label="Call stage">
          <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-8">
            {participants.map((p, i) => {
              const isSpeaker = live?.speakerId === p.id;
              const state: OrbState = isSpeaker ? (phase === "speaking" ? "speaking" : "thinking") : "idle";
              const hand = hands.find((h) => h.agentId === p.id);
              return (
                <div key={p.id} className="relative flex flex-col items-center">
                  {hand && (
                    <button
                      onClick={() => void sendTurn("", p.id)}
                      className="absolute -top-10 z-10 flex max-w-[220px] items-center gap-1.5 rounded border border-line bg-panel px-3 py-1 text-[11.5px] text-fg hover:bg-active"
                      
                      title={`Give ${p.name} the floor`}
                    >
                      <Hand size={13} className="shrink-0 text-warning" />
                      <span className="truncate">{hand.preview}</span>
                    </button>
                  )}
                  <button
                    onClick={() => void sendTurn("", p.id)}
                    disabled={ended}
                    aria-label={`Give ${p.name} the floor`}
                    className="flex items-center justify-center rounded-full focus-visible:outline-offset-4"
                    style={{ width: slot, height: slot }}
                  >
                    <Orb look={p.agent?.presence} color={p.color} state={state} getLevel={getAgentLevel(p.id)} size={orbSize} dim={!!live?.speakerId && !isSpeaker} />
                  </button>
                  <div className="text-center">
                    <div className={clsx("text-[13px] font-medium transition-colors", isSpeaker ? "text-fg" : "text-muted")}>{p.name}</div>
                    <div className="text-[11px] text-faint">{isSpeaker ? (phase === "thinking" ? "thinking…" : "speaking") : p.agent?.role}</div>
                  </div>
                </div>
              );
            })}
            {/* You */}
            <div className="relative flex flex-col items-center">
              <div className="flex items-center justify-center" style={{ width: Math.round(slot * 0.75), height: slot }}>
                <Orb color={me?.color ?? "#5e6ad2"} state={micActive ? "listening" : "idle"} getLevel={getMyLevel} size={Math.round(orbSize * 0.62)} dim={micMode === "off"} />
              </div>
              <div className="text-center">
                <div className="text-[13px] font-medium text-muted">{me?.name.split(" ")[0] ?? "You"}</div>
                <div className="text-[11px] text-faint">{micMode === "off" ? "mic off" : micActive ? "listening" : micMode === "ptt" ? "hold space" : "mic on"}</div>
              </div>
            </div>
          </div>

          {/* Captions */}
          <div className="mt-16 flex min-h-[96px] w-full max-w-3xl flex-col items-center px-4 text-center" aria-live="polite">
            {captions && captionText && (
              <>
                <div className="mb-1.5 text-[13px] font-medium" style={{ color: interim && phase === "idle" ? me?.color : activeSpeaker?.color }}>
                  {captionWho}
                </div>
                <p className="text-[22px] font-normal leading-snug tracking-[-0.01em] text-muted [text-wrap:balance]">{captionText.length > 260 ? "…" + captionText.slice(-260) : captionText}</p>
              </>
            )}
            {captions && !captionText && phase === "thinking" && activeSpeaker && <p className="text-[13px] text-faint">{activeSpeaker.name} is thinking…</p>}
            {live && live.tools.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {live.tools.slice(-3).map((t, i) => (
                  <span key={i} className="flex items-center gap-1 rounded bg-elev px-2 py-0.5 text-[11px] text-faint">
                    <Wrench size={10} /> {t}
                  </span>
                ))}
              </div>
            )}
            {notice && <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-line-strong bg-panel px-3 py-1 text-[12px] text-faint">{notice}</p>}
          </div>

          {/* Toasts */}
          <div className="pointer-events-none absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
            {toasts.map((t) => (
              <div key={t.id} className="animate-fade-in rounded border border-line bg-elev px-3 py-1 text-[12px] text-muted">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded align-middle" style={{ background: t.color }} />
                {t.text}
              </div>
            ))}
          </div>
        </section>

        {/* Board */}
        <aside className="hidden w-80 shrink-0 border-l border-line bg-elev md:block" aria-label="Reasoning board">
          <ReasoningBoard notes={call.notes} proposals={proposals} freshIds={freshNotes} />
        </aside>
      </div>

      {/* Controls */}
      <footer className="relative z-10 flex shrink-0 flex-col items-center gap-2 px-4 pt-2 pb-5">
        {ended ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-elev px-4 py-3 text-[13px]">
            This call has ended.
            {call.summaryPageId && <Link href={`/page/${call.summaryPageId}`} className="text-accent hover:underline">Open the call notes →</Link>}
          </div>
        ) : (
          <div className="flex w-full max-w-4xl items-center gap-2 rounded-2xl border border-line bg-elev p-2">
            <div className="flex items-center rounded-xl bg-elev p-0.5" role="group" aria-label="Microphone mode">
              {(["open", "ptt", "off"] as MicMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => void setMode(m)}
                  aria-pressed={micMode === m}
                  className={clsx("flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px]", micMode === m ? "bg-panel text-fg" : "text-faint hover:text-fg")}
                  title={m === "open" ? "Open mic: just talk; interrupt any time" : m === "ptt" ? "Push to talk: hold Space" : "Mic off"}
                >
                  {m === "off" ? <MicOff size={14} /> : <Mic size={14} />}
                  {m === "open" ? "Open mic" : m === "ptt" ? "Hold Space" : "Off"}
                </button>
              ))}
            </div>
            <form onSubmit={submitDraft} className="flex min-w-0 flex-1 items-center gap-1">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={support.stt ? "Type to the savants… (or just talk)" : "Type to the savants…"}
                aria-label="Message the savants"
                className="h-9 min-w-0 flex-1 rounded-lg bg-transparent px-3 text-[13px] text-fg outline-none placeholder:text-faint"
              />
              <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-active hover:text-fg disabled:opacity-30" disabled={!draft.trim()} aria-label="Send">
                <Send size={15} />
              </button>
            </form>
            <div className="hidden items-center gap-1 sm:flex" aria-label="Give the floor">
              {participants.map((p) => (
                <button key={p.id} onClick={() => void sendTurn("", p.id)} className="rounded-lg p-1.5 hover:bg-active" title={`Give ${p.name} the floor`} aria-label={`Give ${p.name} the floor`}>
                  <Avatar member={p} size={22} />
                </button>
              ))}
            </div>
            <button onClick={() => setVoiceOn((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-active hover:text-fg" aria-label={voiceOn ? "Mute agent voices" : "Unmute agent voices"} title={voiceOn ? "Agent voices on" : "Agent voices off"}>
              {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button onClick={() => setCaptions((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-active hover:text-fg" aria-label="Toggle captions" title="Captions">
              {captions ? <Captions size={15} /> : <CaptionsOff size={15} />}
            </button>
            <button onClick={() => void endCall()} disabled={ending} className="flex h-9 items-center gap-1.5 rounded-lg border border-danger px-3 text-[12.5px] font-medium text-danger hover:bg-tint-red  disabled:opacity-60">
              <PhoneOff size={14} /> {ending ? "Writing notes…" : "End"}
            </button>
          </div>
        )}
        {!ended && (
          <p className="text-[11px] text-faint">
            {support.stt ? "Talk over anyone to interrupt · Esc stops the speaker · click an orb or a raised hand to give the floor" : "Voice needs Chrome or Edge — typing works everywhere"}
            {micMode === "open" && " · headphones help"}
          </p>
        )}
      </footer>
    </div>
  );
}
