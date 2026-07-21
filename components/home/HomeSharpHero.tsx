"use client";
// FILE: components/home/HomeSharpHero.tsx
// Wallet-first cold path — connect, verify state, one primary CTA.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import {
  ABRAXAS_CATEGORY,
  ABRAXAS_EMOTION_HEADLINE,
  ABRAXAS_MECHANISM,
  ABRAXAS_HEADLINE,
} from "@/lib/northStar";
import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_MONO,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function HomeSharpHero() {
  const { suiAddress, isAuthenticated, session } = useSuiAuth();
  const email = session?.email ?? null;
  const { identityStatus, credential } = usePassportVerification(suiAddress, email);
  const hasCredential = Boolean(credential) && identityStatus === "earned";

  const [tagLead, tagTail] = ABRAXAS_HEADLINE.split(". ").map((s) => s.replace(/\.$/, ""));

  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      style={{
        padding: "clamp(2rem, 5vw, 3.5rem) 0 clamp(1rem, 3vw, 1.5rem)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "clamp(1.5rem, 4vw, 2.5rem)",
          alignItems: "start",
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
            {ABRAXAS_CATEGORY}
          </div>

          <h1
            id="home-hero-heading"
            style={{
              fontFamily: ABRAXAS_FONT_DISPLAY,
              fontSize: "clamp(2rem, 5.5vw, var(--fs-display))",
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 1.02,
              color: "var(--text-primary)",
              margin: "0 0 0.55rem",
            }}
          >
            {ABRAXAS_EMOTION_HEADLINE}
          </h1>

          <p
            style={{
              fontFamily: FONT,
              fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-secondary)",
              margin: "0 0 0.5rem",
              lineHeight: 1.3,
            }}
          >
            {ABRAXAS_MECHANISM}
          </p>

          <p
            style={{
              fontFamily: FONT,
              fontSize: "clamp(0.9rem, 2vw, 1.05rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: "0 0 1.15rem",
              lineHeight: 1.25,
            }}
          >
            <span style={{ color: "var(--text-primary)" }}>{tagLead}. </span>
            <span className="abx-gradient-text">{tagTail}.</span>
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
            <Btn href="/#minimum-proof" size="lg">
              See minimum proof →
            </Btn>
            <Btn href="/integrate" variant="secondary" size="lg">
              Build with Abraxas →
            </Btn>
          </div>
        </div>

        <div
          id="wallet-connect"
          style={{
            padding: "1.15rem 1.25rem",
            borderRadius: 20,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: "0.55rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "0.65rem",
            }}
          >
            Start here · wallet-first
          </div>

          <ZkLoginSignIn compact />

          {isAuthenticated && suiAddress && (
            <div
              style={{
                marginTop: "0.85rem",
                padding: "0.75rem 0.85rem",
                borderRadius: 12,
                border: `1px solid ${hasCredential ? "rgba(16,185,129,0.35)" : "var(--border)"}`,
                background: hasCredential ? "rgba(16,185,129,0.08)" : "var(--surface)",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {hasCredential ? "Credential active" : "Wallet connected"}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {hasCredential
                  ? "Your proof is portable — partners verify without re-KYC."
                  : "Add ID on Passport when a partner policy requires it."}
              </div>
              <Link
                href={hasCredential ? "/verify" : "/passport"}
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontFamily: FONT,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--accent)",
                  textDecoration: "none",
                }}
              >
                {hasCredential ? "Test verify →" : "Open Passport →"}
              </Link>
            </div>
          )}

          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
            <Link href="/mainnet" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              Mainnet scoreboard
            </Link>
            {" · "}
            <Link href="/#learn-more" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              Deep dive
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
