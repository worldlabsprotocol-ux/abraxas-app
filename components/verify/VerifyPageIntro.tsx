// FILE: components/verify/VerifyPageIntro.tsx
// Server-rendered developer tester intro.

import Link from "next/link";
import {
  HOLDER_VERIFY_DEFAULT_PATH,
  VERIFY_HUB_EYEBROW,
  VERIFY_HUB_HEADLINE,
  VERIFY_HUB_HOLDER_NOTE,
  VERIFY_HUB_SUBHEAD,
} from "@/lib/integrate/partnerJourney";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function VerifyPageIntro() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "clamp(2rem, 6vw, 3rem) clamp(1rem, 3vw, 2rem) 0" }}>
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.75rem" }}>
        {VERIFY_HUB_EYEBROW}
      </div>
      <h1 style={{
        fontFamily: FONT,
        fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)",
        margin: "0 0 0.75rem", lineHeight: 1.15,
      }}>
        {VERIFY_HUB_HEADLINE}
      </h1>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.9rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 720, margin: "0 0 0.5rem",
      }}>
        {VERIFY_HUB_SUBHEAD}
      </p>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.82rem", color: "var(--text-muted)",
        lineHeight: 1.65, maxWidth: 720, margin: "0 0 1.25rem",
      }}>
        {VERIFY_HUB_HOLDER_NOTE}{" "}
        <Link href={HOLDER_VERIFY_DEFAULT_PATH} style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          Open Passport
        </Link>
        .
      </p>
    </div>
  );
}
