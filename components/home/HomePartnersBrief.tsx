"use client";
// FILE: components/home/HomePartnersBrief.tsx
// Design partners + owner wedge — prominent, not buried at page bottom.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { PartnerExecutionCards } from "@/components/partners/PartnerExecutionCards";
import { partnersActiveCount, partnersActiveLabel } from "@/lib/partnerStatus";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomePartnersBrief() {
  const count = partnersActiveCount();

  return (
    <section id="partners" aria-labelledby="partners-heading" style={{
      padding: "clamp(1.75rem, 4vw, 2.5rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }}>
      <div style={{
        padding: "clamp(1rem, 3vw, 1.35rem)",
        borderRadius: 16,
        border: `1px solid ${ACCENT}33`,
        background: `linear-gradient(160deg, ${ACCENT}10 0%, var(--surface-raised) 45%, var(--surface) 100%)`,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          {partnersActiveLabel()}
        </div>
        <h2 id="partners-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h3)", fontWeight: 800,
          letterSpacing: "-0.02em", color: "var(--text-primary)",
          margin: "0 0 0.5rem", maxWidth: 640,
        }}>
          Verified network for operators, developers, and investors — not another document portal.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 640, margin: "0 0 1.1rem",
        }}>
          Integrate once. Owners verify once. Partners ask for the eligibility decision — not the customer&apos;s
          document folder. Cielo proves the loop in hospitality; land and mineral partners are active on the owner portal.
        </p>

        <PartnerExecutionCards />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "1.1rem", alignItems: "center" }}>
          <Btn href="/integrations" size="sm">Integrations →</Btn>
          <Btn href="/design-partner" variant="secondary" size="sm">Design partner program →</Btn>
          <Btn href="/portal" variant="secondary" size="sm">Owner portal →</Btn>
          <Link href="/case-studies/cielo" style={{
            fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
          }}>
            Cielo case study →
          </Link>
        </div>
      </div>

      <div style={{ marginTop: "clamp(1.25rem, 3vw, 1.75rem)" }} aria-labelledby="issuers-heading">
        <h3 id="issuers-heading" style={{
          fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
          color: "var(--text-primary)", margin: "0 0 0.45rem",
        }}>
          For asset & business owners
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 560, margin: "0 0 0.85rem",
        }}>
          Submit once, track every stage, control what gets shared. The owner portal is live for land and mineral intake.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/portal/apply" variant="secondary" size="sm">Launch your listing →</Btn>
          <Btn href="/portal/status" variant="ghost" size="sm">Track application →</Btn>
          <Btn href="/build" variant="ghost" size="sm">List your asset →</Btn>
        </div>
      </div>
    </section>
  );
}
