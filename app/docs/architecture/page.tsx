"use client";
// FILE: app/docs/architecture/page.tsx
// Honest technical architecture — live vs in-progress vs roadmap.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList, KeyValueTable } from "@/components/redesign/RedesignContent";
import {
  ARCHITECTURE_LAYERS,
  ARCH_STATUS_META,
  X402_ARCHITECTURE,
  PASSPORT_ONCHAIN_SPEC,
  INTEGRATOR_QUICKSTART,
  type ArchStatus,
} from "@/lib/protocolArchitecture";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function StatusPill({ status }: { status: ArchStatus }) {
  const meta = ARCH_STATUS_META[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.2rem 0.55rem", borderRadius: 999,
      background: `${meta.color}18`, border: `1px solid ${meta.color}40`,
      fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
      color: meta.color, letterSpacing: "0.08em", textTransform: "uppercase",
      flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color }} />
      {meta.label}
    </span>
  );
}

export default function ArchitecturePage() {
  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="Technical architecture"
        title="How Abraxas is built"
        subtitle="Abraxas Identity Layer (AIL) — five-layer trust infrastructure. Live vs roadmap labeled honestly."
      />

      <ContentCard title="Design principle">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
                     lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          Abraxas is a <strong style={{ color: "var(--text-primary)" }}>trust orchestration layer</strong>, not a KYC
          vendor. Licensed providers perform verification; Abraxas stores only credential hashes, issuer, expiration,
          sanctions status, and wallet binding. External protocols integrate one API —{" "}
          <em>Is this wallet verified?</em> — instead of five different KYC stacks.
        </p>
        <Link href="/docs/ail" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, fontWeight: 600 }}>
          Read full AIL specification →
        </Link>
      </ContentCard>

      {/* Stack layers */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 700,
          color: "var(--text-primary)", margin: "0 0 1rem",
        }}>
          Architecture stack
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {ARCHITECTURE_LAYERS.map(layer => (
            <div key={layer.id} style={{
              padding: "1.15rem 1.25rem", borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)", background: "var(--surface-raised)",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem",
              }}>
                <div>
                  <div style={{
                    fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
                    color: "var(--text-muted)", letterSpacing: "0.1em",
                    textTransform: "uppercase", marginBottom: "0.25rem",
                  }}>
                    {layer.layer}
                  </div>
                  <div style={{
                    fontFamily: FONT, fontSize: "1rem", fontWeight: 700,
                    color: "var(--text-primary)",
                  }}>
                    {layer.role}
                  </div>
                </div>
                <StatusPill status={layer.status} />
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
                lineHeight: 1.7, margin: "0 0 0.75rem",
              }}>
                {layer.detail}
              </p>
              {layer.items && <BulletList items={layer.items} />}
            </div>
          ))}
        </div>
      </div>

      {/* x402 */}
      <ContentCard title={X402_ARCHITECTURE.title}>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
                     lineHeight: 1.75, margin: "0 0 1rem" }}>
          {X402_ARCHITECTURE.summary}
        </p>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}>
          Payment flow
        </div>
        <BulletList items={X402_ARCHITECTURE.flow} />
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
            color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: "0.65rem",
          }}>
            Target surfaces
          </div>
          <KeyValueTable rows={X402_ARCHITECTURE.targets.map(t => ({
            k: t.use,
            v: `${t.price} · ${t.status}`,
          }))} />
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
          lineHeight: 1.65, margin: "1rem 0 0", fontStyle: "italic",
        }}>
          {X402_ARCHITECTURE.why}
        </p>
      </ContentCard>

      {/* On-chain passport spec */}
      <ContentCard title={PASSPORT_ONCHAIN_SPEC.title}>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
                     lineHeight: 1.75, margin: "0 0 1rem" }}>
          {PASSPORT_ONCHAIN_SPEC.summary}
        </p>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: "0.65rem",
        }}>
          Planned account layout
        </div>
        <KeyValueTable rows={PASSPORT_ONCHAIN_SPEC.accountLayout.map(r => ({
          k: r.field, v: r.desc,
        }))} />
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
            color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: "0.5rem",
          }}>
            Verification instructions (target)
          </div>
          <BulletList items={PASSPORT_ONCHAIN_SPEC.verifyInstruction} />
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: ACCENT,
          lineHeight: 1.65, margin: "1rem 0 0",
        }}>
          {PASSPORT_ONCHAIN_SPEC.privacy}
        </p>
      </ContentCard>

      {/* Integrator quickstart */}
      <ContentCard title="Integrator quickstart">
        <BulletList items={INTEGRATOR_QUICKSTART.steps} />
        <div style={{ marginTop: "1rem" }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
            color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: "0.5rem",
          }}>
            Live endpoints
          </div>
          <BulletList items={INTEGRATOR_QUICKSTART.endpoints} />
        </div>
      </ContentCard>

      <ContentCard title="Related">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {[
            { label: "AIL specification", href: "/docs/ail" },
            { label: "Docs overview", href: "/docs" },
            { label: "Security", href: "/security" },
            { label: "Roadmap", href: "/roadmap" },
            { label: "Get verified", href: "/passport" },
            { label: "Passport spec (52-byte root)", href: "/docs/passport-spec" },
            { label: "Cielo Sunrise (proof asset)", href: "/flagship" },
            { label: "GitHub", href: "https://github.com/worldlabsprotocol-ux/abraxas-app" },
          ].map(link => (
            <Link key={link.href} href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                padding: "0.5rem 1rem", borderRadius: 999,
                border: "1px solid var(--border)", color: ACCENT,
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
              }}>
              {link.label} →
            </Link>
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
