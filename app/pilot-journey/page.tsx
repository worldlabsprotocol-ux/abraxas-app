"use client";
// FILE: app/pilot-journey/page.tsx
// Public walkthrough of the generic, browser-first Abraxas sandbox path.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const studioHref =
  "/developers/integration-studio?pack=age_21_retail&path=hosted_partner_flow&platform=universal_https&source=browser-builder";
const pilotDemoHref = "/demo/relying-party";

const bodyStyle = {
  margin: 0,
  fontFamily: FONT,
  fontSize: "0.9rem",
  lineHeight: 1.6,
  color: "var(--text-secondary)",
} as const;

const stepStyle = {
  display: "grid",
  gridTemplateColumns: "2rem minmax(0, 1fr)",
  gap: "0.75rem",
  alignItems: "start",
} as const;

const numberStyle = {
  width: "2rem",
  height: "2rem",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "var(--accent-soft)",
  color: "var(--accent)",
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: "0.82rem",
} as const;

export default function PilotJourneyPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={760}>
      <PageHeader
        eyebrow="Browser-first sandbox"
        title="From policy idea to working integration"
        subtitle="Choose the result your protocol needs, create an isolated sandbox, and run its hosted test without a wallet, zkLogin, or terminal."
      />

      <ContentCard title="Build a sandbox">
        <div style={{ display: "grid", gap: "1.1rem" }}>
          <div style={stepStyle}>
            <span style={numberStyle}>1</span>
            <div>
              <p style={bodyStyle}>
                <strong style={{ color: "var(--text-primary)" }}>Choose the result.</strong><br />
                Start with the product goal. Abraxas recommends a policy and shows exactly what the partner receives.
              </p>
              <div style={{ marginTop: "0.65rem" }}>
                <Btn href="/try" variant="secondary">Choose a policy</Btn>
              </div>
            </div>
          </div>

          <div style={stepStyle}>
            <span style={numberStyle}>2</span>
            <div>
              <p style={bodyStyle}>
                <strong style={{ color: "var(--text-primary)" }}>Create the sandbox.</strong><br />
                Name the app and callback. Abraxas creates an isolated test tenant and shows its test key once.
              </p>
              <div style={{ marginTop: "0.65rem" }}>
                <Btn href={studioHref} size="lg">Open Integration Studio →</Btn>
              </div>
            </div>
          </div>

          <div style={stepStyle}>
            <span style={numberStyle}>3</span>
            <div>
              <p style={bodyStyle}>
                <strong style={{ color: "var(--text-primary)" }}>Run the relying-party pilot.</strong><br />
                Walk through age 21+ verification, holder disclosure, signed receipt verification, and the second-partner reuse path.
              </p>
              <div style={{ marginTop: "0.65rem" }}>
                <Btn href={pilotDemoHref} variant="secondary">Open age 21+ pilot demo →</Btn>
              </div>
            </div>
          </div>

          <div style={stepStyle}>
            <span style={numberStyle}>4</span>
            <p style={bodyStyle}>
              <strong style={{ color: "var(--text-primary)" }}>Run the hosted test.</strong><br />
              After creation, select “Run hosted sandbox test.” The returned receipt is checked through the same server integration used by partner apps.
            </p>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="What is live">
        <p style={bodyStyle}>
          Policy selection, starter-kit generation, isolated sandbox provisioning, API-key issuance, hosted Partner Flow, public receipt verification, and reviewed Solana devnet proof verification are connected product surfaces.
        </p>
        <details style={{ marginTop: "0.85rem", fontFamily: FONT }}>
          <summary style={{ cursor: "pointer", color: "var(--text-primary)", fontWeight: 750 }}>
            Open technical proof surfaces
          </summary>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "0.8rem" }}>
            <Btn href={pilotDemoHref} variant="secondary">Age 21+ pilot demo</Btn>
            <Btn href="/verify?mode=receipt" variant="secondary">Receipt verifier</Btn>
            <Btn href="/proofs/solana-devnet" variant="secondary">Solana proof</Btn>
            <Btn href="/docs/sandbox-conformance" variant="secondary">Sandbox contract</Btn>
          </div>
        </details>
      </ContentCard>

      <ContentCard title="Clear boundary">
        <p style={bodyStyle}>
          Sandbox creation does not require a wallet or identity proof. Wallet binding is an optional integration capability for protocols that need onchain action control. Production access remains a reviewed upgrade.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
