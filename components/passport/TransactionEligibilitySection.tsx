"use client";
// FILE: components/passport/TransactionEligibilitySection.tsx
// Tier 3 — transaction-specific claims and first external relying partner gate.

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Btn } from "@/components/redesign/ui";
import { POLICY_DECISIONS, type PolicyDecision } from "@/lib/abraxasNetwork";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface EligibilityResponse {
  passport_tier: number;
  tier_label: string;
  transaction_eligibility: boolean;
  tier3_claims: { claim_type: string; label: string }[];
  meridian: {
    partner_id: string;
    company: string;
    policy_id: string;
    decision: PolicyDecision;
    missing_claims: string[];
    reason_codes: string[];
    valid_until: string | null;
  } | null;
}

async function fetchEligibility(): Promise<EligibilityResponse> {
  const res = await fetch("/api/passport/transaction-eligibility", { credentials: "include" });
  if (!res.ok) throw new Error("Eligibility unavailable");
  return res.json() as Promise<EligibilityResponse>;
}

export function TransactionEligibilitySection({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"screening" | "meridian" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["passport", "transaction-eligibility"],
    queryFn: fetchEligibility,
    enabled,
    staleTime: 20_000,
  });

  if (!enabled) return null;

  async function applyPilotScreening() {
    setBusy("screening");
    setError(null);
    try {
      const res = await fetch("/api/passport/pilot-screening", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Screening failed");
      await queryClient.invalidateQueries({ queryKey: ["passport", "transaction-eligibility"] });
      await queryClient.invalidateQueries({ queryKey: ["passport", "share-history"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Screening failed");
    } finally {
      setBusy(null);
    }
  }

  async function startMeridianConsent() {
    setBusy("meridian");
    setError(null);
    try {
      const res = await fetch("/api/passport/demo-partner-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: "meridian-investor-gate-v1" }),
      });
      const json = await res.json() as { consent_url?: string; error?: string };
      if (!res.ok || !json.consent_url) throw new Error(json.error ?? "Request failed");
      window.location.href = json.consent_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setBusy(null);
    }
  }

  return (
    <section style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      padding: "1.15rem 1.25rem",
      marginBottom: "1.25rem",
    }} aria-labelledby="tier3-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.45rem",
      }}>
        Transaction-specific eligibility
      </div>
      <h2 id="tier3-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.5rem",
      }}>
        Tier 3 · Partner-gated claims
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 0.85rem",
      }}>
        Sanctions, investor, KYB, and asset-specific proofs are separate time-bound claims — not implied by identity verification alone.
      </p>

      {isLoading && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>Loading eligibility…</p>
      )}

      {isError && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
          Eligibility data requires migrations 018+ applied.
        </p>
      )}

      {data && (
        <>
          <div style={{
            padding: "0.65rem 0.75rem", borderRadius: 10,
            background: "var(--surface-inset)", border: "1px solid var(--border)",
            marginBottom: "0.85rem",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              {data.tier_label}
              {data.transaction_eligibility ? " · Tier 3 active" : data.passport_tier >= 2 ? " · Tier 2" : ""}
            </div>
            {data.tier3_claims.length > 0 ? (
              <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
                {data.tier3_claims.map(c => (
                  <li key={c.claim_type} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
                No transaction-specific claims yet. Screening or partner attestations unlock Tier 3.
              </p>
            )}
          </div>

          {data.meridian && (
            <div style={{
              padding: "0.75rem 0.85rem", borderRadius: 10,
              background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)",
              marginBottom: "0.85rem",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "#3B82F6", marginBottom: 4 }}>
                {data.meridian.company} · first external relying party
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Policy: {data.meridian.policy_id} ·{" "}
                <span style={{ color: POLICY_DECISIONS[data.meridian.decision]?.color ?? "inherit", fontWeight: 700 }}>
                  {POLICY_DECISIONS[data.meridian.decision]?.label ?? data.meridian.decision}
                </span>
              </div>
              {data.meridian.missing_claims.length > 0 && (
                <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
                  Missing: {data.meridian.missing_claims.join(", ").replace(/_/g, " ")}
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {data.meridian.missing_claims.includes("screening_outcome") && data.passport_tier >= 2 && (
                  <Btn size="sm" variant="secondary" loading={busy === "screening"} onClick={() => void applyPilotScreening()}>
                    Apply pilot screening →
                  </Btn>
                )}
                <Btn size="sm" loading={busy === "meridian"} onClick={() => void startMeridianConsent()}>
                  Meridian consent flow →
                </Btn>
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "#EF4444", margin: "0.5rem 0 0" }}>{error}</p>
          )}
        </>
      )}
    </section>
  );
}
