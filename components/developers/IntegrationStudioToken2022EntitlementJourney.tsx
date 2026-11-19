"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { Token2022StudioJourneyPayload } from "@/lib/partner/integrationStudio/token2022Entitlement/studioJourney.server";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type StepId = "choose" | "verify" | "receive" | "use" | "independent";

const STEPS: { id: StepId; title: string; lead: string }[] = [
  {
    id: "choose",
    title: "Choose what to protect",
    lead: "Choose the action that should require verified permission.",
  },
  {
    id: "verify",
    title: "Verify the proof",
    lead: "Check that the permission was issued correctly and is still valid.",
  },
  {
    id: "receive",
    title: "Receive the entitlement",
    lead: "Issue a non-transferable token that represents this verified permission.",
  },
  {
    id: "use",
    title: "Use the entitlement",
    lead: "Ask another program to check this permission before allowing the action.",
  },
  {
    id: "independent",
    title: "Verify independently",
    lead: "Confirm the result without trusting the Abraxas website.",
  },
];

export function IntegrationStudioToken2022EntitlementJourney({
  applicationId,
  signedIn,
  policyId,
  proofReceiptId,
  proofVerified,
  onRunProofTest,
  proofBusy,
  proofError,
}: {
  applicationId: string | null;
  signedIn: boolean;
  policyId: string | null;
  proofReceiptId: string | null;
  proofVerified: boolean;
  onRunProofTest: () => void;
  proofBusy: boolean;
  proofError: string;
}) {
  const [activeStep, setActiveStep] = useState<StepId>("choose");
  const [journey, setJourney] = useState<Token2022StudioJourneyPayload | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [structuralBusy, setStructuralBusy] = useState(false);

  const loadJourney = useCallback(
    async (phase: "capabilities" | "independent_handoff", runStructural = false) => {
      if (!applicationId || !signedIn) return;
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetch(`/api/launchpad/applications/${applicationId}/token2022-entitlement-journey`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            phase,
            run_structural_verify: runStructural,
            client_policy_id: policyId ?? undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as Token2022StudioJourneyPayload & {
          code?: string;
          recovery?: { headline: string; detail: string };
        };
        if (!res.ok || !data.ok) {
          setLoadError(data.recovery?.detail ?? data.code ?? "journey_unavailable");
          return;
        }
        setJourney(data);
      } catch {
        setLoadError("Could not load entitlement journey capabilities.");
      } finally {
        setLoading(false);
        setStructuralBusy(false);
      }
    },
    [applicationId, policyId, signedIn],
  );

  useEffect(() => {
    void loadJourney("capabilities");
  }, [loadJourney]);

  const env = journey?.environment;
  const reference = journey?.local_reference;
  const tiers = journey?.verification_tiers;

  return (
    <ContentCard title="Receipt-backed Token-2022 entitlement" id="token2022-entitlement-journey">
      <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: 0, lineHeight: 1.6 }}>
        One progressive workspace. Abraxas binds trusted partner, policy, and application on the server — the browser cannot override them.
      </p>
      {env ? (
        <p
          style={{
            fontFamily: MONO,
            fontSize: "0.66rem",
            padding: "0.55rem 0.65rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
            margin: "0 0 1rem",
          }}
        >
          Environment: <strong>{env.label}</strong> · mint/consume actionable:{" "}
          {env.mint_and_consume_actionable ? "yes" : "no"} · {env.detail}
        </p>
      ) : null}
      {loadError ? (
        <p role="alert" style={{ color: "var(--danger, #f87171)", fontFamily: FONT, fontSize: "0.78rem" }}>
          {loadError}
        </p>
      ) : null}
      <div className="abx-builder-choice-list" style={{ marginBottom: "1rem" }}>
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            aria-pressed={activeStep === step.id}
            onClick={() => setActiveStep(step.id)}
            style={{ textAlign: "left" }}
          >
            <strong>
              {index + 1}. {step.title}
            </strong>
            <span>{step.lead}</span>
          </button>
        ))}
      </div>

      {activeStep === "choose" && journey ? (
        <div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Trusted scope comes from your Launchpad application record only.
          </p>
          <ul style={{ fontFamily: MONO, fontSize: "0.64rem", lineHeight: 1.55 }}>
            <li>application_id: {journey.trusted_scope.application_id}</li>
            <li>partner_id: {journey.trusted_scope.partner_id}</li>
            <li>policy_id: {journey.trusted_scope.policy_id}</li>
            <li>policy_version: {journey.trusted_scope.policy_version}</li>
          </ul>
          <Btn size="sm" onClick={() => setActiveStep("verify")}>
            Continue to proof verification
          </Btn>
        </div>
      ) : null}

      {activeStep === "verify" ? (
        <div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Reuse the standard sandbox harness to obtain a currently valid receipt before entitlement steps.
          </p>
          {proofReceiptId ? (
            <p style={{ fontFamily: MONO, fontSize: "0.64rem" }}>receipt_id: {proofReceiptId}</p>
          ) : null}
          {proofError ? (
            <p style={{ color: "var(--danger, #f87171)", fontSize: "0.78rem" }}>{proofError}</p>
          ) : null}
          <Btn size="sm" disabled={proofBusy || !applicationId || !signedIn} loading={proofBusy} onClick={onRunProofTest}>
            {proofVerified ? "Re-run proof test" : "Run proof verification test"}
          </Btn>
          {proofVerified ? (
            <Btn size="sm" variant="secondary" style={{ marginLeft: "0.5rem" }} onClick={() => setActiveStep("receive")}>
              Continue
            </Btn>
          ) : null}
        </div>
      ) : null}

      {activeStep === "receive" && reference ? (
        <div>
          {env?.mint_and_consume_actionable ? (
            <p style={{ fontFamily: FONT, fontSize: "0.78rem" }}>Wallet signing will be required for minting.</p>
          ) : (
            <p role="status" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--warning, #f59e0b)" }}>
              Live mint is unavailable in this environment. Review the executed ProgramTest reference below — this is not
              presented as your wallet&apos;s live transaction.
            </p>
          )}
          <ul style={{ fontFamily: FONT, fontSize: "0.72rem", paddingLeft: "1.1rem" }}>
            {reference.stages
              .filter((s) => s.stage === "mint_verified_entitlement")
              .map((s) => (
                <li key={s.stage}>
                  {s.notes ?? s.stage} ({s.outcome})
                </li>
              ))}
          </ul>
          <details>
            <summary style={{ cursor: "pointer", fontSize: "0.74rem", fontWeight: 700 }}>Technical · mint accounts</summary>
            <p style={{ fontFamily: MONO, fontSize: "0.62rem" }}>
              mint: {reference.entitlement_mint} · commitment: {reference.commitment}
            </p>
          </details>
          <Btn size="sm" onClick={() => setActiveStep("use")}>
            Continue
          </Btn>
        </div>
      ) : null}

      {activeStep === "use" && reference ? (
        <div>
          {env?.mint_and_consume_actionable ? (
            <p style={{ fontFamily: FONT, fontSize: "0.78rem" }}>Consumer execution uses your trusted relying-party configuration.</p>
          ) : (
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Consumption record from ProgramTest reference (labeled local evidence).
            </p>
          )}
          <p style={{ fontFamily: MONO, fontSize: "0.62rem" }}>
            trusted_config: {reference.trusted_config}
            <br />
            consumption: {reference.consumption_account ?? "n/a"} · recorded:{" "}
            {reference.consumption_recorded ? "yes" : "no"}
          </p>
          <Btn size="sm" onClick={() => setActiveStep("independent")}>
            Continue to independent verification
          </Btn>
        </div>
      ) : null}

      {activeStep === "independent" && tiers && journey ? (
        <div>
          <ol style={{ fontFamily: FONT, fontSize: "0.74rem", paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
            <li>
              <strong>Execution report</strong> — {tiers.execution_report.disclaimer}
            </li>
            <li>
              <strong>Structural / semantic</strong> — {tiers.structural_semantic.disclaimer}
            </li>
            <li>
              <strong>Authenticated chain</strong> — {tiers.authenticated_chain.disclaimer}
            </li>
          </ol>
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", whiteSpace: "pre-wrap" }}>
            {journey.independent_handoff.cli_instructions}
          </p>
          {journey.structural_verification_runtime?.ok ? (
            <pre
              style={{
                fontFamily: MONO,
                fontSize: "0.58rem",
                maxHeight: 160,
                overflow: "auto",
                padding: "0.65rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              {journey.structural_verification_runtime.excerpt}
            </pre>
          ) : null}
          <Btn
            size="sm"
            disabled={structuralBusy || loading}
            loading={structuralBusy || loading}
            onClick={() => {
              setStructuralBusy(true);
              void loadJourney("independent_handoff", true);
            }}
          >
            Run structural check (server, when available)
          </Btn>
        </div>
      ) : null}
    </ContentCard>
  );
}