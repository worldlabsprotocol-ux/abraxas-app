// FILE: lib/solana/rpc.ts
// RPC abstraction with primary + fallback.
// Server-side only — do NOT import in client components directly.
// All client code calls /api/vault/* routes which import this.

import { Connection, Commitment } from "@solana/web3.js";

const PRIMARY  = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
              ?? process.env.SOLANA_RPC_URL
              ?? "https://api.mainnet-beta.solana.com";

const FALLBACK = "https://api.mainnet-beta.solana.com";

// TTL cache — reuse connection within the same Lambda invocation
let _conn: Connection | null = null;
let _ts = 0;
const TTL = 30_000; // 30s

export function getConnection(commitment: Commitment = "confirmed"): Connection {
  const now = Date.now();
  if (!_conn || now - _ts > TTL) {
    try {
      _conn = new Connection(PRIMARY, { commitment, disableRetryOnRateLimit: false });
    } catch {
      _conn = new Connection(FALLBACK, { commitment });
    }
    _ts = now;
  }
  return _conn;
}

export async function withFallback<T>(fn: (conn: Connection) => Promise<T>): Promise<T> {
  try {
    return await fn(getConnection());
  } catch (e) {
    console.warn("[rpc] Primary failed, trying fallback:", e);
    return fn(new Connection(FALLBACK, { commitment: "confirmed" }));
  }
}