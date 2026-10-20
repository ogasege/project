import { NextResponse, type NextRequest } from "next/server";

// API guard. The workspace has no login yet, so the API must only answer this machine's own pages:
// 1. The Host header must be a loopback name (or one listed in SAVANTS_ALLOWED_HOSTS). This stops
//    DNS rebinding, where a malicious site points its own hostname at 127.0.0.1.
// 2. State-changing requests must not come from another site. A body-less cross-site POST is a
//    "simple" request that skips the CORS preflight, so the server has to refuse it itself.

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function hostAllowed(host: string | null): boolean {
  if (!host) return false;
  const name = host.replace(/:\d+$/, "").toLowerCase();
  if (LOOPBACK.has(name)) return true;
  const extra = (process.env.SAVANTS_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(name) || extra.includes(host.toLowerCase());
}

function sameSite(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, MCP clients) send no Origin
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  if (!hostAllowed(req.headers.get("host"))) {
    return NextResponse.json({ error: "Host not allowed. Add it to SAVANTS_ALLOWED_HOSTS to serve beyond localhost." }, { status: 403 });
  }
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS" && !sameSite(req)) {
    return NextResponse.json({ error: "Cross-site request refused" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
