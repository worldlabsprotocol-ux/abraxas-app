"use client";
// FILE: components/passport/PassportTrustCard.tsx
// Unified account status on /passport. Basic tier after sign-in; enhanced after ID check.

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [repairing, setRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const { data: trust, isLoading, isError } = useQuery({
    queryKey: suiAddress ? passportQueryKeys.trust(suiAddress) : ["passport", "trust", "none"],
    queryFn: () => fetchTrustStatus(suiAddress!),
    enabled: Boolean(suiAddress),
    staleTime: 30_000,
  });

  if (!suiAddress) return null;

  const walletUnavailable = isError || trust?.wallet_binding_status === "unavailable";
  const walletReady = trust?.wallet_binding_persisted ?? false;
  const walletRepairable = Boolean(trust)
    && !walletReady
    && !walletUnavailable
    && (trust?.wallet_binding_status === "missing" || trust?.wallet_binding_status === "revoked");
  const enhanced = trust?.enhanced_trust ?? false;
  const copy = consumerCopy.trustCard;

  async function handleRepair() {
    if (!suiAddress || repairing) return;
    setRepairing(true);
    setRepairError(null);
    try {
      const res = await fetch("/api/wallet-authority/repair", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Wallet binding repair failed");
      }
      await queryClient.invalidateQueries({
        queryKey: passportQueryKeys.trust(suiAddress),
      });
    } catch (error) {
      setRepairError(error instanceof Error ? error.message : "Wallet binding repair failed");
    } finally {
      setRepairing(false);
    }
  }

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
        {walletUnavailable
          ? "Wallet status temporarily unavailable"
          : walletRepairable
            ? "Wallet binding needs repair"
            : walletReady
              ? (enhanced ? copy.readyEnhanced : copy.ready)
              : "Sign in to get started"}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
        {walletUnavailable
          ? "We could not verify your wallet binding right now. Try again in a moment."
          : walletRepairable
            ? "Your Passport address exists, but the canonical wallet binding was not saved. Use Repair wallet binding below or sign in again."
            : walletReady
              ? enhanced ? copy.enhancedBody : copy.readyBody
              : copy.signInBody}
      </p>

      {trust && (
        <div style={{ display: "grid", gap: "0.45rem", marginBottom: enhanced ? 0 : "0.85rem" }}>
          {[
            {
              label: copy.rows.wallet,
              ok: walletReady,
              detail: walletUnavailable
                ? "Unavailable"
                : walletRepairable
                  ? "Repair required"
                  : walletReady
                    ? "Active"
                    : "Missing",
            },
            { label: copy.rows.intent, ok: trust.intent.proofs_count > 0, detail: trust.intent.proofs_count > 0 ? "Done" : "Optional" },
            { label: copy.rows.identity, ok: trust.identity.status === "approved" && trust.credential.active, detail: trust.identity.status === "approved" && trust.credential.active ? "Verified" : formatIdentityStatus(trust.identity.status) },
            { label: copy.rows.credential, ok: trust.credential.active, detail: trust.credential.active ? "Active · Tier 2" : "Not issued" },
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

      {walletRepairable && (
        <div style={{
          padding: "0.75rem 0.85rem", borderRadius: 10,
          background: `${AMBER}10`, border: `1px solid ${AMBER}33`,
          marginBottom: "0.85rem",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: AMBER, marginBottom: "0.35rem" }}>
            Repair wallet binding
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.65rem" }}>
            This restores the canonical zkLogin wallet binding without collecting identity data.
          </p>
          {repairError && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: AMBER, margin: "0 0 0.65rem" }}>
              {repairError}
            </p>
          )}
          <button
            type="button"
            onClick={() => { void handleRepair(); }}
            disabled={repairing}
            style={{
              fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, color: ACCENT,
              background: "transparent", border: `1px solid ${ACCENT}55`, borderRadius: 8,
              minHeight: 44, padding: "0 0.85rem",
              cursor: repairing ? "wait" : "pointer",
              opacity: repairing ? 0.7 : 1,
            }}
          >
            {repairing ? "Repairing…" : "Repair wallet binding"}
          </button>
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
