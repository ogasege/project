import { z } from "zod";
import { catalogApp } from "@/lib/integrations-catalog";
import type { IntegrationConnection, Op } from "@/lib/types";
import { activityOp } from "@/server/actions";
import { commit, getDB } from "@/server/db";
import { redactConnection } from "@/server/redact";

export const dynamic = "force-dynamic";

const httpsUrl = z.url().refine((u) => u.startsWith("https://"), "Must be an https:// URL");

// Per-app credential schemas. Apps not listed connect in simulated mode with no config.
const CONFIG_SCHEMAS: Record<string, z.ZodType<Record<string, string>>> = {
  github: z.object({ token: z.string().trim().min(10, "Paste a GitHub personal access token") }),
  slack: z.object({ webhookUrl: httpsUrl.refine((u) => u.startsWith("https://hooks.slack.com/"), "Must be a https://hooks.slack.com/ incoming webhook URL") }),
  webhook: z.object({ url: httpsUrl }),
};

const Body = z.object({ appId: z.string().min(1), config: z.record(z.string(), z.string()).optional() });

async function verifyGithub(token: string): Promise<{ ok: boolean; note: string }> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 401) return { ok: false, note: "GitHub rejected this token (401)." };
    if (!res.ok) return { ok: true, note: `Saved; GitHub answered ${res.status} to the verification call.` };
    const user = (await res.json()) as { login?: string };
    return { ok: true, note: `Connected as ${user.login ?? "unknown"}.` };
  } catch {
    return { ok: true, note: "Saved, but GitHub could not be reached to verify the token." };
  }
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const app = catalogApp(parsed.data.appId);
  if (!app) return Response.json({ error: "Unknown app" }, { status: 404 });

  let config: Record<string, string> = {};
  const schema = CONFIG_SCHEMAS[app.id];
  if (schema) {
    const c = schema.safeParse(parsed.data.config ?? {});
    if (!c.success) return Response.json({ error: c.error.issues[0]?.message ?? "Invalid configuration" }, { status: 400 });
    config = c.data;
  }

  let lastEvent = app.live ? "Connected" : "Connected in simulated mode";
  if (app.id === "github") {
    const v = await verifyGithub(config.token);
    if (!v.ok) return Response.json({ error: v.note }, { status: 400 });
    lastEvent = v.note;
  }

  const db = getDB();
  const actorId = db.settings.currentUserId;
  const conn: IntegrationConnection = {
    id: app.id,
    appId: app.id,
    status: "connected",
    mode: app.live ? "live" : "simulated",
    config,
    connectedBy: actorId,
    connectedAt: Date.now(),
    lastEvent,
  };
  // Replace any earlier connection for this app (e.g. the seeded MCP entry keyed differently).
  const ops: Op[] = Object.values(db.integrations)
    .filter((c) => c.appId === app.id && c.id !== conn.id)
    .map((c) => ({ type: "delete", coll: "integrations", id: c.id }) as Op);
  ops.push({ type: "insert", coll: "integrations", doc: conn as unknown as IntegrationConnection & Record<string, unknown> });
  ops.push(activityOp(actorId, `connected ${app.name}`));
  commit(ops, actorId);
  return Response.json(redactConnection(conn));
}
