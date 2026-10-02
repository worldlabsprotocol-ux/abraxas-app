"use client";
// FILE: components/home/HomeTwoAppReferenceProof.tsx
// Compact institutional reference proof for homepage buyers.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  HOME_PRIMARY_CTA,
  HOME_PRIMARY_CTA_HREF,
  HOME_TWO_APP_PROOF_BODY,
  HOME_TWO_APP_PROOF_HEADLINE,
} from "@/lib/gtm/homeCopy";
import {
  INSTITUTIONAL_REFERENCE_METRICS,
  INSTITUTIONAL_PROOF_ROLE,
  proofClassificationLabel,
} from "@/lib/gtm/proofPack";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const metrics = [
  ["Provider verifications", INSTITUTIONAL_REFERENCE_METRICS.provider_verifications],
  ["Apps with verified results", INSTITUTIONAL_REFERENCE_METRICS.applications_receiving_results],
  ["Raw KYC recollections", INSTITUTIONAL_REFERENCE_METRICS.raw_kyc_recollections],
  ["Forbidden partner fields", INSTITUTIONAL_REFERENCE_METRICS.forbidden_fields_in_partner_payload],
] as const;

export function HomeTwoAppReferenceProof() {
  return (
    <section
      aria-labelledby="home-two-app-proof-heading"
      className="abx-home-section-center abx-home-two-app-proof"
      style={{ width: "100%", maxWidth: 760, textAlign: "left" }}
    >
      <p
        style={{
          margin: "0 0 0.45rem",
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#2DD4BF",
        }}
      >
        {proofClassificationLabel(INSTITUTIONAL_PROOF_ROLE.classification)}
      </p>
      <h2
        id="home-two-app-proof-heading"
        style={{
          margin: "0 0 0.55rem",
          fontFamily: FONT,
          fontSize: "clamp(1.05rem, 2.6vw, 1.3rem)",
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {HOME_TWO_APP_PROOF_HEADLINE}
      </h2>
      <p
        style={{
          margin: "0 0 0.85rem",
          fontFamily: FONT,
          fontSize: "0.88rem",
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
      >
        {HOME_TWO_APP_PROOF_BODY}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
          gap: "0.55rem",
          marginBottom: "0.85rem",
        }}
        aria-label="Reference harness metrics"
      >
        {metrics.map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: "0.75rem",
              borderRadius: 12,
              border: "1px solid rgba(45,212,191,0.22)",
              background: "rgba(45,212,191,0.05)",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: "1.05rem", fontWeight: 800, color: "var(--accent)" }}>
              {value}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <p style={{ margin: "0 0 0.85rem", fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
        Reference harness only — not a live production institutional deployment. Post-revocation reuse blocked.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", justifyContent: "center" }}>
        <Btn href={HOME_PRIMARY_CTA_HREF} size="lg">{HOME_PRIMARY_CTA}</Btn>
        <Link href="/institutional" style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center" }}>
          Technical diligence →
        </Link>
      </div>
    </section>
  );
}
