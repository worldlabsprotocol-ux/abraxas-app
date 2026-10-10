"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PrivacyComparisonPanel } from "@/components/experience/PrivacyComparisonPanel";
import { decideEvidenceReuse } from "@/lib/holder/evidenceReuseDecision";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { Btn } from "@/components/redesign/ui";

const FONT = ABRAXAS_FONT_SANS;
const SIMULATION_BADGE = "Simulated demonstration — no real credentials or blockchain transactions";

type TourStepId =
  | "welcome"
  | "passport"
  | "verify"
  | "cielo"
  | "consent"
  | "receipt"
  | "good_trouble"
  | "reuse"
  | "finish";

const STEPS: TourStepId[] = [
  "welcome",
  "passport",
  "verify",
  "cielo",
  "consent",
  "receipt",
  "good_trouble",
  "reuse",
  "finish",
];

export function JudgeProductTour() {
  const [index, setIndex] = useState(0);
  const [simVerified, setSimVerified] = useState(false);
  const [simCieloConsent, setSimCieloConsent] = useState(false);
  const [simGtConsent, setSimGtConsent] = useState(false);

  const step = STEPS[index] ?? "welcome";
  const reuseDecision = useMemo(() => decideEvidenceReuse({
    hasQualifiedEvidence: simVerified,
    evidenceExpired: false,
    evidenceRevoked: false,
    higherAssuranceRequired: false,
    consentGranted: simGtConsent,
  }), [simVerified, simGtConsent]);

  const advance = useCallback(() => {
    setIndex(i => Math.min(i + 1, STEPS.length - 1));
  }, []);

  const back = useCallback(() => {
    setIndex(i => Math.max(i - 1, 0));
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <p
        role="status"
        style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--accent)",
          background: "var(--surface-raised)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 10,
          padding: "0.55rem 0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        {SIMULATION_BADGE}
      </p>

      <div aria-label="Tour progress" style={{ display: "flex", gap: 6, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {STEPS.map((id, i) => (
          <span
            key={id}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: i <= index ? "var(--accent)" : "var(--border)",
            }}
            aria-hidden
          />
        ))}
      </div>

      {step === "welcome" && (
        <section>
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(1.5rem,4vw,2rem)", margin: "0 0 0.75rem" }}>
            Verify once. Prove only what&apos;s needed.
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
            Abraxas lets people verify eligibility privately. Applications receive trusted, narrow decisions — not identity documents.
          </p>
          <ul style={{ fontFamily: FONT, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
            <li><strong>For people:</strong> keep documents out of every app</li>
            <li><strong>For applications:</strong> receive signed policy results</li>
            <li><strong>For the ecosystem:</strong> reusable eligibility with auditability</li>
          </ul>
        </section>
      )}

      {step === "passport" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>1 · Abraxas Passport (simulated)</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            A holder connects a wallet once. The Passport stores verification status — not partner copies of ID scans.
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>Simulated wallet: DemoJudgeWallet…8x4f</p>
        </section>
      )}

      {step === "verify" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>2 · Identity verification (conceptual)</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            In production, the holder completes real IDV and human review when required. This tour skips document upload.
          </p>
          <Btn size="sm" onClick={() => { setSimVerified(true); advance(); }} disabled={simVerified}>
            {simVerified ? "Simulated verification complete" : "Simulate verification approved"}
          </Btn>
        </section>
      )}

      {step === "cielo" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>3 · Cielo verified-rate request</h2>
          <PrivacyComparisonPanel partner="cielo" compact />
        </section>
      )}

      {step === "consent" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>4 · Holder consent</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            The holder sees who is asking, why, and exactly what will be disclosed before approving.
          </p>
          <Btn size="sm" onClick={() => { setSimCieloConsent(true); advance(); }} disabled={simCieloConsent}>
            {simCieloConsent ? "Simulated consent recorded" : "Simulate consent to share narrow result"}
          </Btn>
        </section>
      )}

      {step === "receipt" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>5 · Signed receipt (simulated)</h2>
          <div style={{ border: "1px solid var(--border-strong)", borderRadius: 12, padding: "1rem", fontFamily: FONT, fontSize: "0.82rem" }}>
            <p style={{ margin: "0 0 0.35rem" }}><strong>Result:</strong> Verified guest eligible</p>
            <p style={{ margin: "0 0 0.35rem" }}><strong>Requested by:</strong> Cielo (simulated)</p>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>Receipt ID: sim_dr_cielo_demo — not a production credential</p>
          </div>
        </section>
      )}

      {step === "good_trouble" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>6 · Good Trouble 21+ request</h2>
          <PrivacyComparisonPanel partner="good_trouble" compact />
          <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
            A different partner and policy — the holder journey is shorter when evidence already qualifies.
          </p>
        </section>
      )}

      {step === "reuse" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>7 · Evidence reuse</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)" }}>{reuseDecision.holderMessage}</p>
          <Btn size="sm" style={{ marginTop: "0.75rem" }} onClick={() => { setSimGtConsent(true); advance(); }} disabled={simGtConsent}>
            {simGtConsent ? "Simulated Good Trouble consent" : "Simulate consent (no new documents)"}
          </Btn>
        </section>
      )}

      {step === "finish" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>Tour complete</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            You saw verification reuse across two partners with explicit consent and narrow disclosure — all simulated.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
            <Btn href="/passport">Open real Passport</Btn>
            <Btn href="/docs/partner-flow" variant="secondary">Partner integration docs</Btn>
          </div>
        </section>
      )}

      <footer style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", gap: "1rem", flexWrap: "wrap" }}>
        <Btn variant="ghost" size="sm" onClick={back} disabled={index === 0}>Back</Btn>
        {step !== "verify" && step !== "consent" && step !== "reuse" && step !== "finish" ? (
          <Btn size="sm" onClick={advance}>Continue</Btn>
        ) : step === "finish" ? null : (
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", alignSelf: "center" }}>
            Complete the simulated action to continue
          </span>
        )}
      </footer>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2rem" }}>
        Prefer the operational product? <Link href="/passport">Start with Passport</Link> or <Link href="/integrations">Integration Studio</Link>.
      </p>
    </div>
  );
}
