"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Phone, Play, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { identifier, stateOf } from "@/lib/workspace";
import type { AgentConfig, Autonomy, Member } from "@/lib/types";
import { Avatar, Button, clsx, EmptyState, PageHeader, StatusIcon } from "@/components/ui";
import { TrackRecord } from "@/components/agents/AgentCard";
import { AGENT_COLORS, AUTONOMY, GLYPHS, MODELS, TOOLS } from "@/components/agents/constants";
import { ProposalCard } from "@/components/approvals/ProposalCard";

export default function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const db = useStore((s) => s.db);
  const dispatch = useStore((s) => s.dispatch);
  const agent = db.members[id];
  const [persona, setPersona] = useState(agent?.agent?.persona ?? "");
  const [customModel, setCustomModel] = useState("");

  useEffect(() => {
    setPersona(agent?.agent?.persona ?? "");
    // reset local draft when switching agents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assigned = useMemo(() => Object.values(db.items).filter((i) => i.kind === "issue" && i.assigneeId === id && !i.archived), [db.items, id]);
  const proposals = useMemo(() => Object.values(db.proposals).filter((p) => p.agentId === id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [db.proposals, id]);

  if (!agent || agent.kind !== "agent" || !agent.agent) return <EmptyState title="Agent not found" action={<Link className="text-accent" href="/agents">Back to the council</Link>} />;
  const cfg = agent.agent;

  const patchMember = (patch: Partial<Member>) => void dispatch([{ type: "update", coll: "members", id, patch: patch as Record<string, unknown> }]);
  const patchAgent = (patch: Partial<AgentConfig>) => patchMember({ agent: { ...cfg, ...patch } });

  const previewVoice = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`Hi, I'm ${agent.name}, the council's ${cfg.role.toLowerCase()}. Let's think this through together.`);
    u.pitch = cfg.voice.pitch;
    u.rate = cfg.voice.rate;
    window.speechSynthesis.speak(u);
  };

  const remove = async () => {
    if (!confirm(`Remove ${agent.name} from the council?`)) return;
    await dispatch([{ type: "delete", coll: "members", id }]);
    router.push("/agents");
  };

  const isCustomModel = !MODELS.some((m) => m.id === cfg.model);
  const field = "h-8 w-full rounded-md border border-line bg-panel px-2 outline-none focus:border-accent";

  return (
    <>
      <PageHeader title={agent.name} icon={<Link href="/agents" aria-label="Back to council" className="text-muted hover:text-fg"><ChevronLeft size={15} /></Link>}>
        <Button size="sm" variant="primary" onClick={() => router.push(`/call?agents=${id}`)}>
          <Phone size={13} /> Call {agent.name}
        </Button>
      </PageHeader>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-7">
            <div className="flex items-center gap-4">
              <Avatar member={agent} size={56} />
              <div className="flex-1 space-y-2">
                <input aria-label="Name" value={agent.name} onChange={(e) => patchMember({ name: e.target.value, handle: e.target.value.toLowerCase().replace(/\s+/g, "") })} className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none" />
                <input aria-label="Role" value={cfg.role} onChange={(e) => patchAgent({ role: e.target.value })} className="w-full bg-transparent text-muted outline-none" placeholder="Role" />
              </div>
            </div>

            <section className="space-y-2">
              <h2 className="text-[13px] font-medium">Look</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {AGENT_COLORS.map((c) => (
                  <button key={c} aria-label={`Color ${c}`} onClick={() => patchMember({ color: c })} className={clsx("h-6 w-6 rounded-full border-2", agent.color === c ? "border-fg" : "border-transparent")} style={{ background: c }} />
                ))}
                <span className="mx-2 h-5 w-px bg-line" />
                {GLYPHS.map((g) => (
                  <button key={g} aria-label={`Glyph ${g}`} onClick={() => patchMember({ avatar: g })} className={clsx("flex h-7 w-7 items-center justify-center rounded-md border", agent.avatar === g ? "border-accent bg-accent-soft" : "border-line hover:bg-hover")}>
                    {g}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-[13px] font-medium">Persona</h2>
              <p className="text-xs text-faint">The system prompt that shapes how {agent.name} thinks, argues and decides.</p>
              <textarea
                aria-label="Persona"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                onBlur={() => persona !== cfg.persona && patchAgent({ persona })}
                rows={6}
                className="w-full rounded-lg border border-line bg-panel p-3 leading-relaxed outline-none focus:border-accent"
              />
            </section>

            <section className="space-y-2">
              <h2 className="text-[13px] font-medium">Model</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {MODELS.map((m) => (
                  <button key={m.id} onClick={() => patchAgent({ model: m.id })} aria-pressed={cfg.model === m.id} className={clsx("rounded-lg border p-3 text-left", cfg.model === m.id ? "border-accent bg-accent-soft" : "border-line bg-panel hover:bg-hover")}>
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-faint">{m.hint}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input aria-label="Custom model id" className={field} placeholder={isCustomModel ? cfg.model : "Custom model id"} value={customModel} onChange={(e) => setCustomModel(e.target.value)} />
                <Button disabled={!customModel.trim()} onClick={() => { patchAgent({ model: customModel.trim() }); setCustomModel(""); }}>Use</Button>
              </div>
              <p className="text-xs text-faint">Your model policy: pick per agent. Bring-your-own-model providers plug into the same interface.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-[13px] font-medium">Autonomy</h2>
              <div className="space-y-1.5">
                {AUTONOMY.map((a) => (
                  <label key={a.value} className={clsx("flex cursor-pointer gap-3 rounded-lg border p-3", cfg.autonomy === a.value ? "border-accent bg-accent-soft" : "border-line bg-panel hover:bg-hover")}>
                    <input type="radio" name="autonomy" checked={cfg.autonomy === a.value} onChange={() => patchAgent({ autonomy: a.value as Autonomy })} className="mt-0.5 accent-[var(--accent)]" />
                    <span>
                      <span className="font-medium">{a.label}</span>
                      <span className="block text-xs text-muted">{a.body}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-[13px] font-medium">Tools</h2>
              <div className="grid gap-1 sm:grid-cols-2">
                {TOOLS.map((t) => {
                  const on = cfg.tools.includes(t.id);
                  return (
                    <label key={t.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover">
                      <input type="checkbox" checked={on} onChange={() => patchAgent({ tools: on ? cfg.tools.filter((x) => x !== t.id) : [...cfg.tools, t.id] })} className="accent-[var(--accent)]" />
                      <span className="flex-1">{t.label}</span>
                      {t.write && <span className="text-[10px] text-faint">write · gated</span>}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-[13px] font-medium">Voice</h2>
              <div className="grid max-w-md grid-cols-2 gap-4">
                <label className="text-xs text-muted">
                  Pitch {cfg.voice.pitch.toFixed(2)}
                  <input type="range" min={0.5} max={1.6} step={0.05} value={cfg.voice.pitch} onChange={(e) => patchAgent({ voice: { ...cfg.voice, pitch: Number(e.target.value) } })} className="w-full accent-[var(--accent)]" />
                </label>
                <label className="text-xs text-muted">
                  Rate {cfg.voice.rate.toFixed(2)}
                  <input type="range" min={0.7} max={1.5} step={0.05} value={cfg.voice.rate} onChange={(e) => patchAgent({ voice: { ...cfg.voice, rate: Number(e.target.value) } })} className="w-full accent-[var(--accent)]" />
                </label>
              </div>
              <Button size="sm" onClick={previewVoice}><Play size={12} /> Preview voice</Button>
            </section>

            <section className="pt-4">
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => void remove()}><Trash2 size={12} /> Remove from council</Button>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-line bg-panel p-4">
              <h2 className="mb-2 text-[13px] font-medium">Track record</h2>
              <TrackRecord agent={agent} />
              <p className="mt-2 text-xs text-faint">Autonomy is earned: approvals build trust, rejections are kept as lessons.</p>
            </div>
            <div>
              <h2 className="mb-2 text-[13px] font-medium">Assigned issues</h2>
              {!assigned.length && <p className="text-xs text-faint">Nothing assigned. Assign {agent.name} an issue like you would a teammate.</p>}
              <ul className="space-y-0.5">
                {assigned.map((i) => (
                  <li key={i.id}>
                    <Link href={`/issue/${identifier(db, i)}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover">
                      <StatusIcon state={stateOf(db, i)} />
                      <span className="w-12 shrink-0 text-xs text-faint">{identifier(db, i)}</span>
                      <span className="truncate">{i.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-2 text-[13px] font-medium">Recent proposals</h2>
              {!proposals.length && <p className="text-xs text-faint">No proposals yet.</p>}
              <div className="space-y-2">
                {proposals.map((p) => <ProposalCard key={p.id} proposal={p} compact />)}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
