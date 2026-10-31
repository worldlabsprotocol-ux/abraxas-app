// Institutional entry point. Technical detail stays available on request.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { AbxCard } from "@/components/design/AbxPrimitives";
import { AbxInnerPage } from "@/components/design/AbxInnerPage";
import { Btn } from "@/components/redesign/ui";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const choices = [
  {
    title: "Create an integration",
    description: "Set up a sandbox application and choose a policy.",
    href: "/developers/integration-studio?source=integrate",
  },
  {
    title: "Connect an application",
    description: "Continue with an application in your workspace.",
    href: "/developers/integration-studio?source=integrate",
  },
] as const;

export default function IntegratePage() {
  return (
    <RedesignPage maxWidth={820} accent="developer">
      <AbxInnerPage
        accent="developer"
        eyebrow="Integrate Abraxas"
        title="Bring trusted decisions into your application"
        lead="Start in the sandbox. Your application checks each signed result before acting."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "0.8rem" }}>
          {choices.map((choice) => (
            <Link key={choice.title} href={choice.href} style={{ textDecoration: "none", color: "inherit" }}>
              <AbxCard accent="developer">
                <h2 style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "1.05rem", color: "var(--text-primary)" }}>{choice.title}</h2>
                <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.85rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>{choice.description}</p>
              </AbxCard>
            </Link>
          ))}
        </div>
        <details style={{ fontFamily: FONT, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          <summary style={{ cursor: "pointer", color: "var(--text-primary)" }}>How Abraxas fits your stack</summary>
          <div style={{ marginTop: "0.75rem", lineHeight: 1.6 }}>
            <p>Abraxas supplies policy-bound decisions. Your application retains custody, permissions, and enforcement. A valid signature alone does not authorize an action.</p>
            <p>See the reference harness for evidence reuse across two applications. It is not a production customer deployment.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              <Btn href="/proof" variant="secondary" size="sm">View reference proof</Btn>
              <Btn href="/docs/partner-flow" variant="secondary" size="sm">Partner Flow guide</Btn>
            </div>
          </div>
        </details>
      </AbxInnerPage>
    </RedesignPage>
  );
}

