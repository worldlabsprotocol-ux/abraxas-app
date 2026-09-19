"use client";
// FILE: app/examples/trading-venue/TradingVenueExampleClient.tsx
// Sandbox Enable market access. Fixture preflight only. No wallet or trade.

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

const FIXTURES = ["approved", "denied", "expired", "revoked", "cross_partner", "altered_policy"] as const;

export function TradingVenueExampleClient({ startUrl }: { startUrl: string }) {
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function run(fixture: string, replay = false) {
    setBusy(true);
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
      setResult(JSON.stringify(await res.json(), null, 2));
    } finally {
      setBusy(false);
    }
  }

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
      <ContentCard title="Sandbox Enable market access">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Preflight uses local fixtures. No live venue, order, or funds movement.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.85rem" }}>
          {FIXTURES.map((fixture) => (
            <Btn key={fixture} size="sm" variant="secondary" disabled={busy} onClick={() => void run(fixture)}>
              {fixture}
            </Btn>
          ))}
          <Btn size="sm" variant="ghost" disabled={busy} onClick={() => void run("approved", true)}>
            Replay approved
          </Btn>
        </div>
        {result && (
          <pre className="abx-code-scroll" style={{ fontFamily: MONO, fontSize: "0.68rem", overflowX: "auto", maxWidth: "100%", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
            {result}
          </pre>
        )}
      </ContentCard>
    </>
  );
}
