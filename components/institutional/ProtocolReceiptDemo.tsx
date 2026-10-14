"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ReceiptInspector } from "@/components/design/ReceiptInspector";
import { V2_SIMULATION_LABEL } from "@/lib/home/v2HomeCopy";
import {
  deriveReceiptDemoState,
  RECEIPT_DEMO_ISSUER,
  RECEIPT_DEMO_POLICY_ID,
  type ReceiptScenario,
} from "@/lib/home/receiptVerificationDemoModel";

type DemoStep = "request" | "evaluate" | "receipt" | "verify";

const SCENARIOS: { id: ReceiptScenario; label: string }[] = [
  { id: "valid", label: "Valid" },
  { id: "expired", label: "Expired" },
  { id: "revoked", label: "Revoked" },
  { id: "unavailable", label: "Unavailable" },
];

const STEPS: { id: DemoStep; label: string }[] = [
  { id: "request", label: "Eligibility request" },
  { id: "evaluate", label: "Evidence evaluation" },
  { id: "receipt", label: "Signed receipt" },
  { id: "verify", label: "Independent verification" },
];

export function ProtocolReceiptDemo() {
  const [step, setStep] = useState<DemoStep>("receipt");
  const [scenario, setScenario] = useState<ReceiptScenario>("valid");
  const [animating, setAnimating] = useState(false);

  const runLifecycle = useCallback(() => {
    setAnimating(true);
    setScenario("valid");
    setStep("request");
    const order: DemoStep[] = ["request", "evaluate", "receipt", "verify"];
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= order.length) {
        setAnimating(false);
        return;
      }
      setStep(order[i]);
      window.setTimeout(tick, 520);
    };
    window.setTimeout(tick, 520);
  }, []);

  const demoState = useMemo(() => deriveReceiptDemoState(scenario), [scenario]);
  const {
    signatureValid,
    validityWindowOk,
    revocationClear,
    verifierReachable,
    currentlyAuthorized,
    outcome,
  } = demoState;

  const fields = useMemo(
    () => [
      { label: "Policy identifier", value: RECEIPT_DEMO_POLICY_ID, mono: true },
      { label: "Assurance level", value: "L2, document-backed age" },
      { label: "Result", value: outcome },
      {
        label: "Expiration",
        value:
          scenario === "expired"
            ? "2024-01-01T00:00:00Z (expired — simulated)"
            : scenario === "valid"
              ? "2026-11-01T00:00:00Z"
              : "N/A",
      },
      { label: "Issuer", value: RECEIPT_DEMO_ISSUER, mono: true },
      {
        label: "Signature validity",
        value:
          scenario === "unavailable"
            ? "Unknown — not evaluated (simulated outage)"
            : signatureValid
              ? "Valid (Ed25519)"
              : "Failed (simulated)",
      },
      {
        label: "Verification source",
        value:
          scenario === "revoked"
            ? "Revocation signal observed (simulated)"
            : scenario === "unavailable"
              ? "Verifier unreachable (simulated)"
              : scenario === "expired"
                ? "Expired — deny despite valid signature (simulated)"
                : "Independent verify API (simulated)",
        mono: true,
      },
    ],
    [outcome, scenario, signatureValid],
  );

  return (
    <div className="abx-protocol-demo">
      <div className="abx-protocol-demo__scenarios" role="tablist" aria-label="Receipt verification scenarios">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={scenario === s.id}
            className={`abx-protocol-demo__scenario${scenario === s.id ? " abx-protocol-demo__scenario--active" : ""}`}
            onClick={() => setScenario(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="abx-protocol-demo__rail" role="tablist" aria-label="Protocol lifecycle">
        {STEPS.map((s) => {
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`abx-protocol-demo__step${active ? " abx-protocol-demo__step--active" : ""}`}
              onClick={() => !animating && setStep(s.id)}
              disabled={animating}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="abx-protocol-demo__stage" aria-live="polite">
        {step === "request" && (
          <Panel title="Policy-specific request">
            <MonoBlock>{`POST /partner/v1/eligibility/evaluate
policy_id: ${RECEIPT_DEMO_POLICY_ID}
claims: [age_at_least_21]
holder_consent: approved`}</MonoBlock>
          </Panel>
        )}
        {step === "evaluate" && (
          <Panel title="Evidence evaluation">
            <p className="abx-protocol-demo__copy">
              Engine checks issuer trust, assurance level, and claim freshness. Underlying document bytes are not returned
              to the partner.
            </p>
          </Panel>
        )}
        {(step === "receipt" || step === "verify") && (
          <ReceiptInspector
            outcome={outcome}
            signatureValid={signatureValid}
            validityWindowOk={validityWindowOk}
            revocationClear={revocationClear}
            verifierReachable={verifierReachable}
            currentlyAuthorized={currentlyAuthorized}
            fields={fields}
            simulationBadge={V2_SIMULATION_LABEL}
            onRevokeSimulation={scenario === "valid" ? () => setScenario("revoked") : undefined}
            revokeSimulationLabel="Simulate revocation → DENY"
            footer={
              step === "verify" ? (
                <p className="abx-protocol-demo__copy" style={{ margin: 0 }}>
                  A valid signature can still yield <strong>DENY</strong> when expired, revoked, or the verifier is unavailable.
                </p>
              ) : null
            }
          />
        )}
      </div>

      <button type="button" className="abx-protocol-demo__replay" onClick={runLifecycle} disabled={animating}>
        {animating ? "Running lifecycle…" : "Replay lifecycle"}
      </button>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="abx-protocol-demo__panel">
      <h4 className="abx-protocol-demo__panel-title">{title}</h4>
      {children}
    </div>
  );
}

function MonoBlock({ children }: { children: string }) {
  return <pre className="abx-protocol-demo__mono">{children}</pre>;
}
