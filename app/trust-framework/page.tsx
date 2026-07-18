import type { Metadata } from "next";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { TrustIsTimeBoundSection } from "@/components/vision/TrustIsTimeBoundSection";
import { TRUST_FRAMEWORK_INTRO } from "@/lib/trustOverTime";

export const metadata: Metadata = {
  title: "Trust Framework — Abraxas",
  description:
    "How Abraxas verification stays current: cryptographic credentials, time-bound validity, and refresh when underlying facts change.",
};

const PILLARS = [
  { title: "Cryptographic", desc: "Counterparties verify independently — no reputation required." },
  { title: "Time-bound", desc: "Credentials expire and refresh when facts change." },
  { title: "Fail closed", desc: "Invalid or stale credentials block the transaction." },
] as const;

export default function TrustFrameworkPage() {
  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="Trust framework"
        title="Verification that stays current"
        subtitle={TRUST_FRAMEWORK_INTRO}
      />

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "2rem" }}>
        {PILLARS.map(pillar => (
          <div key={pillar.title} style={{
            padding: "1rem 1.1rem", borderRadius: 14,
            border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
          }}>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: 6 }}>{pillar.title}</div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{pillar.desc}</p>
          </div>
        ))}
      </div>

      <TrustIsTimeBoundSection />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
        <Btn href="/integrate" size="sm">Integrate Abraxas →</Btn>
        <Link href="/" style={{ fontSize: "0.78rem", color: "var(--text-muted)", alignSelf: "center", textDecoration: "none" }}>
          Back to home
        </Link>
      </div>
    </RedesignPage>
  );
}
