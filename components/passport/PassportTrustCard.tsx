"use client";
// FILE: components/passport/PassportTrustCard.tsx
// Unified account status on /passport. Basic tier after sign-in; enhanced after ID check.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { consumerCopy } from "@/lib/consumerCopy";
import { fetchTrustStatus, passportQueryKeys } from "@/lib/api/passport";
import { Skeleton } from "@/lib/motion/Skeleton";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

function dot(ok: boolean) {
  return ok ? ACCENT : "var(--text-muted)";
}

function formatIdentityStatus(status: string) {
  if (status === "approved") return "Verified";
  if (status === "pending") return "In review";
  if (status === "declined") return "Not verified";
  return "Not started";
}

export function PassportTrustCard({
  suiAddress,
  completionPercent,
}: {
  suiAddress: string | null;
  completionPercent?: number;
}) {
  const { data: trust, isLoading } = useQuery({
    queryKey: suiAddress ? passportQueryKeys.trust(suiAddress) : ["passport", "trust", "none"],
    queryFn: () => fetchTrustStatus(suiAddress!),
    enabled: Boolean(suiAddress),
    staleTime: 30_000,
  });

  if (!suiAddress) return null;

  const walletReady = Boolean(suiAddress);
  const enhanced = trust?.enhanced_trust ?? false;
  const copy = consumerCopy.trustCard;

  if (isLoading) {
    return (
      <div style={{
        background: "var(--surface-raised)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "1.15rem 1.25rem", marginBottom: "1.5rem",
      }}>
        <Skeleton width="30%" height={10} style={{ marginBottom: 10 }} />
        <Skeleton width="55%" height={18} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={48} />
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--surface-raised)", border: `1px solid ${walletReady ? `${ACCENT}44` : "var(--border)"}`,
      borderRadius: 16, padding: "1.15rem 1.25rem", marginBottom: "1.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.35rem" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {copy.title}
        </div>
        {typeof completionPercent === "number" && (
          <div style={{ fontFamily: MONO, fontSize: "0.75rem", fontWeight: 800, color: ACCENT }}>
            {completionPercent}%
          </div>
        )}
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
            ...(trust.claims && trust.claims.active_count > 0
              ? [{ label: "Compliance claims", ok: true, detail: `${trust.claims.active_count} active` }]
              : []),
          ].map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: FONT, fontSize: "0.75rem", minHeight: 28 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot(row.ok), flexShrink: 0 }} aria-hidden />
              <span style={{ color: "var(--text-secondary)", flex: 1 }}>{row.label}</span>
              <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: row.detail === "In review" ? AMBER : "var(--text-muted)" }}>{row.detail}</span>
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
          <Link href="#passport-step-2" style={{
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
            minHeight: 44, display: "inline-flex", alignItems: "center",
          }}>
            {copy.upgradeCta}
          </Link>
        </div>
      )}
    </div>
  );
}
