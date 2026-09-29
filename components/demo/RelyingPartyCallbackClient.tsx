"use client";
// FILE: components/demo/RelyingPartyCallbackClient.tsx

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Btn } from "@/components/redesign/ui";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { PrivacyMinimizationComparison } from "@/components/demo/PrivacyMinimizationComparison";
import { RelyingPartyProgressSteps } from "@/components/demo/RelyingPartyProgressSteps";
import { RelyingPartyReceiptInspector } from "@/components/demo/RelyingPartyReceiptInspector";
import {
  RELYING_PARTY_PILOT_DEMO_PATH,
  RELYING_PARTY_PILOT_PURPOSE,
  RELYING_PARTY_PILOT_VERIFY_API,
  type RelyingPartyPilotSlot,
} from "@/lib/demo/relyingPartyPilot/contract";
import type { PilotVerificationResult } from "@/lib/demo/relyingPartyPilot/types";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

const STORAGE_KEY = "abraxas.relying-party-pilot.merchant";

export function RelyingPartyCallbackClient() {
  const searchParams = useSearchParams();
  const slot = (searchParams.get("slot") === "b" ? "b" : "a") as RelyingPartyPilotSlot;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verification, setVerification] = useState<PilotVerificationResult | null>(null);
  const [merchantMeta, setMerchantMeta] = useState<{ display_name: string; partner_id: string; policy_id: string } | null>(null);

  const callbackParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        let override: Record<string, unknown> = {};
        try {
          const raw = sessionStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            if (parsed.slot === slot) override = parsed;
          }
        } catch {
          // ignore
        }

        const res = await fetch(RELYING_PARTY_PILOT_VERIFY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot,
            receipt_id: searchParams.get("receipt_id"),
            allow_sandbox: true,
            search_params: callbackParams,
            ...override,
          }),
        });
        const data = await res.json() as PilotVerificationResult & {
          merchant?: { display_name: string; partner_id: string; policy_id: string };
          error?: string;
        };
        if (!res.ok && !data.checks) {
          throw new Error(data.error ?? "Verification failed");
        }
        setVerification({
          allowed: data.allowed,
          outcome: data.outcome,
          reason_codes: data.reason_codes ?? [],
          checks: data.checks ?? [],
          receipt: data.receipt ?? null,
          partner_visible: data.partner_visible ?? null,
          cryptographically_verified: data.cryptographically_verified ?? false,
        });
        if (data.merchant) setMerchantMeta(data.merchant);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Verification failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [callbackParams, searchParams, slot]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <ContentCard title={`Partner ${slot.toUpperCase()} callback · server verification`}>
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          This page does not trust callback query parameters alone. It re-fetches the public receipt and verifies signature, partner, policy, freshness, and decision state.
        </p>
        {loading && <p style={body}>Verifying signed receipt…</p>}
        {error && <p style={{ ...body, color: "var(--danger, #f87171)" }}>{error}</p>}
        {!loading && verification && (
          <>
            <p style={{ ...body, marginBottom: "0.75rem", fontWeight: 800, color: verification.allowed ? "var(--accent)" : "var(--text-primary)" }}>
              Access decision: {verification.allowed ? "PERMIT" : "DENY"}
            </p>
            <RelyingPartyReceiptInspector
              verification={verification}
              partnerName={merchantMeta?.display_name ?? `Partner ${slot.toUpperCase()}`}
              purpose={RELYING_PARTY_PILOT_PURPOSE}
            />
          </>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href={RELYING_PARTY_PILOT_DEMO_PATH} variant="secondary">Back to pilot demo</Btn>
          {slot === "a" && (
            <Btn href={`${RELYING_PARTY_PILOT_DEMO_PATH}?slot=b`}>Try Partner B (reuse path)</Btn>
          )}
          {verification?.receipt?.receipt_id && (
            <Btn
              href={`/verify?mode=receipt&receipt_id=${encodeURIComponent(verification.receipt.receipt_id)}&partner_id=${encodeURIComponent(merchantMeta?.partner_id ?? "")}&policy_id=${encodeURIComponent(merchantMeta?.policy_id ?? "")}&allow_sandbox=1`}
              variant="secondary"
            >
              Open receipt inspector
            </Btn>
          )}
        </div>
      </ContentCard>

      <ContentCard title="Demo progress">
        <RelyingPartyProgressSteps activeStep={loading ? "partner_verify" : "decision"} />
      </ContentCard>

      <ContentCard title="What the relying partner received">
        <PrivacyMinimizationComparison sampleResult={verification?.partner_visible ?? { age_eligible_21: false }} />
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Inspect the public receipt JSON separately at{" "}
          <Link href="/docs/partner-flow" style={{ color: "var(--accent)", fontWeight: 700 }}>/docs/partner-flow</Link>.
          DOB, ID images, Passport contents, and wallet history are withheld by the selective-disclosure profile for <code>age_21_retail</code>.
        </p>
      </ContentCard>
    </div>
  );
}
