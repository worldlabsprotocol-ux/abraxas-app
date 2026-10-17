"use client";
// FILE: components/developers/InstitutionalVerificationRequirementsPanel.tsx

import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  ABRAXAS_CHOOSE_VERIFICATION_HEADING,
  ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_SUMMARY,
  ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_TITLE,
} from "@/lib/product/abraxasIdentityExperienceCopy";
import { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { listInstitutionalVerificationRequirements } from "@/lib/partner/launchpad/institutionalVerificationRequirements";

const FONT = ABRAXAS_FONT_SANS;

export function InstitutionalVerificationRequirementsPanel(input: {
  selectedPolicyTemplateId: string | null;
  launchpadHref?: string;
  showAdvancedLink?: boolean;
  embedded?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}) {
  const requirements = listInstitutionalVerificationRequirements({
    selectedPolicyTemplateId: input.selectedPolicyTemplateId,
  });
  const launchpadHref = input.launchpadHref ?? `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&step=verify`;

  const primaryRequirement = requirements.find((r) => r.id === "organization_protocol_access_sandbox");
  const isSelected = primaryRequirement?.availability === "selected";
  const advanced = requirements.filter(
    (r) => r.id !== "organization_protocol_access_sandbox"
      && (r.availability === "advanced_only" || r.availability === "unavailable"),
  );

  const body = (
    <>
      <div
        style={{
          padding: "0.85rem 1rem",
          borderRadius: 12,
          border: isSelected ? "1px solid rgba(45,212,191,0.45)" : "1px solid var(--border)",
          background: isSelected ? "rgba(45,212,191,0.06)" : "var(--surface)",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.06em", color: "var(--text-muted)", margin: 0 }}>
          {ABRAXAS_CHOOSE_VERIFICATION_HEADING}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", margin: "0.35rem 0 0.25rem" }}>
          {primaryRequirement?.title ?? ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_TITLE}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
          {primaryRequirement?.purpose ?? ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_SUMMARY}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: isSelected ? "#10B981" : "var(--accent)", margin: "0 0 0.75rem" }}>
          Status: {isSelected ? "Selected" : "Available"}
        </p>
        {isSelected ? (
          input.onContinue ? (
            <Btn size="sm" onClick={input.onContinue} disabled={input.continueDisabled}>
              {input.continueLabel ?? "Continue"}
            </Btn>
          ) : (
            <Btn href={launchpadHref} size="sm">
              {input.continueLabel ?? "Continue"}
            </Btn>
          )
        ) : (
          <Btn href={launchpadHref} size="sm">
            Select
          </Btn>
        )}
      </div>

      <details style={{ marginTop: "0.85rem" }}>
        <summary style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, cursor: "pointer", color: "var(--text-primary)" }}>
          Technical details
        </summary>
        <div style={{ marginTop: "0.65rem", display: "grid", gap: "0.55rem" }}>
          {primaryRequirement?.policy_template_id && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
              Policy template: <code>{primaryRequirement.policy_template_id}</code>
            </p>
          )}
          {primaryRequirement?.technical_summary && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
              {primaryRequirement.technical_summary}
            </p>
          )}
          {primaryRequirement?.sandbox_notice && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
              {primaryRequirement.sandbox_notice}
            </p>
          )}
          {input.showAdvancedLink !== false && advanced.length > 0 && (
            <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.25rem" }}>
              <p style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Other verification capabilities
              </p>
              {advanced.map((req) => (
                <div key={req.id} style={{ padding: "0.55rem 0.65rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-inset)" }}>
                  <strong style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-primary)" }}>{req.title}</strong>
                  <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
                    {req.purpose}
                  </p>
                  {req.unavailable_reason && (
                    <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
                      {req.unavailable_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </>
  );

  if (input.embedded) {
    return body;
  }

  return (
    <ContentCard title={ABRAXAS_CHOOSE_VERIFICATION_HEADING}>
      {body}
    </ContentCard>
  );
}
