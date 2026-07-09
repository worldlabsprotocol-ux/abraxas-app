"use client";
// FILE: components/passport/TransactionEligibilitySection.tsx
// Tier 3 — transaction-specific claims and sandbox partner demo gate.

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Btn } from "@/components/redesign/ui";
import { POLICY_DECISIONS, type PolicyDecision } from "@/lib/abraxasNetwork";
import { SANDBOX_DISCLAIMER } from "@/lib/credentials/sandboxClaims";
import { SANDBOX_POLICY_ID } from "@/lib/partner/sandboxPartner";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const SANDBOX_ACCENT = "#F59E0B";

interface EligibilityResponse {
  passport_tier: number;
  tier_label: string;
  transaction_eligibility: boolean;
  tier3_sandbox_demo?: boolean;
  tier3_claims: {
    claim_type: string;
    label: string;
    environment?: string;
    status?: string;
    expires_at?: string | null;
    issuer?: string;
  }[];
  sandbox_partner: {
    partner_id: string;
    company: string;
    policy_id: string;
    disclaimer: string;
    sandbox_only: boolean;
    decision: PolicyDecision;
    decision_context: string;
    production_usable: boolean;
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
  const [busy, setBusy] = useState<"screening" | "sandbox" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["passport", "transaction-eligibility"],
    queryFn: fetchEligibility,
    enabled,
    staleTime: 20_000,
  });

  if (!enabled) return null;

  async function applySandboxScreening() {
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

  async function startSandboxConsent() {
    setBusy("sandbox");
    setError(null);
    try {
      const res = await fetch("/api/passport/demo-partner-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: SANDBOX_POLICY_ID }),
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
              {data.transaction_eligibility ? " · Tier 3 active" : data.tier3_sandbox_demo ? " · sandbox demo" : data.passport_tier >= 2 ? " · Tier 2" : ""}
            </div>
            {data.tier3_claims.length > 0 ? (
              <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
                {data.tier3_claims.map(c => (
                  <li key={`${c.claim_type}-${c.environment ?? "prod"}`} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    {c.label}
                    {c.environment === "sandbox" && (
                      <span style={{ color: SANDBOX_ACCENT, fontWeight: 700 }}> · demo / sandbox</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
                No transaction-specific claims yet. Screening or partner attestations unlock Tier 3.
              </p>
            )}
          </div>

          {data.sandbox_partner && (
            <div style={{
              padding: "0.75rem 0.85rem", borderRadius: 10,
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.35)",
              marginBottom: "0.85rem",
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: SANDBOX_ACCENT, marginBottom: 6,
              }}>
                Sandbox demonstration
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: SANDBOX_ACCENT, marginBottom: 4 }}>
                {data.sandbox_partner.company}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 0.5rem" }}>
                {data.sandbox_partner.disclaimer || SANDBOX_DISCLAIMER}
              </p>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Policy: {data.sandbox_partner.policy_id} ·{" "}
                <span style={{ color: POLICY_DECISIONS[data.sandbox_partner.decision]?.color ?? "inherit", fontWeight: 700 }}>
                  {POLICY_DECISIONS[data.sandbox_partner.decision]?.label ?? data.sandbox_partner.decision}
                </span>
                {data.sandbox_partner.decision_context === "sandbox_only" && (
                  <span style={{ color: SANDBOX_ACCENT, fontWeight: 600 }}> · not production-usable</span>
                )}
              </div>
              {data.sandbox_partner.missing_claims.length > 0 && (
                <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
                  Missing: {data.sandbox_partner.missing_claims.join(", ").replace(/_/g, " ")}
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {data.sandbox_partner.missing_claims.includes("screening_outcome") && data.passport_tier >= 2 && (
                  <Btn size="sm" variant="secondary" loading={busy === "screening"} onClick={() => void applySandboxScreening()}>
                    Apply sandbox demo screening →
                  </Btn>
                )}
                <Btn size="sm" loading={busy === "sandbox"} onClick={() => void startSandboxConsent()}>
                  Sandbox consent flow →
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
