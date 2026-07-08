"use client";
// FILE: components/redesign/HomeOnboardingStrip.tsx
// Inline onboarding on the homepage — account → identity → reuse proof.

import Link from "next/link";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { consumerCopy } from "@/lib/consumerCopy";
import { Btn } from "./ui";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const STEPS = [
  {
    n: 1,
    title: consumerCopy.verificationFlow.step1Title,
    body: "Sign in with Google. Your Abraxas wallet is ready in one click.",
    status: "live" as const,
  },
  {
    n: 2,
    title: consumerCopy.verificationFlow.step2Title,
    body: "Upload ID when a deal or partner policy requires enhanced trust. Pilot uses manual review.",
    status: "pilot" as const,
  },
  {
    n: 3,
    title: consumerCopy.verificationFlow.step4Title,
    body: "Share your credential or test /verify. Partners check once, you never re-upload.",
    status: "live" as const,
  },
];

export function HomeOnboardingStrip() {
  const { isAuthenticated, suiAddress } = useSuiAuth();
  const activeStep = !isAuthenticated ? 1 : 2;

  return (
    <section id="get-started" aria-labelledby="onboarding-heading" style={{ scrollMarginTop: 88 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: "0.45rem",
            }}
          >
            Start here
          </div>
          <h2
            id="onboarding-heading"
            style={{
              fontFamily: FONT,
              fontSize: "var(--fs-h2)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
              maxWidth: 520,
            }}
          >
            Onboard in minutes, not another tab maze
          </h2>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 520, margin: "0.45rem 0 0" }}>
            {consumerCopy.verificationFlow.intro}
          </p>
        </div>
        <CapabilityStatusBadge status="live" size="xs" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        {STEPS.map(s => {
          const done = (s.n === 1 && isAuthenticated) || false;
          const current = s.n === activeStep;
          return (
            <div
              key={s.n}
              style={{
                padding: "1rem 1.05rem",
                borderRadius: 14,
                background: current ? "rgba(16,185,129,0.08)" : "var(--surface-inset)",
                border: `1px solid ${current ? "rgba(16,185,129,0.35)" : "var(--border)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT,
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    background: done ? ACCENT : `${ACCENT}18`,
                    color: done ? "#000" : ACCENT,
                    border: done ? "none" : `1px solid ${ACCENT}44`,
                  }}
                >
                  {done ? "✓" : s.n}
                </span>
                <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{s.title}</span>
                <CapabilityStatusBadge status={s.status} size="xs" />
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "1rem",
          padding: "1.25rem",
          borderRadius: 18,
          background: "var(--surface-raised)",
          border: "1px solid var(--border-strong)",
        }}
      >
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Step 1 · Live now
          </div>
          <ZkLoginSignIn compact={false} />
          {isAuthenticated && suiAddress && (
            <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.65rem 0 0", wordBreak: "break-all" }}>
              Wallet ready · {suiAddress.slice(0, 10)}…{suiAddress.slice(-6)}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
              Step 2 · When you need it
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
              {consumerCopy.passport.precheckProvider}
            </p>
            <Btn href="/passport#identity-stamp" size="sm" variant={isAuthenticated ? "primary" : "secondary"}>
              {isAuthenticated ? "Upload ID on Passport →" : "Open Passport (sign in first) →"}
            </Btn>
          </div>

          <div
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
              Step 3 · Test proof
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
              Run a live credential or policy check. Same API partners integrate.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Btn href="/verify?mode=profile" size="sm">Set up profile →</Btn>
              <Btn href="#test-network" variant="secondary" size="sm">Quick tests</Btn>
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.75rem 0 0", lineHeight: 1.55 }}>
        Already onboarded?{" "}
        <Link href="/account" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
          Open your account →
        </Link>
      </p>
    </section>
  );
}
