// FILE: lib/marketFeeds.ts
// Client-side NFT data hook. All data comes from /api/nft/collections (server route).
// Components NEVER fetch Reservoir directly — this is the only entry point.
//
// Rules enforced here:
// - Single-flight dedup: concurrent calls for same chain/limit share one fetch
// - Retry once on network failure
// - Returns explicit error state (never silent failure)
// - Works without API key (server route handles graceful degradation)

"use client";

import { useEffect, useState, useRef } from "react";
import type { NormalizedCollection, NFTFeedResponse } from "@/lib/types/nft";

// Re-export types so components import from one place
export type { NormalizedCollection } from "@/lib/types/nft";

// In-flight promise dedup — prevents N components triggering N requests
const inflight = new Map<string, Promise<NFTFeedResponse>>();

async function fetchCollections(chain: string, limit: number): Promise<NFTFeedResponse> {
  const key = `${chain}:${limit}`;

  // If there's already an in-flight request for this key, reuse it
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fetch(`/api/nft/collections?chain=${chain}&limit=${limit}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<NFTFeedResponse>;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export interface NFTFeedState {
  collections: NormalizedCollection[];
  loading:     boolean;
  error:       string | null;
  source:      string | null;
  fetchedAt:   string | null;
  retry:       () => void;
}

export function useNFTCollections(chain: "ethereum" = "ethereum", limit = 20): NFTFeedState {
  const [state, setState] = useState<Omit<NFTFeedState, "retry">>({
    collections: [], loading: true, error: null, source: null, fetchedAt: null,
  });
  const retryCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetchCollections(chain, limit)
      .then((data) => {
        if (cancelled) return;
        setState({
          collections: data.collections ?? [],
          loading:     false,
          error:       data.error ?? null,
          source:      data.source ?? null,
          fetchedAt:   data.fetchedAt ?? null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        // Retry once automatically
        if (retryCount.current === 0) {
          retryCount.current = 1;
          setTimeout(() => {
            if (!cancelled) {
              fetchCollections(chain, limit)
                .then((data) => {
                  if (cancelled) return;
                  setState({ collections: data.collections ?? [], loading: false, error: data.error ?? null, source: data.source ?? null, fetchedAt: data.fetchedAt ?? null });
                })
                .catch((e) => {
                  if (!cancelled) setState((s) => ({ ...s, loading: false, error: e.message }));
                });
            }
          }, 2000);
        } else {
          setState((s) => ({ ...s, loading: false, error: err.message }));
        }
      });

    return () => { cancelled = true; };
  }, [chain, limit, retryCount.current]); // retryCount.current in deps triggers re-fetch on retry

  const retry = () => {
    retryCount.current = 0;
    setState({ collections: [], loading: true, error: null, source: null, fetchedAt: null });
  };

  return { ...state, retry };
}

// ─── Display formatters ────────────────────────────────────────────────────────

export function fmtFloor(price: number | null, symbol: string): string {
  if (price === null) return "—";
  return `${price % 1 === 0 ? price : price.toFixed(3)} ${symbol}`;
}

export function fmtVol(vol: number | null): string {
  if (vol === null) return "—";
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000)     return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${Math.round(vol)}`;
}

export function fmtChange(change: number | null): string {
  if (change === null) return "—";
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}