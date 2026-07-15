"use client";
// FILE: components/portal/OwnerJourneyPanel.tsx
// End-to-end owner journey with wallet, verify, and USDC settlement CTAs.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { savePostLoginReturn } from "@/lib/auth/postLoginReturn";
import type { OwnerJourney } from "@/lib/portal/ownerJourney";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

export function OwnerJourneyPanel({
  applicationId,
  email,
}: {
  applicationId: string;
  email: string;
}) {
  const { suiAddress, isAuthenticated, canSignTransactions, signInWithGoogle } = useSuiAuth();
  const [journey, setJourney] = useState<OwnerJourney | null>(null);
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!applicationId || !email) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/portal/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          email,
          session_wallet: suiAddress,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; journey?: OwnerJourney };
      if (!res.ok || !data.journey) throw new Error(data.error ?? "Could not load journey");
      setJourney(data.journey);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(false);
    }
  }, [applicationId, email, suiAddress]);

  useEffect(() => {
    void load();
  }, [load]);

  async function linkWallet() {
    if (!suiAddress) return;
    setLinking(true);
    setErr(null);
    try {
      const res = await fetch("/api/portal/wallet-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, email, wallet: suiAddress }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Wallet link failed");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Link failed");
    } finally {
      setLinking(false);
    }
  }

  function goPassport() {
    const returnPath = `/portal/journey?application_id=${encodeURIComponent(applicationId)}&email=${encodeURIComponent(email)}`;
    savePostLoginReturn(returnPath);
  }

  if (busy && !journey) {
    return <PanelShell>Loading your end-to-end journey…</PanelShell>;
  }

  if (!journey) {
    return (
      <PanelShell>
        {err ?? "Enter application reference and email."}
      </PanelShell>
    );
  }

  const walletReady = Boolean(suiAddress && isAuthenticated && canSignTransactions);
  const needsLink = walletReady && journey.wallet_address?.toLowerCase() !== suiAddress?.toLowerCase();

  return (
    <PanelShell>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                     letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        Owner journey · verify once → settle on-chain
      </div>
      <h2 style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.35rem" }}>
        {journey.asset_name}
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 1rem" }}>
        Wallet → verified asset → deal ready → USDC on Sui. Same rail as Cielo Sunrise — seamless whether you live in crypto or not.
      </p>

      <div style={{ display: "grid", gap: "0.55rem", marginBottom: "1rem" }}>
        {journey.steps.map(step => (
          <div key={step.id} style={{
            padding: "0.65rem 0.75rem", borderRadius: 10,
            background: step.current ? `${AMBER}10` : step.complete ? `${ACCENT}08` : "transparent",
            border: `1px solid ${step.current ? `${AMBER}44` : step.complete ? `${ACCENT}33` : "var(--border)"}`,
          }}>
            <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                background: step.complete ? ACCENT : step.current ? AMBER : "var(--border)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.55rem", color: "#000", fontWeight: 800,
              }}>
                {step.complete ? "✓" : step.current ? "●" : ""}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700 }}>{step.label}</div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {step.detail}
                </div>
                {step.action && (
                  <Link href={step.action.href} style={{
                    display: "inline-block", marginTop: "0.4rem",
                    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
                  }}>
                    {step.action.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!walletReady && (
        <div style={{ marginBottom: "0.75rem" }}>
          <button type="button" onClick={() => { goPassport(); void signInWithGoogle(); }} style={primaryBtn(false)}>
            Sign in with Google (Passport) →
          </button>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.45rem 0 0" }}>
            zkLogin creates your Sui wallet — no seed phrase required for the meeting walkthrough.
          </p>
        </div>
      )}

      {needsLink && (
        <button type="button" onClick={() => void linkWallet()} disabled={linking} style={primaryBtn(linking)}>
          {linking ? "Linking wallet…" : "Link this wallet to my application →"}
        </button>
      )}

      {journey.settle_url && !journey.settled && walletReady && (
        <Link href={journey.settle_url} style={{ ...primaryBtn(false), display: "block", textAlign: "center", textDecoration: "none", marginTop: "0.5rem" }}>
          Move {journey.settlement_amount_usdc} USDC →
        </Link>
      )}

      {err && <p style={{ color: "#EF4444", fontFamily: FONT, fontSize: "0.72rem", marginTop: "0.5rem" }}>{err}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
        <Link href={`/portal/status?application_id=${encodeURIComponent(applicationId)}&email=${encodeURIComponent(email)}`}
          style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "none" }}>
          Application status only →
        </Link>
        <Link href="/case-studies/cielo" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
          Cielo reference loop →
        </Link>
      </div>
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      {children}
    </div>
  );
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "0.65rem", borderRadius: 999, border: "none",
    background: disabled ? `${ACCENT}55` : ACCENT, color: "#000",
    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
    cursor: disabled ? "wait" : "pointer",
  };
}
