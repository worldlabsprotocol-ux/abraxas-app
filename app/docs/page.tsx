"use client";
// FILE: app/docs/page.tsx
// Expandable documentation hub — one screen per section.

import Link from "next/link";
import { useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

interface DocSection {
  id: string;
  title: string;
  summary: string;
  body: string;
  links?: Array<{ label: string; href: string }>;
}

const SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Overview",
    summary: "What Abraxas is and why reusable verification matters.",
    body: "Abraxas is reusable trust infrastructure for tokenized assets and permissioned finance. Users verify once; partners check cryptographic proof instead of re-collecting documents.",
    links: [{ label: "Why verification", href: "/docs/why-verification" }],
  },
  {
    id: "getting-started",
    title: "Getting Started",
    summary: "Create a Passport and integrate as a relying party.",
    body: "Sign in with Google at /passport to create a Sui wallet automatically. Complete optional biometric ID verification. Partners call POST /api/credentials/verify with a presentation proof.",
    links: [
      { label: "Passport", href: "/passport" },
      { label: "Integrate", href: "/integrate" },
      { label: "Relying party guide", href: "/docs/relying-party-verify" },
    ],
  },
  {
    id: "architecture",
    title: "Architecture",
    summary: "AIL layers: providers, credentials, registry, compliance.",
    body: "Licensed or Abraxas-native identity capture → W3C Verifiable Credentials (did:sui, Ed25519 JWT) → trust registry and policy engine → partner verification decisions.",
    links: [
      { label: "AIL specification", href: "/docs/ail" },
      { label: "Architecture", href: "/docs/architecture" },
      { label: "Chain", href: "/docs/chain" },
    ],
  },
  {
    id: "identity",
    title: "Identity",
    summary: "Passport, zkLogin, and verification status.",
    body: "Google zkLogin creates a deterministic Sui address. Identity verification is optional but unlocks enhanced trust for payments, asset submission, and partner policies.",
    links: [
      { label: "Passport spec", href: "/docs/passport-spec" },
      { label: "zkLogin setup", href: "/docs/zklogin-setup" },
      { label: "Sui integration", href: "/docs/sui" },
    ],
  },
  {
    id: "biometrics",
    title: "Biometrics",
    summary: "Abraxas Verify — ID, selfie, fraud engine, human review.",
    body: "Users submit legal name, government ID, and selfie. The biometric engine scores face match, liveness, document type, and fraud risk. Borderline cases queue for human review; engine decisions are stored separately from reviewer decisions with an immutable audit log.",
    links: [{ label: "Verify on Passport", href: "/passport" }],
  },
  {
    id: "trust-registry",
    title: "Trust Registry",
    summary: "Portable credentials and permissioned verification.",
    body: "Issued credentials can be presented to relying parties. Partners receive approve/deny/review decisions without receiving raw document images by default.",
    links: [{ label: "Credential portability", href: "/docs/credential-portability" }],
  },
  {
    id: "assets",
    title: "Assets",
    summary: "Verified asset pipeline and tokenization gates.",
    body: "Assets move through staged verification: identity, ownership, legal, due diligence, risk scoring, and marketplace readiness. Each stage produces audit events.",
    links: [{ label: "Submit an asset", href: "/build" }],
  },
  {
    id: "api",
    title: "API",
    summary: "Live endpoints for verification and identity.",
    body: "POST /api/credentials/verify · GET /api/credentials/public-key · POST /api/identity/documents/capture · GET /api/identity/status · POST /api/auth/zklogin/register · GET /api/sui/passport",
    links: [
      { label: "AI agents", href: "/docs/ai-agents" },
      { label: "Partner verification requests", href: "/docs/partner-verification-requests" },
    ],
  },
  {
    id: "security",
    title: "Security",
    summary: "Keys, RLS, audit trails, and responsible disclosure.",
    body: "Service role keys and signing keys are server-side only. Supabase RLS on all tables. Biometric assessments and reviewer actions produce audit records.",
    links: [{ label: "Security page", href: "/security" }],
  },
  {
    id: "roadmap",
    title: "Roadmap",
    summary: "What is live vs in progress.",
    body: "Live: zkLogin Passport, Abraxas Verify biometrics, credential issuance, admin review queue, Cielo pilot. In progress: mainnet deployment, expanded relying partners.",
    links: [
      { label: "Roadmap", href: "/roadmap" },
      { label: "Litepaper", href: "/docs/litepaper" },
      { label: "Live metrics", href: "/metrics" },
    ],
  },
];

function DocAccordionItem({ section, open, onToggle }: {
  section: DocSection;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid var(--border-strong)",
      background: open ? "var(--surface-raised)" : "var(--surface)",
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%", textAlign: "left", padding: "0.85rem 1rem",
          border: "none", background: "transparent", cursor: "pointer",
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)" }}>{section.title}</div>
        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 4 }}>{section.summary}</div>
      </button>
      {open && (
        <div style={{ padding: "0 1rem 1rem", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0.75rem 0" }}>
            {section.body}
          </p>
          {section.links && section.links.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
              {section.links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "0.4rem 0.75rem", borderRadius: 999,
                    border: "1px solid var(--border)", color: ACCENT,
                    fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600, textDecoration: "none",
                  }}
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [openId, setOpenId] = useState<string>("overview");

  return (
    <RedesignPage maxWidth={820}>
      <header style={{ marginBottom: "1.5rem" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.35rem" }}>Documentation</div>
        <h1 style={{ fontFamily: FONT, fontSize: "1.75rem", fontWeight: 900, margin: "0 0 0.5rem", letterSpacing: "-0.03em" }}>
          Protocol docs
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          Expand a section for detail. Each topic fits one screen — go deeper via linked pages.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {SECTIONS.map(section => (
          <DocAccordionItem
            key={section.id}
            section={section}
            open={openId === section.id}
            onToggle={() => setOpenId(prev => (prev === section.id ? "" : section.id))}
          />
        ))}
      </div>
    </RedesignPage>
  );
}
