// FILE: app/api/stream/route.ts
// Server-Sent Events endpoint. GET only. No non-HTTP exports.
// Clients connect via native browser EventSource.
// Events are pushed by /api/helius via lib/sseRegistry.ts broadcast().

import { subscribe } from "@/lib/sseRegistry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let   closed  = false;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED", ts: Date.now() })}\n\n`)
      );

      const unsubscribe = subscribe((data) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${data}\n\n`)); } catch {}
      });

      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)); } catch {}
      }, 20_000);

      const cleanup = () => {
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
      };

      // Store cleanup on controller so cancel() can reach it
      (controller as unknown as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      closed = true;
      // Retrieve cleanup if stored
      // (no-op if already called)
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":       "text/event-stream",
      "Cache-Control":      "no-cache, no-transform",
      "Connection":         "keep-alive",
      "X-Accel-Buffering":  "no",
    },
  });
}