"use client";
// FILE: app/build/page.tsx
// Tokenize on Abraxas — everyday owner intake (verify first, then tokenize).

import Link from "next/link";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import { TokenizeOwnerWizard } from "@/components/build/TokenizeOwnerWizard";
import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
const ACCENT = "#10B981";

const STEPS = [
  { n: "1", title: "Tell us what you own", body: "A few plain-language questions — no legal forms yet." },
  { n: "2", title: "Verify on Passport", body: "Prove who you are once. Partners see proof, not your files." },
  { n: "3", title: "We handle the rest", body: "Our team scopes registry + tokenization and follows up by email." },
];

export default function BuildPage() {
  return (
    <RedesignShell>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 3vw, 1.5rem)" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          Tokenize
        </div>
        <h1 style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(1.45rem, 4vw, 2.1rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.65rem",
          lineHeight: 1.1,
        }}>
          Put your asset on Abraxas
        </h1>
        <p style={{
          fontFamily: FONT,
          fontSize: "0.88rem",
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          margin: "0 0 1.5rem",
          maxWidth: 520,
        }}>
          Verify once, then tokenize what you own. No API keys, no developer setup — start below in about two minutes.
        </p>

        <TokenizeOwnerWizard />

        <div style={{ marginTop: "2rem", display: "grid", gap: "0.65rem" }}>
          {STEPS.map(step => (
            <div key={step.n} style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
              padding: "0.85rem 1rem",
              borderRadius: 12,
              background: "var(--surface-inset)",
              border: "1px solid var(--border)",
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${ACCENT}18`, color: ACCENT,
                fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", fontWeight: 800,
              }}>
                {step.n}
              </span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                  {step.title}
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p style={{
          fontFamily: FONT,
          fontSize: "0.7rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          marginTop: "1.5rem",
        }}>
          Building an app on Abraxas?{" "}
          <Link href="/design-partner" style={{ color: ACCENT, fontWeight: 600 }}>
            Partner integrations
          </Link>
          {" "}are separate from this owner flow.
        </p>
      </div>
      <RedesignFooter />
    </RedesignShell>
  );
}
