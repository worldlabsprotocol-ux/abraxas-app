/**
 * Bags API client.
 *
 * IMPORTANT: This module reads `BAGS_API_KEY` from process.env.
 * It MUST only be imported from server-side code:
 *   - Next.js API routes (`app/api/**`)
 *   - Server Components (no `"use client"`)
 *
 * Never import this from client components — it would bundle the key
 * into client JS. Use the `/api/bags/*` routes from the client instead.
 */

const BAGS_BASE = "https://public-api-v2.bags.fm/api/v1";

const apiKey = process.env.BAGS_API_KEY ?? "";
const partnerWallet = process.env.BAGS_PARTNER_WALLET ?? "";

/* ------------------------------------------------------------------ */
/* Shared types — match Bags API response shapes                       */
/* ------------------------------------------------------------------ */

export interface BagsResponse<T> {
  success: boolean;
  response: T;
}

export interface BagsTokenLaunch {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  tokenMint: string;
  status: "PRE_LAUNCH" | "LIVE" | "GRADUATED" | string;
  twitter?: string;
  website?: string;
  launchSignature?: string;
  uri?: string;
  dbcPoolKey?: string;
  dbcConfigKey?: string;
}

export interface BagsTokenCreator {
  username?: string;
  pfp?: string;
  royaltyBps?: number;
  isCreator?: boolean;
  wallet?: string;
  provider?: string;
  providerUsername?: string;
  twitterUsername?: string;
  bagsUsername?: string;
  isAdmin?: boolean;
}

export interface BagsLifetimeFees {
  totalFeesUSD?: string | number;
  totalFeesSOL?: string | number;
  // Bags returns fee data; exact shape can vary — kept loose
  [key: string]: unknown;
}

export interface BagsPartnerStats {
  claimedFees: string;
  unclaimedFees: string;
}

export interface BagsPool {
  tokenMint: string;
  dbcConfigKey: string;
  dbcPoolKey: string;
  dammV2PoolKey: string;
}

/* ------------------------------------------------------------------ */
/* Internal — base fetch with auth + error handling                    */
/* ------------------------------------------------------------------ */

async function bagsFetch<T>(
  path: string,
  init?: RequestInit & { searchParams?: Record<string, string> }
): Promise<BagsResponse<T> | null> {
  if (!apiKey) {
    console.warn("[bags] BAGS_API_KEY is not set; skipping API call to", path);
    return null;
  }

  let url = `${BAGS_BASE}${path}`;
  if (init?.searchParams) {
    const qs = new URLSearchParams(init.searchParams).toString();
    if (qs) url += `?${qs}`;
  }

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      // Cache on the server briefly so we don't hammer Bags from every render
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.warn(`[bags] ${path} -> ${res.status}`);
      return null;
    }
    const json = (await res.json()) as BagsResponse<T>;
    return json;
  } catch (err) {
    console.warn(`[bags] fetch error on ${path}:`, err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public API — friendly named functions                               */
/* ------------------------------------------------------------------ */

/**
 * Token launch feed — list of recent and active tokens on Bags.
 * Used by the marketplace to show real Bags-launched tokens.
 */
export async function fetchAssets(): Promise<BagsTokenLaunch[]> {
  const data = await bagsFetch<BagsTokenLaunch[]>("/token-launch/feed");
  return data?.response ?? [];
}

/**
 * Single token detail — combines pool + creators + lifetime fees.
 * `tokenMint` is the public key (e.g. ABRA's CA).
 */
export async function fetchTokenData(tokenMint: string) {
  const [pool, creators, fees] = await Promise.all([
    bagsFetch<BagsPool>("/solana/bags/pools/token-mint", {
      searchParams: { tokenMint },
    }),
    bagsFetch<BagsTokenCreator[]>("/token-launch/creator/v3", {
      searchParams: { tokenMint },
    }),
    bagsFetch<BagsLifetimeFees>("/token-launch/lifetime-fees", {
      searchParams: { tokenMint },
    }),
  ]);

  return {
    pool: pool?.response ?? null,
    creators: creators?.response ?? [],
    fees: fees?.response ?? null,
  };
}

/**
 * Market-level data — partner stats, used for the Hyperliquid-style
 * "real revenue" trust signal on the homepage / live page.
 *
 * Without a partner wallet env var, this returns null.
 */
export async function fetchMarketData(): Promise<BagsPartnerStats | null> {
  if (!partnerWallet) {
    console.warn("[bags] BAGS_PARTNER_WALLET not set; partner stats unavailable");
    return null;
  }
  const data = await bagsFetch<BagsPartnerStats>(
    "/fee-share/partner-config/stats",
    { searchParams: { partner: partnerWallet } }
  );
  return data?.response ?? null;
}

/**
 * Configuration check — used by status panels to show whether
 * Bags is currently wired (without revealing key contents).
 */
export function bagsConfigStatus() {
  return {
    apiKeyPresent: Boolean(apiKey),
    partnerWalletPresent: Boolean(partnerWallet),
  };
}

/* ------------------------------------------------------------------ */
/* Combined revenue snapshot — used for the public revenue panel.     */
/* ------------------------------------------------------------------ */

export interface AbraRevenueStats {
  /** ABRA token lifetime fees (creator earnings). Source of truth for
   *  the public-facing revenue number on the homepage. */
  lifetimeFees: BagsLifetimeFees | null;
  /** Partner-level stats (claimed + unclaimed) — additional context. */
  partner: BagsPartnerStats | null;
  /** Echoes the ABRA contract address so the panel can show provenance. */
  tokenMint: string;
}

/**
 * One-call snapshot used by the homepage / live page revenue panel.
 * Pulls token-specific lifetime fees + partner-level stats in parallel.
 */
export async function fetchAbraStats(): Promise<AbraRevenueStats> {
  const tokenMint =
    process.env.NEXT_PUBLIC_ABRA_MINT ??
    process.env.NEXT_PUBLIC_ABRA_CA ??
    "";

  const [feesRes, partner] = await Promise.all([
    tokenMint
      ? bagsFetch<BagsLifetimeFees>("/token-launch/lifetime-fees", {
          searchParams: { tokenMint },
        })
      : Promise.resolve(null),
    fetchMarketData(),
  ]);

  return {
    lifetimeFees: feesRes?.response ?? null,
    partner,
    tokenMint,
  };
}
