"use client";
// FILE: components/developers/IntegrationAdoptionReadinessPanel.tsx

import { useMemo, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  buildExternalNodePartnerEnvTemplate,
  detectIntegrationAdoptionGaps,
  INTEGRATION_ADOPTION_STEPS,
  isLocalReferenceCallbackUrl,
  LOCAL_REFERENCE_CALLBACK_URL,
  resolveIntegrationAdoptionFocus,
} from "@/lib/developers/integrationAdoptionPath";
import { integrationStudioStageHref } from "@/lib/developers/useIntegrationStudioStage";

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
  onRequestLocalReferenceCallback?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showContract, setShowContract] = useState(false);

  const blockers = useMemo(
    () =>
      detectIntegrationAdoptionGaps({
        hasSandboxApplication: Boolean(input.applicationId),
        callbackUrl: input.callbackUrl,
        apiKeyRevealedOnce: input.apiKeyRevealedOnce,
        completedFirstPartyWalletDemo: input.fromDeveloperWorkspace,
        completedPartnerHandoff: false,
      }).filter((g) => g.severity === "blocker"),
    [input],
  );

  const focus = useMemo(
    () =>
      resolveIntegrationAdoptionFocus({
        hasSandboxApplication: Boolean(input.applicationId),
        callbackUrl: input.callbackUrl,
        apiKeyRevealedOnce: input.apiKeyRevealedOnce,
        completedPartnerHandoff: false,
        completedIndependentVerify: false,
      }),
    [input],
  );

  const envTemplate = useMemo(() => {
    if (!input.applicationId || !input.partnerId || !input.policyId) return null;
    const callbackBase = isLocalReferenceCallbackUrl(input.callbackUrl)
      ? LOCAL_REFERENCE_CALLBACK_URL.replace(/\/callback\/?$/, "")
      : input.callbackUrl?.replace(/\/callback\/?$/, "") ?? undefined;
    return buildExternalNodePartnerEnvTemplate({
      baseUrl: input.baseUrl,
      applicationId: input.applicationId,
      partnerId: input.partnerId,
      policyId: input.policyId,
      callbackBaseUrl: callbackBase,
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

  const progressLabel = `${focus.stepIndex} of ${focus.totalSteps}`;

  return (
    <ContentCard title="Connect your application" id="adoption-readiness">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
        Integration step {progressLabel} · sandbox only
      </p>

      <p style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 650, margin: "0 0 0.35rem" }}>
        {focus.primaryLabel}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>{focus.detail}</p>

      {blockers.length > 0 && (
        <ul style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 0.85rem", paddingLeft: "1.1rem" }}>
          {blockers.map((gap) => (
            <li key={gap.id} style={{ marginBottom: "0.35rem", color: "var(--danger, #f87171)" }}>
              {gap.message}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {focus.primaryKind === "configure_callback" && input.onRequestLocalReferenceCallback ? (
          <Btn size="sm" variant="secondary" onClick={input.onRequestLocalReferenceCallback}>
            Use local reference server (127.0.0.1:3847)
          </Btn>
        ) : null}
        {focus.primaryKind === "copy_credentials" && envTemplate ? (
          <Btn size="sm" onClick={() => void copyEnv()}>
            {copied ? "Copied .env template" : "Copy server .env template"}
          </Btn>
        ) : null}
        {focus.primaryKind === "run_handoff" ? (
          <Btn href={integrationStudioStageHref("request")} size="sm">
            Open request workbench
          </Btn>
        ) : null}
        {focus.primaryKind === "verify_independently" ? (
          <Btn href="/verify" size="sm">
            Independent verification workbench
          </Btn>
        ) : null}
        {focus.primaryKind === "production_review" ? (
          <Btn href="/developers/launchpad" size="sm" variant="secondary">
            Launchpad production review
          </Btn>
        ) : null}
        <Btn href="/docs/VERIFY_WITH_ABRAXAS_QUICKSTART" size="sm" variant="ghost">
          Integration guide
        </Btn>
      </div>

      {isLocalReferenceCallbackUrl(input.callbackUrl) ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--warning, #f59e0b)", margin: "0 0 0.65rem" }}>
          Callback is set for the <strong>local reference server only</strong> ({LOCAL_REFERENCE_CALLBACK_URL}). Hosted
          or production applications must use their own HTTPS callback — this URL is not a production destination.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowContract((v) => !v)}
        style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "var(--text-muted)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        {showContract ? "Hide full integration contract" : "Show full integration contract (10 steps)"}
      </button>

      {showContract ? (
        <ol
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            lineHeight: 1.5,
            paddingLeft: "1.15rem",
            margin: "0.65rem 0 0",
          }}
        >
          {INTEGRATION_ADOPTION_STEPS.map((step) => (
            <li key={step.id} style={{ marginBottom: "0.45rem" }}>
              <strong>{step.title}.</strong> {step.integratorAction}
            </li>
          ))}
        </ol>
      ) : null}

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.65rem 0 0" }}>
        Reference server:{" "}
        <span style={{ fontFamily: MONO }}>cd examples/external-node-partner && npm install && npm start</span>
      </p>
    </ContentCard>
  );
}
