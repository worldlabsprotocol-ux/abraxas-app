"use client";

import { useEffect, useState } from "react";
import { ABRA } from "@/lib/constants";

interface TokenStatus {
  loading: boolean;
  liveOnBags: boolean;
  poolKnown: boolean;
  creatorVerified: boolean;
  error?: string;
}

/**
 * Shows live $ABRA status by hitting our /api/bags/token route.
 * Server-side keeps the API key safe; we just render the result.
 *
 * Renders a compact strip suitable for the dashboard.
 */
export function LiveAbraStatus() {
  const [status, setStatus] = useState<TokenStatus>({
    loading: true,
    liveOnBags: false,
    poolKnown: false,
    creatorVerified: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/bags/token?mint=${ABRA.ca}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setStatus((s) => ({ ...s, loading: false, error: "API unavailable" }));
          return;
        }
        setStatus({
          loading: false,
          liveOnBags: Boolean(data.pool?.tokenMint),
          poolKnown: Boolean(data.pool?.dbcPoolKey),
          creatorVerified: Array.isArray(data.creators) && data.creators.length > 0,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus((s) => ({ ...s, loading: false, error: "Failed to load" }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-bg-2 border border-border rounded-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status.loading
                ? "bg-abraxas-subtle animate-pulse"
                : status.liveOnBags
                ? "bg-abraxas-green"
                : "bg-abraxas-red"
            }`}
          />
          <span className="font-display font-semibold text-sm">$ABRA Status</span>
        </div>
        <a
          href={ABRA.solscan}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.7rem] text-gold hover:underline font-mono"
        >
          {ABRA.caShort}
        </a>
      </div>

      <div className="space-y-1.5 text-xs">
        <Row label="Live on Bags" ok={status.liveOnBags} loading={status.loading} />
        <Row label="Pool registered" ok={status.poolKnown} loading={status.loading} />
        <Row label="Creator verified" ok={status.creatorVerified} loading={status.loading} />
      </div>

      {status.error && (
        <p className="text-[0.7rem] text-abraxas-subtle mt-3">
          {status.error} — using cached values
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-border flex justify-between text-[0.7rem]">
        <a
          href={ABRA.bags}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold hover:underline"
        >
          Trade on Bags ↗
        </a>
        <a
          href={ABRA.dexscreener}
          target="_blank"
          rel="noopener noreferrer"
          className="text-abraxas-subtle hover:text-gold"
        >
          Chart ↗
        </a>
      </div>
    </div>
  );
}

function Row({
  label,
  ok,
  loading,
}: {
  label: string;
  ok: boolean;
  loading: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-abraxas-subtle">{label}</span>
      <span
        className={
          loading
            ? "text-abraxas-subtle"
            : ok
            ? "text-abraxas-green"
            : "text-abraxas-red"
        }
      >
        {loading ? "…" : ok ? "✓ verified" : "—"}
      </span>
    </div>
  );
}
