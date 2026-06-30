"use client";
// FILE: components/terminal/VerifiedNetworkSection.tsx
// Positions the Abraxas Passport as the entry point to a verified
// network. Concepts reframed in a builder/founder voice — original
// copy, no external brands or partners referenced.

import { motion } from "framer-motion";
import { M, S, G } from "./tokens";
import { Label, Button } from "./ui";
import { MotionCard } from "@/lib/motion/MotionCard";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

interface Reason {
  n: string;
  title: string;
  punch: string;
  points: string[];
}

const REASONS: Reason[] = [
  {
    n: "01",
    title: "Get in before the standard sets",
    punch: "Verification is about to be mandatory everywhere. Do it once, now, and you're already inside the network while everyone else is scrambling to catch up.",
    points: [
      "Founding Verified is minted to your Passport, permanent and non-transferable",
      "Earned by real verification depth, not by staking capital",
      "First 250 seats, when protocols check Abraxas first, you were already in",
    ],
  },
  {
    n: "02",
    title: "One verification, every door",
    punch: "Stop re-uploading the same documents to ten platforms. Verify your identity and your assets once, then carry that proof everywhere.",
    points: [
      "One Passport accepted across every integrated protocol, lender, and marketplace",
      "No re-KYC, no redundant uploads, no waiting in the same line twice",
      "The credential is the key, the network is the building",
    ],
  },
  {
    n: "03",
    title: "Trust that actually travels",
    punch: "A PDF is a claim. A W3C credential anchored on Sui is proof. You read as institutional-ready the second you connect.",
    points: [
      "Cryptographic, portable, verifiable in a single call",
      "Investors, partners, and protocols confirm you without re-running KYC",
      "Compliance-grade by default, not bolted on after the fact",
    ],
  },
  {
    n: "04",
    title: "Verified gets you in the room",
    punch: "Cold outreach is dead weight. Verified people and verified assets find each other and transact on proof, not promises.",
    points: [
      "Verified status unlocks collateral, lending, and marketplace access",
      "Warm, on-chain credibility instead of cold introductions",
      "Deal flow moves to the people who can prove who they are",
    ],
  },
  {
    n: "05",
    title: "The network compounds",
    punch: "This is not a one-time stamp. Every protocol that integrates Abraxas makes the Passport already in your wallet more valuable, automatically.",
    points: [
      "Each new integration widens where your credential works",
      "Founding members anchor the standard the network verifies against",
      "Verify once today, it keeps paying off as the network grows",
    ],
  },
];

export function VerifiedNetworkSection() {
  return (
    <div>
      <Label>The Verified Network</Label>

      <h2 style={{
        fontFamily: S,
        fontSize: "var(--fs-h1)",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        lineHeight: 1.05,
        color: "var(--text-primary)",
        margin: "0 0 0.75rem",
        maxWidth: 720,
      }}>
        Verify once. Get in before everyone&nbsp;has&nbsp;to.
      </h2>

      <p style={{
        fontFamily: S,
        fontSize: "var(--fs-body)",
        color: "var(--text-secondary)",
        lineHeight: 1.7,
        maxWidth: 640,
        margin: "0 0 1.75rem",
      }}>
        The Abraxas Passport is not a profile. It is your key to a network where
        verified people and verified assets transact with each other, and every new
        protocol that plugs in makes the credential in your wallet worth more.
      </p>

      <motion.div
        variants={staggerContainer(0.08, 0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: "0.875rem",
        }}
      >
        {REASONS.map(r => (
          <motion.div key={r.n} variants={staggerItem}>
            <MotionCard
              glowColor="rgba(16,185,129,0.32)"
              style={{
                height: "100%",
                padding: "1.25rem",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{
                fontFamily: M,
                fontSize: "1.6rem",
                fontWeight: 800,
                color: G,
                opacity: 0.9,
                letterSpacing: "-0.02em",
                marginBottom: "0.5rem",
              }}>
                {r.n}
              </div>
              <div style={{
                fontFamily: S,
                fontSize: "var(--fs-h2)",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                marginBottom: "0.5rem",
              }}>
                {r.title}
              </div>
              <p style={{
                fontFamily: S,
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                margin: "0 0 0.875rem",
              }}>
                {r.punch}
              </p>
              <ul style={{ listStyle: "none", margin: "auto 0 0", padding: 0,
                            display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {r.points.map((p, i) => (
                  <li key={i} style={{ display: "flex", gap: "0.5rem",
                                        fontFamily: S, fontSize: "0.74rem",
                                        color: "var(--text-muted)", lineHeight: 1.5 }}>
                    <span style={{ color: G, flexShrink: 0, fontWeight: 800 }}>✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </MotionCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Closing CTA */}
      <div style={{
        marginTop: "1.5rem",
        padding: "1.25rem clamp(1rem, 3vw, 1.5rem)",
        borderRadius: 14,
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <div>
          <div style={{ fontFamily: S, fontSize: "var(--fs-h2)", fontWeight: 800,
                         color: "var(--text-primary)", letterSpacing: "-0.02em",
                         marginBottom: "0.25rem" }}>
            Verify once. Own your seat in the verified network.
          </div>
          <div style={{ fontFamily: S, fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Founding Verified is capped at 250 seats and earned, not bought.
          </div>
        </div>
        <Button onClick={() => { window.location.href = "/passport"; }} variant="filled" color={G} size="lg">
          Become Founding Verified →
        </Button>
      </div>
    </div>
  );
}
