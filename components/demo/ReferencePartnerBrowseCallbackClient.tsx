"use client";
// FILE: components/demo/ReferencePartnerBrowseCallbackClient.tsx
// DEMO reference-partner browse callback — validates L0 browse receipt only.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#38BDF8";

interface VerifyResult {
  verified?: boolean;
  valid_for_purchase?: boolean;
  assurance_level?: string;
  purpose?: string;
  age_band?: string;
  expires_at?: string;
  code?: string;
}

export function ReferencePartnerBrowseCallbackClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Waiting for browse receipt…");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const browseReceipt = searchParams.get("browse_receipt");
  const browseReceiptId = searchParams.get("browse_receipt_id");
  const policyId = searchParams.get("policy_id") ?? GOOD_TROUBLE_BROWSE_POLICY_ID;

  const verify = useCallback(async () => {
    if (!browseReceipt) {
      setError("Missing browse_receipt in callback URL.");
      setStatus("No browse receipt received.");
      return;
    }

    setStatus("Verifying signed browse receipt…");
    const res = await fetch("/api/age-assurance/browse-receipt/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        browse_receipt: browseReceipt,
        partner_id: GOOD_TROUBLE_PARTNER_ID,
        policy_id: policyId,
      }),
    });
    const data = await res.json() as VerifyResult & { error?: string };
    if (!res.ok || !data.verified) {
      throw new Error(data.code ?? data.error ?? "Browse receipt verification failed");
    }
    if (data.valid_for_purchase !== false) {
      throw new Error("Browse receipt incorrectly marked valid for purchase");
    }

    setResult(data);
    setStatus("Browse access verified. Not valid for regulated retail purchase.");
  }, [browseReceipt, policyId]);

  useEffect(() => {
    void verify().catch((e) => setError(e instanceof Error ? e.message : "Verification failed"));
  }, [verify]);

  return (
    <div style={{
      maxWidth: 560,
      margin: "3rem auto",
      padding: "1.5rem",
      fontFamily: FONT,
      color: "var(--text-primary)",
      background: "var(--surface-raised)",
      borderRadius: 16,
      border: `1px solid ${result?.verified ? ACCENT : "var(--border-strong)"}`,
    }}>
      <div style={{ fontSize: "0.7rem", color: ACCENT, letterSpacing: "0.1em", marginBottom: 8 }}>
        DEMO · REFERENCE PARTNER · BROWSE CALLBACK
      </div>
      <h1 style={{ fontSize: "1.15rem", margin: "0 0 0.75rem", fontWeight: 800 }}>
        {result?.verified ? "Browse receipt accepted" : "Validating browse receipt"}
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {status}
      </p>
      {error && (
        <p style={{ fontSize: "0.82rem", color: "#EF4444", marginTop: "0.5rem" }}>{error}</p>
      )}
      {result?.verified && (
        <div style={{ marginTop: "1.25rem" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            This L0 self-attestation unlocks catalog browse only. It cannot authorize a regulated retail purchase.
          </p>
          <pre style={{
            marginTop: "1rem",
            fontSize: "0.62rem",
            padding: "0.75rem",
            background: "var(--surface)",
            borderRadius: 8,
            overflow: "auto",
            color: "var(--text-muted)",
          }}>
            {JSON.stringify({
              browse_receipt_id: browseReceiptId,
              partner_id: GOOD_TROUBLE_PARTNER_ID,
              policy_id: policyId,
              purpose: result.purpose,
              assurance_level: result.assurance_level,
              valid_for_purchase: result.valid_for_purchase,
              age_band: result.age_band,
              expires_at: result.expires_at,
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
