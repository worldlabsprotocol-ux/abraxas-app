"use client";
// FILE: app/developers/institutional-verification/InstitutionalVerificationClient.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
  type InstitutionalVerificationContractClientView,
} from "@/lib/institutionalVerification/clientSurface";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const REJECTION_CODES = [
  { code: "issuer_untrusted", meaning: "Signing key is not in the institution's pinned receipt verification registry." },
  { code: "tenant_policy_mismatch", meaning: "Receipt policy_id does not match the relying party's configured policy." },
  { code: "replay_detected", meaning: "Single-use consumption guard saw this receipt_id already at this partner/policy scope." },
  { code: "revocation_stale", meaning: "Portable revocation snapshot sequence regressed or failed freshness checks." },
  { code: "trust_material_pin_mismatch", meaning: "Fetched receipt key document digest does not match operator-pinned material." },
  { code: "portable_revocation_unsigned", meaning: "Authorization requires an authenticated portable revocation snapshot." },
] as const;

const EXAMPLE_SNIPPET = `import {
  resolveInstitutionalTrustEnv,
  inspectSignedDecisionReceipt,
  verifySignedDecisionReceipt,
} from "@/lib/institutionalVerification";
import { FileReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";

const trust = await resolveInstitutionalTrustEnv({
  receipt_verification_registry_json: process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY,
  pinned_receipt_key_document_digest: process.env.ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST,
});

if (!trust.ok) throw new Error(trust.code);

// Inspection — no consumption, never grants access
const inspected = await inspectSignedDecisionReceipt({
  signed_record: holderReceipt,
  relying_party: { partner_id: "your-partner", policy_id: "your-policy" },
  request_id: "checkout_inspect",
  trust_env: trust.env,
});

// Authorization — durable replay store + institution revocation feed required
const store = new FileReceiptConsumptionStore(process.env.RP_CONSUMPTION_DIR!);
const decision = await verifySignedDecisionReceipt({
  signed_record: holderReceipt,
  relying_party: { partner_id: "your-partner", policy_id: "your-policy" },
  request_id: "checkout_123",
  trust_env: trust.env,
  consumption_store: store,
  revocation_source: yourInstitutionRevocationFeed,
});

if (!decision.authorize) {
  return res.status(403).json({ errors: decision.rejection_reasons });
}`;

