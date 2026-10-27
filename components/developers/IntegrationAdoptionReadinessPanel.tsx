"use client";
// FILE: components/developers/IntegrationAdoptionReadinessPanel.tsx

import { useMemo, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  buildExternalNodePartnerEnvTemplate,
  detectIntegrationAdoptionGaps,
  EXTERNAL_NODE_PARTNER_REFERENCE,
  INTEGRATION_ADOPTION_STEPS,
} from "@/lib/developers/integrationAdoptionPath";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function IntegrationAdoptionReadinessPanel(input: {
  baseUrl: string;
  applicationId: string | null;
  partnerId: string | null;
  policyId: string | null;
  callbackUrl: string | null;
  apiKeyRevealedOnce: boolean;
  fromDeveloperWorkspace: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const gaps = useMemo(
    () =>
      detectIntegrationAdoptionGaps({
        hasSandboxApplication: Boolean(input.applicationId),
        callbackUrl: input.callbackUrl,
        apiKeyRevealedOnce: input.apiKeyRevealedOnce,
        completedFirstPartyWalletDemo: input.fromDeveloperWorkspace,
        completedPartnerHandoff: false,
      }),
    [input],
  );

  const envTemplate = useMemo(() => {
    if (!input.applicationId || !input.partnerId || !input.policyId) return null;
    return buildExternalNodePartnerEnvTemplate({
      baseUrl: input.baseUrl,
      applicationId: input.applicationId,
      partnerId: input.partnerId,
      policyId: input.policyId,
      callbackBaseUrl: input.callbackUrl?.replace(/\/callback\/?$/, "") ?? undefined,
    });
  }, [input]);

  async function copyEnv() {
    if (!envTemplate) return;
    try {
      await navigator.clipboard.writeText(envTemplate);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <ContentCard title="External application integration" id="adoption-readiness">
      <p style={{ fontFamily: FONT, fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
        Your sandbox issues signed receipts for <strong>your application</strong> to request and verify — not the
        same as completing the Developer Workspace wallet demonstration alone.
      </p>

      {gaps.length > 0 && (
        <ul style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 1rem", paddingLeft: "1.1rem" }}>
          {gaps.map((gap) => (
            <li key={gap.id} style={{ marginBottom: "0.35rem", color: gap.severity === "blocker" ? "var(--danger, #f87171)" : "var(--text-secondary)" }}>
              <strong>{gap.severity === "blocker" ? "Blocker" : "Note"}:</strong> {gap.message} {gap.remediation}
            </li>
          ))}
        </ul>
      )}

      <ol style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, paddingLeft: "1.15rem", margin: "0 0 1rem" }}>
        {INTEGRATION_ADOPTION_STEPS.map((step) => (
          <li key={step.id} style={{ marginBottom: "0.5rem" }}>
            <strong>{step.title}.</strong> {step.integratorAction}
            <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {step.referenceHint}
            </div>
          </li>
        ))}
      </ol>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <Btn
          size="sm"
          variant="secondary"
          disabled={!envTemplate}
          onClick={() => void copyEnv()}
        >
          {copied ? "Copied .env template" : "Copy reference .env template"}
        </Btn>
        <Btn href="/docs/VERIFY_WITH_ABRAXAS_QUICKSTART#external-node-partner" size="sm" variant="ghost">
          Reference integration guide
        </Btn>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.65rem 0 0" }}>
        Reference callback:{" "}
        <span style={{ fontFamily: MONO }}>
          {EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase}
          {EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackPath}
        </span>
        {" · "}
        Run locally: <span style={{ fontFamily: MONO }}>cd examples/external-node-partner && npm install && npm start</span>
      </p>
    </ContentCard>
  );
}
