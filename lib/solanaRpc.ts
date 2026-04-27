/**
 * Solana RPC URL — single source of truth used by:
 *  - SolanaProvider (wallet adapter ConnectionProvider)
 *  - useWalletBalances (inherits from useConnection)
 *  - any other module that needs an RPC URL
 *
 * Order of preference:
 *  1. NEXT_PUBLIC_SOLANA_RPC_URL (must be a non-empty, valid http(s) URL)
 *  2. Public mainnet endpoint (rate-limited — last-resort fallback only)
 *
 * NOTE on env quirks:
 *  - `??` only catches null/undefined. Empty string from a missing
 *    .env.local entry is "truthy" with `??`, so we explicitly handle it.
 *  - NEXT_PUBLIC_* vars are inlined at build time. After editing
 *    .env.local you MUST restart `npm run dev`.
 */

const PUBLIC_FALLBACK = "https://api.mainnet-beta.solana.com";

const RAW = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

// Validate once at module load. Logs to console so we can verify env wiring.
const TRIMMED = (RAW ?? "").trim();
const VALID = TRIMMED.length > 0 && /^https?:\/\//i.test(TRIMMED);

if (typeof window !== "undefined") {
  // Client-side log — safe to surface, but never log the secret part of
  // a URL (api keys are typically in query string, so we strip queries).
  const display = VALID ? TRIMMED.split("?")[0] + " (configured)" : "PUBLIC FALLBACK (rate-limited)";
  console.log("[solana-rpc] using:", display);

  if (!VALID && RAW) {
    console.warn(
      "[solana-rpc] NEXT_PUBLIC_SOLANA_RPC_URL is set but invalid:",
      "expected http(s) URL"
    );
  }
}

const RPC_URL = VALID ? TRIMMED : PUBLIC_FALLBACK;

export function getSolanaRpcUrl(): string {
  return RPC_URL;
}

export function isUsingPublicRpc(): boolean {
  return RPC_URL === PUBLIC_FALLBACK;
}
