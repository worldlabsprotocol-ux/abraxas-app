"use client";
// FILE: components/home/HomePartnersBrief.tsx

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "var(--accent)";

export function HomePartnersBrief() {
  return (
    <section style={{
      padding: "clamp(2rem, 5vw, 3rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="partners-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        Built for relying parties
      </div>
      <h2 id="partners-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.65rem", maxWidth: 560,
      }}>
        Partners receive the minimum proof their policy requires
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 560, margin: "0 0 1rem",
      }}>
        No passports, selfies, biometrics, or document folders by default — only the claims the policy needs.
      </p>
      <pre style={{
        fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)",
        padding: "0.85rem 1rem", borderRadius: 12,
        background: "var(--surface-inset)", border: "1px solid var(--border)",
        lineHeight: 1.55, margin: "0 0 1rem", overflow: "auto",
      }}>
{`Decision: Approved
Policy: Cielo Verified Guest v1
Wallet binding: Active
Consent: Current
Valid until: [time-bound status]`}
      </pre>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
        Partner integrations are pilot-ready for approved organizations.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/design-partner" variant="secondary" size="sm">Become a relying party →</Btn>
        <Link href="/integrate" style={{
          fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT,
          alignSelf: "center", textDecoration: "none",
        }}>
          Integrate Abraxas →
        </Link>
      </div>
    </section>
  );
}
