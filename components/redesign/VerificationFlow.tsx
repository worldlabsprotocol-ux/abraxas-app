"use client";
// FILE: components/redesign/VerificationFlow.tsx
// Three-step verification funnel for mass-adoption clarity.

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";
import { PassportStampIcon } from "@/components/identity/PassportStampIcon";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const STEPS = [
  {
    n: "01",
    title: "Sign in. get your wallet",
    body: "Google sign-in via zkLogin creates your Sui address instantly. No seed phrase. This wallet holds your Passport.",
    kind: "identity" as const,
    href: "/passport",
    cta: "Continue with Google",
  },
  {
    n: "02",
    title: "Verify once with a trusted provider",
    body: "Veriff performs KYC. government ID and liveness. Abraxas records only the signed credential hash, issuer, and sanctions outcome. Never your passport.",
    kind: "biometric" as const,
    href: "/passport",
    cta: "Start Precheck",
  },
  {
    n: "03",
    title: "Reuse proof everywhere",
    body: "Protocols ask Abraxas: Is this wallet verified? Is AML clear? You approve consent. they receive a signed proof, not your documents.",
    kind: "compliance" as const,
    href: "/docs/ail",
    cta: "Read AIL spec",
  },
];

const TRUST = ["W3C Verifiable Credentials", "Veriff KYC", "Trust registry", "Sui · zkLogin"];

export function VerificationFlow() {
  return (
    <section>
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.14em", textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}>
          How it works
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 520,
        }}>
          Verify once. That is the trust layer.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 560, margin: 0,
        }}>
          Abraxas is not another KYC vendor. It is the trust registry. licensed providers verify;
          Abraxas standardizes, secures, and distributes proof with your consent.
        </p>
      </div>

      <motion.div
        variants={staggerContainer(0.08, 0.06)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        {STEPS.map(step => (
          <motion.div key={step.n} variants={staggerItem}
            style={{
              padding: "1.25rem",
              borderRadius: 16,
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PassportStampIcon kind={step.kind} size={22} color={ACCENT} />
              </div>
              <span style={{
                fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700,
                color: "var(--text-muted)",
              }}>
                {step.n}
              </span>
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "1rem", fontWeight: 700,
              color: "var(--text-primary)",
            }}>
              {step.title}
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
              lineHeight: 1.65, margin: 0, flex: 1,
            }}>
              {step.body}
            </p>
            <Btn href={step.href} variant="secondary" size="sm">{step.cta} →</Btn>
          </motion.div>
        ))}
      </motion.div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center",
        padding: "0.75rem 1rem", borderRadius: 12,
        background: "var(--surface)", border: "1px solid var(--border)",
      }}>
        <span style={{
          fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600,
          color: "var(--text-muted)", marginRight: "0.25rem",
        }}>
          Built on:
        </span>
        {TRUST.map(t => (
          <span key={t} style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
            color: "var(--text-secondary)", letterSpacing: "0.06em",
            padding: "0.25rem 0.55rem", borderRadius: 6,
            border: "1px solid var(--border)",
          }}>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
