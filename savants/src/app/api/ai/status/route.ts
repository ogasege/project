import { DEFAULT_MODEL, isLive } from "@/server/ai/client";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ live: isLive(), defaultModel: DEFAULT_MODEL });
}
