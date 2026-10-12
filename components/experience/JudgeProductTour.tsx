"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PrivacyComparisonPanel } from "@/components/experience/PrivacyComparisonPanel";
import { ProductStoryStrip } from "@/components/product/ProductStoryStrip";
import { decideEvidenceReuse } from "@/lib/holder/evidenceReuseDecision";
import { CIELO_LIMITS_PLAIN, GOOD_TROUBLE_LIMITS_PLAIN, PARTNER_REQUEST_FOUR_QUESTIONS } from "@/lib/product/productStoryCopy";
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

const STEP_LABELS: Record<TourStepId, string> = {
  welcome: "Start",
  passport: "Passport",
  verify: "Verify once",
  cielo: "Cielo",
  consent: "Consent",
  receipt: "Receipt",
  good_trouble: "Good Trouble",
  reuse: "Reuse",
  finish: "Done",
};

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

      <div aria-label="Tour progress" style={{ display: "flex", gap: 8, marginBottom: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
        {STEPS.map((id, i) => (
          <span
            key={id}
            title={STEP_LABELS[id]}
            style={{
              width: i === index ? 10 : 8,
              height: i === index ? 10 : 8,
              borderRadius: "50%",
              background: i <= index ? "var(--accent)" : "var(--border)",
            }}
            aria-hidden
          />
        ))}
        <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: 4 }}>
          Step {index + 1} · {STEP_LABELS[step]}
        </span>
      </div>

      {step === "welcome" && (
        <section>
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(1.5rem,4vw,2rem)", margin: "0 0 0.75rem" }}>
            Traditional apps ask for everything. Abraxas shares only the answer.
          </h1>
          <ProductStoryStrip compact />
        </section>
      )}

      {step === "passport" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>1 · Abraxas Passport (simulated)</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            Your Passport holds verification status — not copies of your ID on every partner&apos;s servers.
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>Simulated wallet: DemoJudgeWallet…8x4f</p>
        </section>
      )}

      {step === "verify" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>2 · First verification (simulated)</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            When a policy requires it, you verify once with Abraxas. This tour skips real document upload.
          </p>
          <Btn size="sm" onClick={() => { setSimVerified(true); advance(); }} disabled={simVerified}>
            {simVerified ? "Simulated verification complete" : "Simulate first verification approved"}
          </Btn>
        </section>
      )}

      {step === "cielo" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>3 · Cielo guest eligibility</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>{CIELO_LIMITS_PLAIN}</p>
          <PrivacyComparisonPanel partner="cielo" compact />
        </section>
      )}

      {step === "consent" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>4 · You approve each share</h2>
          <ul style={{ fontFamily: FONT, fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-secondary)", paddingLeft: "1.1rem", margin: "0 0 0.75rem" }}>
            <li><strong>{PARTNER_REQUEST_FOUR_QUESTIONS.who}</strong> Cielo (simulated)</li>
            <li><strong>{PARTNER_REQUEST_FOUR_QUESTIONS.what}</strong> Verified guest eligibility</li>
            <li><strong>{PARTNER_REQUEST_FOUR_QUESTIONS.receive}</strong> Eligibility category only — not your ID</li>
            <li><strong>{PARTNER_REQUEST_FOUR_QUESTIONS.continue}</strong> Abraxas sends nothing until you tap approve</li>
          </ul>
          <Btn size="sm" onClick={() => { setSimCieloConsent(true); advance(); }} disabled={simCieloConsent}>
            {simCieloConsent ? "Simulated consent recorded" : "Simulate explicit consent"}
          </Btn>
        </section>
      )}

      {step === "receipt" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>5 · Confirmation for Cielo (simulated)</h2>
          <div style={{ border: "1px solid var(--border-strong)", borderRadius: 12, padding: "1rem", fontFamily: FONT, fontSize: "0.82rem" }}>
            <p style={{ margin: "0 0 0.35rem" }}><strong>Answer shared:</strong> Guest eligibility check passed</p>
            <p style={{ margin: "0 0 0.35rem" }}><strong>Who received it:</strong> Cielo (simulated)</p>
            <p style={{ margin: "0 0 0.35rem" }}><strong>Still valid:</strong> Until policy window ends (simulated)</p>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>Reference: sim_dr_cielo_demo — not a production credential. No on-chain proof in this demo.</p>
          </div>
        </section>
      )}

      {step === "good_trouble" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>6 · Good Trouble 21+ (simulated)</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>{GOOD_TROUBLE_LIMITS_PLAIN}</p>
          <PrivacyComparisonPanel partner="good_trouble" compact />
        </section>
      )}

      {step === "reuse" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>7 · Second partner, same proof</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)" }}>{reuseDecision.holderMessage}</p>
          <Btn size="sm" style={{ marginTop: "0.75rem" }} onClick={() => { setSimGtConsent(true); advance(); }} disabled={simGtConsent}>
            {simGtConsent ? "Simulated Good Trouble consent" : "Simulate consent (reuse, no new documents)"}
          </Btn>
        </section>
      )}

      {step === "finish" && (
        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>You saw the Abraxas difference</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            One verification, two partners, explicit consent, narrow answers — all simulated and clearly labeled.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
            <Btn href="/passport">Open Passport</Btn>
            <Btn href="/integrations" variant="secondary">Integration Studio</Btn>
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
        Ready for the real product? <Link href="/passport">Start with Passport</Link> or <Link href="/experience/tour">Replay tour</Link>.
      </p>
    </div>
  );
}
