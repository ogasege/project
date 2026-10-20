"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Bot, Phone, Plus } from "lucide-react";
import { uid } from "@/lib/id";
import { useStore } from "@/lib/store";
import { agents as listAgents } from "@/lib/workspace";
import type { Member } from "@/lib/types";
import { Button, PageHeader } from "@/components/ui";
import { AgentCard } from "@/components/agents/AgentCard";
import { AGENT_COLORS, GLYPHS, MODELS, TOOLS } from "@/components/agents/constants";

export default function AgentsPage() {
  const router = useRouter();
  const db = useStore((s) => s.db);
  const dispatch = useStore((s) => s.dispatch);
  const council = useMemo(() => listAgents(db), [db]);
  const pending = useMemo(() => Object.values(db.proposals).filter((p) => p.status === "pending").length, [db.proposals]);

  const create = async () => {
    const n = council.length;
    const agent: Member = {
      id: uid("a"),
      kind: "agent",
      name: `Agent ${n + 1}`,
      handle: `agent${n + 1}`,
      color: AGENT_COLORS[n % AGENT_COLORS.length],
      avatar: GLYPHS[n % GLYPHS.length],
      createdAt: Date.now(),
      agent: {
        role: "Specialist",
        persona: "You are a new member of the council. Describe your expertise, your priors, and how you like to argue.",
        model: MODELS[0].id,
        voice: { pitch: 1, rate: 1.05 },
        autonomy: "ask",
        tools: TOOLS.filter((t) => !t.write || t.id === "comment" || t.id === "create_issue").map((t) => t.id),
        stats: { proposed: 0, approved: 0, rejected: 0 },
      },
    };
    await dispatch([{ type: "insert", coll: "members", doc: agent as unknown as Member & Record<string, unknown> }]);
    router.push(`/agents/${agent.id}`);
  };

  return (
    <>
      <PageHeader title="Council" icon={<Bot size={14} className="text-muted" />}>
        <Button size="sm" variant="ghost" onClick={() => router.push("/call")}>
          <Phone size={13} /> Call everyone
        </Button>
        <Button size="sm" variant="primary" onClick={() => void create()}>
          <Plus size={13} /> New agent
        </Button>
      </PageHeader>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-xl font-semibold tracking-tight">Your council</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Agents are members of the workspace. Assign them issues, mention them, or get them on a call. Each has its own model, persona and autonomy — and earns more autonomy as its track record grows.
            {pending > 0 && <> You have <Link href="/approvals" className="text-accent hover:underline">{pending} proposal{pending > 1 ? "s" : ""}</Link> waiting.</>}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {council.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
          <div className="mt-10 rounded-xl border border-line bg-panel p-5">
            <h2 className="font-medium">Why a council and not one model?</h2>
            <p className="mt-1 text-muted">
              Disagreement surfaces a wrong assumption before it compounds over a long task. Different roles get different priors, tools and models — chosen by what each is best at — and a human adjudicates. You can follow an argument; you can&apos;t audit a monologue.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
