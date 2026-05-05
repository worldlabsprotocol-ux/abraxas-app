// FILE: app/api/stream/route.ts
// Server-Sent Events endpoint. Zero new packages.
// Clients connect via EventSource — native browser API.
// Helius POST /api/helius writes to this broadcast channel.
// Every connected client gets pushed updates instantly.

export const dynamic   = "force-dynamic";
export const runtime   = "nodejs";

// Module-level subscriber registry — persists within a single Lambda instance
// On Vercel: each instance handles its own SSE connections.
// For multi-instance: replace with Upstash Redis pub/sub.
type Subscriber = (data: string) => void;
const subscribers = new Set<Subscriber>();

// Called by /api/helius POST to broadcast to all SSE clients
export function broadcast(payload: object) {
  const data = JSON.stringify(payload);
  subscribers.forEach((fn) => { try { fn(data); } catch {} });
}

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED", ts: Date.now() })}\n\n`));

      const fn: Subscriber = (data) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${data}\n\n`)); } catch {}
      };

      subscribers.add(fn);

      // Heartbeat every 20s to keep connection alive through Vercel's timeout
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)); } catch {}
      }, 20_000);

      // Cleanup on disconnect
      const cancel = () => {
        closed = true;
        subscribers.delete(fn);
        clearInterval(heartbeat);
      };

      // Attach cancel to the stream
      (controller as unknown as { cancel?: () => void }).cancel = cancel;
    },
    cancel() { closed = true; },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",  // disable Nginx buffering
    },
  });
}