// FILE: lib/vos/userTokenStore.ts
// Tracks tokens minted against verified assets. Free, localStorage-based.
// Backend-ready: swap to Supabase later — same interface.
import { sessionStore } from "./sessionStore";

const KEY = "abraxas_user_tokens_v1";

export interface TokenMint {
  id:          string;       // mint id, e.g. "MNT-XYZ123"
  assetId:     string;       // user asset ID this mint is against
  sessionId:   string;
  supply:      number;       // total tokens minted
  pricePerTok: number;       // implied price per token (USD)
  mintedAt:    string;       // ISO timestamp
  symbol:      string;       // e.g. "AAS-MNT-001"
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
function readAll(): TokenMint[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as TokenMint[]; } catch { return []; }
}
function writeAll(mints: TokenMint[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(mints));
}
function genId(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "MNT-";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export const userTokenStore = {
  mint(assetId: string, supply: number, pricePerTok: number, symbol?: string): TokenMint {
    const session = sessionStore.get();
    const m: TokenMint = {
      id:          genId(),
      assetId,
      sessionId:   session.id,
      supply,
      pricePerTok,
      mintedAt:    new Date().toISOString(),
      symbol:      symbol ?? `${assetId}-TOK`,
    };
    const all = readAll();
    all.push(m);
    writeAll(all);
    return m;
  },

  listMine(): TokenMint[] {
    const s = sessionStore.get();
    return readAll().filter(m => m.sessionId === s.id)
      .sort((a, b) => b.mintedAt.localeCompare(a.mintedAt));
  },

  forAsset(assetId: string): TokenMint | undefined {
    const s = sessionStore.get();
    return readAll().find(m => m.sessionId === s.id && m.assetId === assetId);
  },

  clearMine(): number {
    const s = sessionStore.get();
    const all = readAll();
    const kept = all.filter(m => m.sessionId !== s.id);
    writeAll(kept);
    return all.length - kept.length;
  },
};
