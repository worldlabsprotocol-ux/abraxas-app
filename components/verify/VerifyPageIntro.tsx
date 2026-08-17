// FILE: components/verify/VerifyPageIntro.tsx
// Server-rendered intro. visible to crawlers and first paint before client hydrates.

import Link from "next/link";
import {
  HOLDER_VERIFY_DEFAULT_PATH,
  VERIFY_HUB_EYEBROW,
  VERIFY_HUB_HEADLINE,
  VERIFY_HUB_HOLDER_NOTE,
  VERIFY_HUB_SUBHEAD,
} from "@/lib/integrate/partnerJourney";

export function VerifyPageIntro() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem) 0" }}>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem",
      }}>
        {VERIFY_HUB_EYEBROW}
      </div>
      <h1 style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)",
        margin: "0 0 0.75rem", lineHeight: 1.1,
      }}>
        {VERIFY_HUB_HEADLINE}
      </h1>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.9rem", color: "var(--text-secondary)",
        lineHeight: 1.7, maxWidth: 720, margin: "0 0 0.5rem",
      }}>
        {VERIFY_HUB_SUBHEAD}
      </p>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.78rem", color: "var(--text-muted)",
        lineHeight: 1.65, maxWidth: 720, margin: "0 0 1.25rem",
      }}>
        {VERIFY_HUB_HOLDER_NOTE}{" "}
        <Link href={HOLDER_VERIFY_DEFAULT_PATH} style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          Open holder verify
        </Link>
        .
      </p>
    </div>
  );
}
