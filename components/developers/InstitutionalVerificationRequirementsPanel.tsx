"use client";
// FILE: components/developers/InstitutionalVerificationRequirementsPanel.tsx

import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { listInstitutionalVerificationRequirements } from "@/lib/partner/launchpad/institutionalVerificationRequirements";

const FONT = ABRAXAS_FONT_SANS;

export function InstitutionalVerificationRequirementsPanel(input: {
  selectedPolicyTemplateId: string | null;
  launchpadHref?: string;
  showAdvancedLink?: boolean;
  embedded?: boolean;
}) {
  const requirements = listInstitutionalVerificationRequirements({
    selectedPolicyTemplateId: input.selectedPolicyTemplateId,
  });
  const launchpadHref = input.launchpadHref ?? `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&step=verify`;

  const primary = requirements.filter((r) => r.availability === "selected" || r.availability === "selectable");
  const advanced = requirements.filter((r) => r.availability === "advanced_only" || r.availability === "unavailable");

  const body = (
    <>
      <div style={{ display: "grid", gap: "0.65rem" }}>
        {primary.map((req) => (
          <div
            key={req.id}
            style={{
              padding: "0.75rem 0.85rem",
              borderRadius: 12,
              border: req.availability === "selected" ? "1px solid rgba(45,212,191,0.45)" : "1px solid var(--border)",
              background: req.availability === "selected" ? "rgba(45,212,191,0.06)" : "var(--surface)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.35rem" }}>
              <strong style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-primary)" }}>{req.title}</strong>
              <span style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800, color: req.availability === "selected" ? "#10B981" : "var(--accent)" }}>
                {req.availability === "selected" ? "Selected" : "Available"}
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0.45rem 0 0", lineHeight: 1.55 }}>
              {req.purpose}
            </p>
            {req.policy_template_id && (
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.35rem 0 0" }}>
                Policy template: <code>{req.policy_template_id}</code>
              </p>
            )}
            {req.sandbox_notice && (
              <details style={{ marginTop: "0.45rem" }}>
                <summary style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", color: "var(--text-muted)" }}>
                  Sandbox scope
                </summary>
                <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                  {req.sandbox_notice}
                </p>
              </details>
            )}
            {req.availability === "selectable" && (
              <Btn href={launchpadHref} size="sm" style={{ marginTop: "0.65rem" }}>
                Select
              </Btn>
            )}
          </div>
        ))}
      </div>

      {input.showAdvancedLink !== false && advanced.length > 0 && (
        <details style={{ marginTop: "0.85rem" }}>
          <summary style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, cursor: "pointer", color: "var(--text-primary)" }}>
            Other requirements
          </summary>
          <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.65rem" }}>
            {advanced.map((req) => (
              <div key={req.id} style={{ padding: "0.65rem 0.75rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-inset)" }}>
                <strong style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-primary)" }}>{req.title}</strong>
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                  {req.purpose}
                </p>
                {req.unavailable_reason && (
                  <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                    {req.unavailable_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );

  if (input.embedded) {
    return body;
  }

  return (
    <ContentCard title="Choose verification">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
        Pick what this application must verify. Unsupported options stay disabled.
      </p>
      {body}
    </ContentCard>
  );
}
