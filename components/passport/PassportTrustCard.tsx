"use client";
// FILE: components/passport/PassportTrustCard.tsx
// Unified trust status on /passport. Basic tier after wallet; enhanced after Veriff.

import { useEffect, useState } from "react";
import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

interface TrustStatus {
  ready_to_transact: boolean;
  enhanced_trust: boolean;
  wallet_registered: boolean;
  identity: { status: string; veriff_session_id: string | null };
  credential: { active: boolean };
  on_chain: { provisioned: boolean; stamps_complete: boolean; object_id: string | null };
  intent: { proofs_count: number };
}

function dot(ok: boolean) {
  return ok ? ACCENT : "var(--text-muted)";
}

export function PassportTrustCard({ suiAddress }: { suiAddress: string | null }) {
  const [trust, setTrust] = useState<TrustStatus | null>(null);

  useEffect(() => {
    if (!suiAddress) return;
    fetch(`/api/trust/status?sui=${encodeURIComponent(suiAddress)}`)
      .then(r => r.json())
      .then(d => setTrust(d as TrustStatus))
      .catch(() => setTrust(null));
  }, [suiAddress]);

  if (!suiAddress) return null;

  const walletReady = Boolean(suiAddress);
  const enhanced = trust?.enhanced_trust ?? false;

  return (
    <div style={{
      background: "var(--surface-raised)", border: `1px solid ${walletReady ? `${ACCENT}44` : "var(--border)"}`,
      borderRadius: 16, padding: "1.15rem 1.25rem", marginBottom: "1.5rem",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        Trust status
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
        {walletReady ? "Ready to transact" : "Create your wallet to start"}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
        {walletReady
          ? enhanced
            ? "Your wallet is live and identity is verified. Full trust tier unlocked."
            : "Your Sui wallet is live. Browse assets, submit deals, and sign intent proofs now. Add Veriff Precheck when you want enhanced stamps."
          : "Sign in with Google to create your zkLogin wallet. No seed phrase required."}
      </p>

      {trust && (
        <div style={{ display: "grid", gap: "0.45rem", marginBottom: enhanced ? 0 : "0.85rem" }}>
          {[
            { label: "Sui wallet", ok: trust.wallet_registered || walletReady, detail: "active" },
            { label: "Intent proofs", ok: trust.intent.proofs_count > 0, detail: String(trust.intent.proofs_count) },
            { label: "Veriff identity", ok: trust.identity.status === "approved", detail: trust.identity.status },
            { label: "W3C credential", ok: trust.credential.active, detail: trust.credential.active ? "active" : "optional" },
            { label: "On-chain passport", ok: trust.on_chain.provisioned, detail: trust.on_chain.stamps_complete ? "stamps complete" : "optional" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: FONT, fontSize: "0.75rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot(row.ok), flexShrink: 0 }} />
              <span style={{ color: "var(--text-secondary)", flex: 1 }}>{row.label}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)" }}>{row.detail}</span>
            </div>
          ))}
        </div>
      )}

      {walletReady && !enhanced && (
        <div style={{
          padding: "0.75rem 0.85rem", borderRadius: 10,
          background: `${AMBER}10`, border: `1px solid ${AMBER}33`,
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: AMBER, marginBottom: "0.35rem" }}>
            Optional: upgrade to enhanced trust
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.65rem" }}>
            Veriff Precheck unlocks identity stamps, W3C credentials, and on-chain passport issuance.
            It does not block browsing or basic actions today.
          </p>
          <Link href="#identity-stamp" style={{
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
          }}>
            Start Precheck when ready →
          </Link>
        </div>
      )}

      {trust && !trust.identity.veriff_session_id && trust.identity.status === "pending" && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: AMBER, margin: "0.75rem 0 0", lineHeight: 1.55 }}>
          No Veriff session id saved. Redeploy latest build and click Start Precheck again so polling can finish approval.
        </p>
      )}
    </div>
  );
}
