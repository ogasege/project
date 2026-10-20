import { getDB } from "@/server/db";
import { redactDB } from "@/server/redact";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(redactDB(getDB()));
}
