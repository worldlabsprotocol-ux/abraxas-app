// FILE: components/verify/VerifyPageIntro.tsx
// Server-rendered developer tester intro.

import Link from "next/link";
import { DecisionReceiptInspectionVisual } from "@/components/protocol-visuals";
import {
  HOLDER_VERIFY_DEFAULT_PATH,
  VERIFY_HUB_EYEBROW,
} from "@/lib/integrate/partnerJourney";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function VerifyPageIntro() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 3vw, 2rem) 0" }}>
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        {VERIFY_HUB_EYEBROW}
      </div>
      <h1
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
          lineHeight: 1.15,
        }}
      >
        Receipt verification
      </h1>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          lineHeight: 1.55,
          maxWidth: 480,
          margin: "0 0 1rem",
        }}
      >
        Inspect signatures, policy, and revocation.{" "}
        <Link href={HOLDER_VERIFY_DEFAULT_PATH} style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          Passport
        </Link>
      </p>
      <div className="abx-surface-protocol-visual">
        <DecisionReceiptInspectionVisual />
      </div>
    </div>
  );
}
