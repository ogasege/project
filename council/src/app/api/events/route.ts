import { subscribe } from "@/server/db";
import { redactEnvelope } from "@/server/redact";

export const dynamic = "force-dynamic";

// Server-sent events: every committed op envelope is pushed to every connected client.
export function GET(req: Request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          cleanup();
        }
      };
      send(`retry: 2000\n\n`);
      const unsub = subscribe((env) => send(`data: ${JSON.stringify(redactEnvelope(env))}\n\n`));
      const ping = setInterval(() => send(`: ping\n\n`), 20_000);
      cleanup = () => {
        clearInterval(ping);
        unsub();
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
