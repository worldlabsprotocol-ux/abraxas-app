"use client";
// FILE: components/goodTrouble/GoodTroubleBrowseSeekerDemoCTA.tsx
// Browse-first Seeker demo — genuine Wix-hosted Partner Flow entry (gtb lifecycle).

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { GOOD_TROUBLE_BROWSE_SEEKER_DEMO } from "@/lib/goodTrouble/browseSeekerDemoEntry";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const STEPS = [
  "Open Good Trouble and choose Verify 21+ with Abraxas (browse)",
  "Sign in with Google and complete Passport + L0 browse attestation",
  "Return to Good Trouble with a signed browse receipt bound to your gtb token",
  "After server validation, continue to The Goods shop",
] as const;

export function GoodTroubleBrowseSeekerDemoCTA() {
  const demo = GOOD_TROUBLE_BROWSE_SEEKER_DEMO;

  return (
    <section
      aria-labelledby="gt-browse-seeker-demo-heading"
      style={{
        padding: "1.25rem",
        borderRadius: 16,
        border: "1px solid rgba(45,212,191,0.35)",
        background: "rgba(45,212,191,0.06)",
        marginBottom: "1rem",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.7rem",
        fontWeight: 800,
        color: "#5EEAD4",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        margin: "0 0 0.35rem",
      }}>
        Solana Seeker · Browse-first demo
      </p>
      <h2
        id="gt-browse-seeker-demo-heading"
        style={{
          fontFamily: FONT,
          fontSize: "1.1rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        L0 catalog browse via Hosted Partner Flow
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.82rem",
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        margin: "0 0 0.85rem",
        maxWidth: 560,
      }}>
        {demo.assurance}. Regulated checkout uses a separate purchase flow — never substitute gtv for gtb.
      </p>

      <ol style={{ listStyle: "none", margin: "0 0 1rem", padding: 0, display: "grid", gap: "0.45rem" }}>
        {STEPS.map((step, index) => (
          <li
            key={step}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6rem minmax(0, 1fr)",
              gap: "0.55rem",
              alignItems: "start",
              fontFamily: FONT,
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
            }}
          >
            <span aria-hidden="true" style={{
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "999px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(45,212,191,0.15)",
              color: "#5EEAD4",
              fontWeight: 800,
              fontSize: "0.72rem",
            }}>
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href={demo.entryUrl} size="lg" newTab>
          {demo.entryLabel} →
        </Btn>
        <Btn href={demo.purchaseDemoPath} variant="secondary" size="sm">
          Purchase sandbox (separate) →
        </Btn>
      </div>

      <p style={{
        fontFamily: MONO,
        fontSize: "0.58rem",
        color: "var(--text-muted)",
        margin: "0.85rem 0 0",
        lineHeight: 1.6,
        overflowWrap: "anywhere",
      }}>
        partner_id={demo.partnerId} · policy_id={demo.policyId} · purpose={demo.purpose}
        <br />
        callback={demo.callbackPath} · post-verify={demo.postVerificationPath}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.5rem 0 0" }}>
        Deploy Wix Velo updates from this branch before device testing.{" "}
        <Link href="/docs/partner-flow" style={{ color: "var(--accent)", fontWeight: 700 }}>
          Partner Flow docs
        </Link>
      </p>
    </section>
  );
}