export function InstitutionalVerificationClient() {
  const [contract, setContract] = useState<InstitutionalVerificationContractClientView | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/trust/verification-contract/v1", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setContractError(json.status ?? "unavailable");
          return;
        }
        if (!cancelled) setContract(json as InstitutionalVerificationContractClientView);
      } catch {
        if (!cancelled) setContractError("fetch_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={`Institutional infrastructure · Contract ${INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION}`}
        title="Verify signed trust decisions without Abraxas as your trust root"
        subtitle="Use the supported institutional verification module to validate decision receipts and holder presentations locally. Cryptography, issuer keys, tenant binding, revocation freshness, and replay guards stay fail-closed."
      />

      <ContentCard title="What the verifier checks">
        <BulletList
          items={[
            "Ed25519 receipt signature against your pinned ABRAXAS_RECEIPT_VERIFICATION_REGISTRY (offline).",
            "Partner and policy binding for the relying party scope you configure.",
            "Expiration and revocation signals — unsigned revocation hints are rejected.",
            "Authenticated portable revocation snapshots with monotonic checkpoint advancement.",
            "Optional single-use receipt consumption to block replay at your application boundary.",
            "Cross-application isolation — the same presentation must not authorize under another tenant's policy.",
          ]}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/docs/receipt-key-lifecycle" size="sm" variant="secondary">Receipt key lifecycle</Btn>
          <Btn href="/docs/credential-portability" size="sm" variant="ghost">Credential portability</Btn>
          <Btn href="/developers/integration-studio?pack=sandbox_institutional_protocol_access" size="sm" variant="ghost">
            Institutional sandbox app
          </Btn>
        </div>
      </ContentCard>

      <ContentCard title="Trust material (versioned)">
        {contract ? (
          <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
            <p style={{ margin: "0 0 0.5rem" }}>
              Contract <strong style={{ color: "var(--text-primary)" }}>{contract.contract_version}</strong>
              {" · "}
              Receipt environment <code style={inlineCode}>{contract.trust_material.receipt_key_environment ?? "—"}</code>
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              Pin digest{" "}
              <code style={inlineCode}>{contract.trust_material.receipt_key_document_digest ?? "unavailable"}</code>
            </p>
            <p style={{ margin: 0 }}>
              {contract.trust_material.bootstrap_notice}
            </p>
          </div>
        ) : (
          <p style={body}>
            {contractError
              ? `Live contract document unavailable (${contractError}). Ship pinned registry JSON offline for production integrations.`
              : "Loading verification contract…"}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Btn href="/api/trust/verification-contract/v1" size="sm" variant="secondary">JSON contract</Btn>
          <Btn href="/.well-known/abraxas-trust/v1" size="sm" variant="ghost">Well-known</Btn>
          <Btn href="/api/receipts/verification-keys" size="sm" variant="ghost">Receipt public keys</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Environment capabilities">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {[
            {
              tier: "Local / CI",
              detail: "Use build546/build586 adversarial fixtures and in-memory consumption stores. No network trust root.",
            },
            {
              tier: "Sandbox",
              detail: "Pin sandbox registry JSON + institutional portable revocation trust. Holder-authorized receipts from Launchpad sandbox apps.",
            },
            {
              tier: "Production",
              detail: "Pin production receipt key digest, durable replay store on your infrastructure, and operator-issued portable revocation trust.",
            },
          ].map((row) => (
            <div
              key={row.tier}
              style={{
                padding: "0.85rem 1rem",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.84rem", color: "var(--text-primary)" }}>
                {row.tier}
              </div>
              <p style={{ ...body, marginTop: "0.35rem" }}>{row.detail}</p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Integration module">
        <p style={body}>
          Import from <code style={inlineCode}>@/lib/institutionalVerification</code>
          {" "}
          (monorepo path). The module wraps existing Build #546/#564 cryptographic verifiers — it does not duplicate signature math.
        </p>
        <pre className="abx-code-scroll" style={codeBlock}>{EXAMPLE_SNIPPET}</pre>
        <p style={{ ...body, marginTop: "0.65rem" }}>
          Full backend example:{" "}
          <Link href="https://github.com/worldlabsprotocol-ux/abraxas-app/tree/main/examples/institutional-verifier-backend" style={{ color: "var(--accent)", fontWeight: 700 }}>
            examples/institutional-verifier-backend
          </Link>
        </p>
      </ContentCard>

      <ContentCard title="Rejection reason codes (partner-safe)">
        <div style={{ display: "grid", gap: "0.55rem" }}>
          {REJECTION_CODES.map((row) => (
            <div key={row.code} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 34%) 1fr", gap: "0.65rem" }}>
              <code style={{ ...inlineCode, alignSelf: "start" }}>{row.code}</code>
              <span style={body}>{row.meaning}</span>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Separation of concerns">
        <BulletList
          items={[
            "Receipt verification — cryptographic authenticity + registry (this module).",
            "Application policy enforcement — your product rules after authorize === true.",
            "Issuer trust configuration — pinned env + optional digest-checked fetch.",
            "Revocation freshness — authenticated portable snapshots + checkpoint store on your side.",
            "Replay state — durable consumption store you operate (filesystem or DB).",
          ]}
        />
        <p style={{ ...body, marginTop: "0.65rem" }}>
          Billing and metering can wrap successful authorize events without making signature verification depend on Abraxas online services.
        </p>
      </ContentCard>
    </>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

const inlineCode: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.78rem",
  padding: "0.1rem 0.35rem",
  borderRadius: 6,
  background: "var(--surface-inset)",
  border: "1px solid var(--border)",
};

const codeBlock: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.62rem",
  lineHeight: 1.55,
  padding: "1rem",
  borderRadius: 12,
  overflowX: "auto",
  background: "var(--surface-inset)",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  margin: 0,
};
