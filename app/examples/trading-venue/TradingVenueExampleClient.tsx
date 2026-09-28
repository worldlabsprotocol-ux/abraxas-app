"use client";
// FILE: app/examples/trading-venue/TradingVenueExampleClient.tsx
// Sandbox market-access preflight. Plain-language result first; technical payload on demand.

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import type { TradingVenueClientVisibleResult } from "@/lib/partner/tradingVenue/clientVisible";
import {
  presentVenueResult,
  type VenueResultTone,
} from "@/lib/partner/tradingVenue/presentation";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

const FIXTURES = [
  { id: "approved", label: "Eligible receipt" },
  { id: "denied", label: "Not eligible" },
  { id: "expired", label: "Expired receipt" },
  { id: "revoked", label: "Revoked receipt" },
  { id: "cross_partner", label: "Wrong partner" },
  { id: "altered_policy", label: "Changed policy" },
] as const;

const TONE_COLOR: Record<VenueResultTone, string> = {
  success: "#5EEAD4",
  attention: "#FBBF24",
  blocked: "#F87171",
};

export function TradingVenueExampleClient({ startUrl }: { startUrl: string }) {
  const [result, setResult] = useState<TradingVenueClientVisibleResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fixture: string, replay = false) {
    setBusy(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/examples/trading-venue/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fixture,
          action_type: "enable_market_access",
          action_scope: "sandbox:market_access",
          replay_contract: replay,
        }),
      });
      const payload = await res.json() as TradingVenueClientVisibleResult;
      setResult(payload);
    } catch {
      setResult(null);
      setRequestError("The sandbox access check could not load. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const presented = result ? presentVenueResult(result) : null;

  return (
    <>
      <ContentCard title="Hosted Partner Flow">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Start a policy check. The callback is not authorization. This page never connects a wallet.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href={startUrl} size="sm">Open Partner Flow →</Btn>
          <Btn href="/docs/trading-venue" size="sm" variant="secondary">Venue docs →</Btn>
        </div>
        <PublicJourneyNextSteps title="Build this adapter" />
      </ContentCard>
      <ContentCard title="Try a market-access decision">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Choose a sample receipt to see the same allow-or-deny result a tokenized-asset venue can use. No order is placed and no funds move.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.85rem" }}>
          {FIXTURES.map((fixture) => (
            <Btn key={fixture.id} size="sm" variant="secondary" disabled={busy} onClick={() => void run(fixture.id)}>
              {fixture.label}
            </Btn>
          ))}
          <Btn size="sm" variant="ghost" disabled={busy} onClick={() => void run("approved", true)}>
            Test replay protection
          </Btn>
        </div>
        {busy && (
          <p aria-live="polite" style={body}>Checking access…</p>
        )}
        {requestError && (
          <p role="alert" style={{ ...body, color: TONE_COLOR.blocked }}>{requestError}</p>
        )}
        {result && presented && (
          <section
            aria-live="polite"
            style={{
              padding: "1rem",
              borderRadius: 12,
              border: `1px solid ${TONE_COLOR[presented.tone]}`,
              background: "color-mix(in srgb, var(--surface-raised) 92%, transparent)",
            }}
          >
            <p style={{
              fontFamily: FONT,
              color: TONE_COLOR[presented.tone],
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              margin: "0 0 0.3rem",
            }}>
              {result.allowed ? "Allowed once" : "Stopped safely"}
            </p>
            <h3 style={{
              fontFamily: FONT,
              color: "var(--text-primary)",
              fontSize: "1.05rem",
              margin: "0 0 0.35rem",
            }}>
              {presented.title}
            </h3>
            <p style={body}>{presented.summary}</p>
            <p style={{ ...body, marginTop: "0.45rem", color: "var(--text-muted)" }}>
              Abraxas returned only the decision, action binding, and expiry. The venue keeps execution, custody, reporting, and settlement.
            </p>
            <details style={{ marginTop: "0.8rem" }}>
              <summary style={{
                cursor: "pointer",
                fontFamily: FONT,
                fontSize: "0.76rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}>
                Technical result
              </summary>
              <pre className="abx-code-scroll" style={{
                fontFamily: MONO,
                fontSize: "0.68rem",
                overflowX: "auto",
                maxWidth: "100%",
                padding: "0.8rem",
                borderRadius: 10,
                border: "1px solid var(--border)",
                margin: "0.65rem 0 0",
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </section>
        )}
      </ContentCard>
    </>
  );
}
