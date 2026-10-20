import { commit, resetDB } from "@/server/db";

export const dynamic = "force-dynamic";

export function POST() {
  const db = resetDB();
  // Tell connected clients to rehydrate.
  commit([{ type: "settings", patch: {} }], db.settings.currentUserId, { opId: "reset" });
  return Response.json({ ok: true });
}
