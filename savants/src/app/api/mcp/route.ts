import { timingSafeEqual } from "node:crypto";
import { handleRpc } from "@/server/mcp";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.SAVANTS_MCP_TOKEN;
  if (!token) return true;
  const header = req.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Reject browser requests from other origins (DNS-rebinding protection per the MCP spec).
function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host || new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!originAllowed(req)) return new Response("Forbidden origin", { status: 403 });
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }

  if (Array.isArray(body)) {
    if (!body.length) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } }, { status: 400 });
    const responses = (await Promise.all(body.map(handleRpc))).filter((r) => r !== null);
    return responses.length ? Response.json(responses) : new Response(null, { status: 202 });
  }
  const res = await handleRpc(body);
  return res ? Response.json(res) : new Response(null, { status: 202 });
}

const notAllowed = () => new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
export const GET = notAllowed;
export const DELETE = notAllowed;
