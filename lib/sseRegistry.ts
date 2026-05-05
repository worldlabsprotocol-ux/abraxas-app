// FILE: lib/sseRegistry.ts
// Module-level SSE subscriber registry.
// Shared between app/api/stream/route.ts (GET) and app/api/helius/route.ts (POST).
// NOT a Next.js route file — plain TypeScript module, any export is valid.
// Persists within a single Lambda instance. For multi-instance: swap for Upstash.

type Subscriber = (data: string) => void;
const subscribers = new Set<Subscriber>();

export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function broadcast(payload: object): void {
  const data = JSON.stringify(payload);
  subscribers.forEach((fn) => { try { fn(data); } catch {} });
}