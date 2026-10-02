"use client";
// FILE: components/gtm/GtmProofPackContent.tsx
// Buyer-readable proof pack — reference and sandbox evidence with honest labels.

import Link from "next/link";
import { useEffect } from "react";
import { Btn } from "@/components/redesign/ui";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import type { GtmDiscoveryAnswers, ProofClassification } from "@/lib/gtm/contract";
import { GTM_PRIMARY_CTA_LABEL } from "@/lib/gtm/contract";
import { routeFromDiscovery } from "@/lib/gtm/routing";
import {
  GOOD_TROUBLE_PROOF_ROLE,
  INSTITUTIONAL_PROOF_ROLE,
  INSTITUTIONAL_REFERENCE_METRICS,
  INSTITUTIONAL_REFERENCE_STORY,
  PERSONA_MESSAGES,
  WHY_NOT_KYC_PROVIDER,
  WHY_NOT_STORE_OURSELVES,
  proofClassificationLabel,
} from "@/lib/gtm/proofPack";
import { recordGtmClientEvent } from "@/lib/gtm/clientTelemetry";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.86rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

const badge = (classification: ProofClassification) => ({
  display: "inline-block",
  fontFamily: FONT,
  fontSize: "0.68rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  padding: "0.25rem 0.55rem",
  borderRadius: 999,
  border: "1px solid rgba(45,212,191,0.35)",
  background: "rgba(45,212,191,0.1)",
  color: "#2DD4BF",
  marginBottom: "0.55rem",
});

export interface GtmProofPackContentProps {
  discovery: GtmDiscoveryAnswers | null;
  onRestartDiscovery?: () => void;
}

export function GtmProofPackContent({ discovery, onRestartDiscovery }: GtmProofPackContentProps) {
  const routing = routeFromDiscovery(discovery);

  useEffect(() => {
    void recordGtmClientEvent("proof_pack_viewed", {
      proof_pack: routing.proof_pack,
      recommended_path: routing.recommended_studio_href,
      environment: "reference",
      ...(discovery
        ? {
            industry_category: discovery.industry,
            app_count_band: discovery.app_count_band,
            has_kyc_vendor: discovery.has_kyc_vendor,
            primary_pain: discovery.primary_pain,
          }
        : {}),
    });
    void recordGtmClientEvent("reuse_demo_started", { proof_pack: routing.proof_pack });
    void recordGtmClientEvent("reuse_demo_completed", { proof_pack: routing.proof_pack });
  }, [discovery, routing.proof_pack, routing.recommended_studio_href]);

  return (
    <div style={{ display: "grid", gap: "1rem", textAlign: "left" }}>
      <ContentCard title={routing.headline}>
        <p style={body}>{routing.summary}</p>
        {routing.emphasize_keep_provider && (
          <p style={{ ...body, marginTop: "0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>
            Keep your existing KYC provider. Abraxas handles what happens after verification.
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "0.85rem" }}>
          <Btn href={routing.recommended_studio_href} size="lg">{GTM_PRIMARY_CTA_LABEL.replace("See ", "Try ")}</Btn>
          <Btn href="/integrate" variant="secondary" size="lg">Talk through your stack</Btn>
          {onRestartDiscovery ? (
            <Btn variant="ghost" size="sm" onClick={onRestartDiscovery}>
              Update answers
            </Btn>
          ) : null}
        </div>
      </ContentCard>

      {routing.show_institutional_reference && (
        <ContentCard title={INSTITUTIONAL_PROOF_ROLE.title}>
          <span style={badge(INSTITUTIONAL_PROOF_ROLE.classification)}>
            {proofClassificationLabel(INSTITUTIONAL_PROOF_ROLE.classification)}
          </span>
          <p style={body}>{INSTITUTIONAL_PROOF_ROLE.summary}</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
              gap: "0.55rem",
              margin: "0.85rem 0",
            }}
            aria-label="Reference harness metrics"
          >
            {[
              ["Provider verifications", INSTITUTIONAL_REFERENCE_METRICS.provider_verifications],
              ["Applications with results", INSTITUTIONAL_REFERENCE_METRICS.applications_receiving_results],
              ["Raw KYC recollections", INSTITUTIONAL_REFERENCE_METRICS.raw_kyc_recollections],
              ["Forbidden partner fields", INSTITUTIONAL_REFERENCE_METRICS.forbidden_fields_in_partner_payload],
              ["Operator actions after config", INSTITUTIONAL_REFERENCE_METRICS.operator_actions_after_trust_config],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={{
                  padding: "0.75rem",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface-inset)",
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)" }}>
                  {value}
                </div>
                <div style={{ ...body, fontSize: "0.72rem", marginTop: "0.25rem" }}>{label}</div>
              </div>
            ))}
          </div>
          <p style={{ ...body, fontSize: "0.78rem" }}>
            Post-revocation reuse: <strong style={{ color: "var(--text-primary)" }}>blocked</strong>.
            Application-facing identities: <strong style={{ color: "var(--text-primary)" }}>distinct per application</strong>.
          </p>
          <details style={{ marginTop: "0.75rem" }}>
            <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
              Reference story — question by question
            </summary>
            <dl style={{ margin: "0.75rem 0 0", display: "grid", gap: "0.65rem" }}>
              {INSTITUTIONAL_REFERENCE_STORY.map((beat) => (
                <div key={beat.id}>
                  <dt style={{ ...body, fontWeight: 800, color: "var(--text-primary)" }}>{beat.question}</dt>
                  <dd style={{ ...body, margin: "0.2rem 0 0" }}>{beat.answer}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p style={{ ...body, marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {INSTITUTIONAL_PROOF_ROLE.limits}
          </p>
          <Link href="/institutional" style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.82rem" }}>
            Inspect institutional diligence surfaces →
          </Link>
        </ContentCard>
      )}

      {routing.show_good_trouble && (
        <ContentCard title={GOOD_TROUBLE_PROOF_ROLE.title}>
          <span style={badge(GOOD_TROUBLE_PROOF_ROLE.classification)}>
            {proofClassificationLabel(GOOD_TROUBLE_PROOF_ROLE.classification)}
          </span>
          <p style={body}>{GOOD_TROUBLE_PROOF_ROLE.summary}</p>
          <p style={{ ...body, marginTop: "0.65rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {GOOD_TROUBLE_PROOF_ROLE.limits}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            <Btn href="/good-trouble" size="sm">Try Good Trouble sandbox</Btn>
            <Btn href="/pilot-journey" variant="ghost" size="sm">Watch production demo</Btn>
          </div>
        </ContentCard>
      )}

      <ContentCard title="Why Abraxas — without replacing your stack">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {WHY_NOT_KYC_PROVIDER.title}
            </h3>
            <p style={body}>{WHY_NOT_KYC_PROVIDER.body}</p>
          </div>
          <div>
            <h3 style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {WHY_NOT_STORE_OURSELVES.title}
            </h3>
            <p style={body}>{WHY_NOT_STORE_OURSELVES.body}</p>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="How different roles see the same proof">
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.45rem" }}>
          {Object.entries(PERSONA_MESSAGES).map(([role, message]) => (
            <li key={role} style={body}>
              <strong style={{ color: "var(--text-primary)", textTransform: "capitalize" }}>{role}:</strong> {message}
            </li>
          ))}
        </ul>
      </ContentCard>
    </div>
  );
}
