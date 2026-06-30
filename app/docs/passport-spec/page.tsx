"use client";
// FILE: app/docs/passport-spec/page.tsx
// Chain-agnostic Passport root specification (Solana + Sui + zkLogin).

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList, KeyValueTable } from "@/components/redesign/RedesignContent";
import {
  PASSPORT_SPEC_INTRO,
  STAMP_BIT_TABLE,
  IMPLEMENTATION_ORDER,
  ZKLOGIN_INTEGRATION,
  PROOF_TYPES,
} from "@/lib/protocolPassportSpec";
import { PASSPORT_SERIALIZED_SIZE } from "@/lib/passport/stamps";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function PassportSpecPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Passport specification"
        title="Chain-agnostic Passport root"
        subtitle={PASSPORT_SPEC_INTRO}
      />

      <ContentCard title="Status">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          <strong style={{ color: ACCENT }}>Pre-mainnet.</strong> No production Passport PDAs or live credentials on Solana mainnet yet.
          This spec is the single logical model both chains will implement before deployment.
        </p>
        <Link href="/api/passport/spec" style={{ fontFamily: MONO, fontSize: "0.72rem", color: ACCENT }}>
          GET /api/passport/spec →
        </Link>
      </ContentCard>

      <ContentCard title={`52-byte fixed layout (${PASSPORT_SERIALIZED_SIZE} bytes LE)`}>
        <KeyValueTable rows={[
          { k: "version", v: "u8 — start at 1", mono: true },
          { k: "stamps", v: "u16 bitmask — 10 verification gates (bits 0–9)", mono: true },
          { k: "authority", v: "32 bytes — issuance authority pubkey/address", mono: true },
          { k: "expires_at", v: "u64 unix seconds — 0 = no expiration", mono: true },
          { k: "revoked", v: "u8 — 0 active, 1 irreversible revoke", mono: true },
          { k: "nonce", v: "u64 — increments on each issuance update", mono: true },
        ]} />
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "1rem 0 0", lineHeight: 1.65 }}>
          Signing domain for Type 0 proofs: <code style={{ fontFamily: MONO, color: ACCENT }}>abraxas-passport-v1</code> prepended to serialized root.
          TypeScript reference: <code style={{ fontFamily: MONO }}>lib/passport/serialize.ts</code>
        </p>
      </ContentCard>

      <ContentCard title="Stamp bitmask (10 gates)">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem", color: "var(--text-muted)" }}>Bit</th>
                <th style={{ padding: "0.5rem", color: "var(--text-muted)" }}>ID</th>
                <th style={{ padding: "0.5rem", color: "var(--text-muted)" }}>Label</th>
              </tr>
            </thead>
            <tbody>
              {STAMP_BIT_TABLE.map(row => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", fontFamily: MONO, color: ACCENT }}>{row.bit}</td>
                  <td style={{ padding: "0.5rem", fontFamily: MONO }}>{row.id}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>

      <ContentCard title="Verification rules (pure function)">
        <BulletList items={[
          "revoked == 0",
          "expires_at == 0 OR current_timestamp < expires_at",
          "(passport.stamps & required_stamps) == required_stamps",
          "Proof validates against authority + current nonce (Type 0 or Type 1)",
        ]} />
      </ContentCard>

      <ContentCard title="Proof types">
        {PROOF_TYPES.map(p => (
          <div key={p.type} style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              {p.type}{" "}
              <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: ACCENT, fontWeight: 700 }}>{p.status.toUpperCase()}</span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.65 }}>{p.detail}</p>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Chain implementations">
        <KeyValueTable rows={[
          { k: "TypeScript", v: "lib/passport/ — serialize, verify, stamp bits", mono: true },
          { k: "Solana", v: "abraxas-program/programs/abraxas-passport/ — PDA + issue_stamps + verify_passport CPI", mono: true },
          { k: "Sui Move", v: "sui/abraxas_passport/sources/passport.move — thin verifier + issuance cap", mono: true },
          { k: "Primary chain", v: "Solana (authoritative root at launch)", mono: false },
          { k: "Secondary", v: "Sui mirror or light-client verify (roadmap)", mono: false },
        ]} />
      </ContentCard>

      <ContentCard title="Sui zkLogin integration (roadmap)">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 1rem" }}>
          {ZKLOGIN_INTEGRATION.summary}
        </p>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Integration flow
        </div>
        <BulletList items={[...ZKLOGIN_INTEGRATION.flow]} />
        <div style={{ marginTop: "1.25rem", fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Gas & signing notes
        </div>
        <BulletList items={[...ZKLOGIN_INTEGRATION.gasNotes]} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
          {ZKLOGIN_INTEGRATION.links.map(l => (
            <Link key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
              style={{ padding: "0.45rem 0.9rem", borderRadius: 999, border: "1px solid var(--border)", color: ACCENT, fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, textDecoration: "none" }}>
              {l.label} ↗
            </Link>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Recommended implementation order">
        <BulletList items={[...IMPLEMENTATION_ORDER]} />
      </ContentCard>

      <ContentCard title="Related">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {[
            { label: "Architecture overview", href: "/docs/architecture" },
            { label: "Get verified", href: "/passport" },
            { label: "GitHub", href: "https://github.com/worldlabsprotocol-ux/abraxas-app" },
          ].map(l => (
            <Link key={l.href} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined}
              style={{ padding: "0.5rem 1rem", borderRadius: 999, border: "1px solid var(--border)", color: ACCENT, fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
              {l.label} →
            </Link>
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
