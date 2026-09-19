"use client";
// FILE: app/examples/payment-authorization/PaymentAuthorizationExampleClient.tsx
// Sandbox checkout authorization. Fixture preflight only. No money movement.

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function PaymentAuthorizationExampleClient({ startUrl }: { startUrl: string }) {
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function run(actionType: "authorize_checkout" | "authorize_recurring_payment", replay = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/examples/payment-authorization/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fixture: "approved",
          action_type: actionType,
          replay_contract: replay,
        }),
      });
      setResult(JSON.stringify(await res.json(), null, 2));
    } catch {
      setResult(JSON.stringify({ allowed: false, reason: "invalid" }, null, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ContentCard title="Sandbox checkout authorization">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
          This uses local receipt fixtures. It never charges a card, opens Circle, or moves funds.
          Hosted verification still starts at Partner Flow when you are ready for a real receipt.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.9rem" }}>
          <Btn href={startUrl} size="sm">Open hosted verification →</Btn>
          <Btn href="/docs/payment-authorization" size="sm" variant="secondary">Payment docs →</Btn>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("authorize_checkout")}
            style={{ padding: "0.45rem 0.75rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-inset)", color: "var(--text-primary)", fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600, cursor: "pointer" }}
          >
            Authorize checkout
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("authorize_recurring_payment")}
            style={{ padding: "0.45rem 0.75rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface-inset)", color: "var(--text-primary)", fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600, cursor: "pointer" }}
          >
            Authorize recurring
          </button>
        </div>
      </ContentCard>
      {result && (
        <ContentCard title="Preflight result">
          <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", maxWidth: "100%", boxSizing: "border-box", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
            {result}
          </pre>
        </ContentCard>
      )}
    </>
  );
}
