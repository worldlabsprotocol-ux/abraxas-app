"use client";
// FILE: components/passport/PassportTrustCard.tsx
// Unified account status on /passport. Basic tier after sign-in; enhanced after ID check.

import { useEffect, useState } from "react";
import Link from "next/link";
import { consumerCopy } from "@/lib/consumerCopy";

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

function formatIdentityStatus(status: string) {
  if (status === "approved") return "Verified";
  if (status === "pending") return "In review";
  if (status === "declined") return "Not verified";
  return "Not started";
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
  const copy = consumerCopy.trustCard;

  return (
    <div style={{
      background: "var(--surface-raised)", border: `1px solid ${walletReady ? `${ACCENT}44` : "var(--border)"}`,
      borderRadius: 16, padding: "1.15rem 1.25rem", marginBottom: "1.5rem",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        {copy.title}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
        {walletReady ? (enhanced ? copy.readyEnhanced : copy.ready) : "Sign in to get started"}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
        {walletReady
          ? enhanced ? copy.enhancedBody : copy.readyBody
          : copy.signInBody}
      </p>

      {trust && (
        <div style={{ display: "grid", gap: "0.45rem", marginBottom: enhanced ? 0 : "0.85rem" }}>
          {[
            { label: copy.rows.wallet, ok: trust.wallet_registered || walletReady, detail: "Active" },
            { label: copy.rows.intent, ok: trust.intent.proofs_count > 0, detail: trust.intent.proofs_count > 0 ? "Done" : "Optional" },
            { label: copy.rows.identity, ok: trust.identity.status === "approved", detail: formatIdentityStatus(trust.identity.status) },
            { label: copy.rows.credential, ok: trust.credential.active, detail: trust.credential.active ? "Active" : "Optional" },
            { label: copy.rows.onChain, ok: trust.on_chain.provisioned, detail: trust.on_chain.stamps_complete ? "Complete" : "Optional" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: FONT, fontSize: "0.75rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot(row.ok), flexShrink: 0 }} />
              <span style={{ color: "var(--text-secondary)", flex: 1 }}>{row.label}</span>
              <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>{row.detail}</span>
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
            {copy.upgradeTitle}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.65rem" }}>
            {copy.upgradeBody}
          </p>
          <Link href="#identity-stamp" style={{
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
          }}>
            {copy.upgradeCta}
          </Link>
        </div>
      )}
    </div>
  );
}
