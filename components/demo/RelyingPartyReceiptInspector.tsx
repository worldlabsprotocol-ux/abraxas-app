"use client";
// FILE: components/demo/RelyingPartyReceiptInspector.tsx

import Link from "next/link";
import { buildReceiptInspectorFields } from "@/lib/demo/relyingPartyPilot/receiptInspector";
import type { PilotVerificationResult } from "@/lib/demo/relyingPartyPilot/types";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function RelyingPartyReceiptInspector(input: {
  verification: PilotVerificationResult;
  partnerName: string;
  purpose: string;
}) {
  const fields = buildReceiptInspectorFields({
    verification: input.verification,
    partner_name: input.partnerName,
    purpose: input.purpose,
  });

  return (
    <div style={{ display: "grid", gap: "0.65rem" }}>
      <div style={{
        padding: "0.85rem 1rem",
        borderRadius: 12,
        border: `1px solid ${input.verification.allowed ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
        background: input.verification.allowed ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
      }}
      >
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
          {input.verification.cryptographically_verified
            ? "Cryptographically verified Abraxas receipt"
            : "Receipt verification failed"}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
          Partner decision: {input.verification.allowed ? "permit" : "deny"} ({input.verification.outcome})
        </p>
      </div>

      <div style={{ display: "grid", gap: "0.35rem" }}>
        {fields.map((field) => (
          <div key={field.label} style={{
            display: "grid",
            gridTemplateColumns: "minmax(120px, 34%) 1fr",
            gap: "0.65rem",
            padding: "0.5rem 0.65rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
          >
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>{field.label}</span>
            <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-primary)", wordBreak: "break-word" }}>{field.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: "0.35rem" }}>
        {input.verification.checks.map((check) => (
          <div key={check.id} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "0.55rem",
            padding: "0.45rem 0.6rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
          >
            <span style={{ color: check.pass ? "#10B981" : "#EF4444", fontWeight: 800 }}>{check.pass ? "✓" : "○"}</span>
            <div>
              <div style={{ fontFamily: MONO, fontSize: "0.66rem", color: "var(--text-primary)" }}>{check.label}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)" }}>{check.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {input.verification.receipt?.receipt_id && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0 }}>
          Public receipt endpoint:{" "}
          <Link href={`/api/receipts/${encodeURIComponent(input.verification.receipt.receipt_id)}/public`} style={{ color: "var(--accent)", fontWeight: 700 }}>
            /api/receipts/{input.verification.receipt.receipt_id}/public
          </Link>
        </p>
      )}
    </div>
  );
}
