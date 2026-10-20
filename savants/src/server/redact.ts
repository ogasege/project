import type { DB, IntegrationConnection, Op, OpEnvelope } from "@/lib/types";

// Integration configs hold credentials. They stay on the server: the client only ever sees
// which keys are set, never their values.

const MASK = "••••••";

export function redactConnection(c: IntegrationConnection): IntegrationConnection {
  const config: Record<string, string> = {};
  for (const [k, v] of Object.entries(c.config ?? {})) config[k] = v ? MASK : "";
  return { ...c, config };
}

export function redactDB(db: DB): DB {
  const integrations: DB["integrations"] = {};
  for (const [id, c] of Object.entries(db.integrations)) integrations[id] = redactConnection(c);
  return { ...db, integrations };
}

function redactOp(op: Op): Op {
  if (op.type === "insert" && op.coll === "integrations") {
    return { ...op, doc: redactConnection(op.doc as unknown as IntegrationConnection) as unknown as typeof op.doc };
  }
  if (op.type === "update" && op.coll === "integrations" && op.patch.config) {
    const config: Record<string, string> = {};
    for (const [k, v] of Object.entries(op.patch.config as Record<string, string>)) config[k] = v ? MASK : "";
    return { ...op, patch: { ...op.patch, config } };
  }
  return op;
}

export function redactEnvelope(env: OpEnvelope): OpEnvelope {
  return { ...env, ops: env.ops.map(redactOp) };
}
