"use client";
// FILE: components/home/HomePassportIntro.tsx

import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const TIERS = [
  { n: 0, title: "Account", body: "Sign in with Google. Create your Abraxas profile." },
  { n: 1, title: "Wallet-bound Passport", body: "Bind a wallet. Access eligible Abraxas pilots and policy-gated actions." },
  { n: 2, title: "Enhanced identity", body: "Complete approved identity verification when a partner or transaction requires it." },
];

export function HomePassportIntro() {
  return (
    <section style={{
      padding: "clamp(2rem, 5vw, 3rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="passport-intro-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        Start with a Passport
      </div>
      <h2 id="passport-intro-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.65rem", maxWidth: 520,
      }}>
        A Passport is not a full KYC requirement
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 560, margin: "0 0 1.25rem",
      }}>
        Create an account, bind a wallet, and begin using Abraxas without submitting identity documents.
        Identity verification is added only when a partner policy requires higher assurance.
      </p>
      <div style={{ display: "grid", gap: "0.65rem", marginBottom: "1.25rem" }}>
        {TIERS.map(t => (
          <div key={t.n} style={{
            padding: "0.85rem 1rem", borderRadius: 12,
            background: "var(--surface-inset)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              Tier {t.n} — {t.title}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {t.body}
            </div>
          </div>
        ))}
      </div>
      <Btn href="/passport" size="md">Create my Passport →</Btn>
    </section>
  );
}
