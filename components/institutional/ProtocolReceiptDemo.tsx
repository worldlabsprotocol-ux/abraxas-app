"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ReceiptInspector } from "@/components/design/ReceiptInspector";
import { V2_SIMULATION_LABEL } from "@/lib/home/v2HomeCopy";

type DemoStep = "request" | "evaluate" | "receipt" | "verify";

const STEPS: { id: DemoStep; label: string }[] = [
  { id: "request", label: "Eligibility request" },
  { id: "evaluate", label: "Evidence evaluation" },
  { id: "receipt", label: "Signed receipt" },
  { id: "verify", label: "Independent verification" },
];

const POLICY_ID = "policy_age21_retail_v3";
const ISSUER = "abraxas-trust-registry";

export function ProtocolReceiptDemo() {
  const [step, setStep] = useState<DemoStep>("receipt");
  const [revoked, setRevoked] = useState(false);
  const [animating, setAnimating] = useState(false);

  const runLifecycle = useCallback(() => {
    setAnimating(true);
    setRevoked(false);
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

  const currentlyAuthorized = !revoked;
  const outcome = revoked ? "DENY" : "PERMIT";

  const fields = useMemo(
    () => [
      { label: "Policy identifier", value: POLICY_ID, mono: true },
      { label: "Assurance level", value: "L2 — document-backed age" },
      { label: "Result", value: outcome },
      { label: "Expiration", value: revoked ? "—" : "2026-11-01T00:00:00Z" },
      { label: "Issuer", value: ISSUER, mono: true },
      { label: "Signature validity", value: "Valid (Ed25519)" },
      {
        label: "Verification source",
        value: revoked ? "Revocation signal observed (simulated)" : "Independent verify API (simulated)",
        mono: true,
      },
    ],
    [outcome, revoked],
  );

  return (
    <div className="abx-protocol-demo">
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
policy_id: ${POLICY_ID}
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
            signatureValid
            currentlyAuthorized={currentlyAuthorized}
            fields={fields}
            simulationBadge={V2_SIMULATION_LABEL}
            onRevokeSimulation={revoked ? undefined : () => setRevoked(true)}
            revokeSimulationLabel="Simulate revocation → DENY"
            footer={
              step === "verify" ? (
                <p className="abx-protocol-demo__copy" style={{ margin: 0 }}>
                  Independent verifiers treat <strong>signature valid</strong> and <strong>currently authorized</strong> as
                  separate conclusions.
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
