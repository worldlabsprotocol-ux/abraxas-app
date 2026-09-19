"use client";
// FILE: app/developers/integration-studio/IntegrationStudioClient.tsx
// Guided public studio. Provisioning stays on Launchpad / design-partner.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  INTEGRATION_STUDIO_CHECKLIST,
  INTEGRATION_STUDIO_PATHS,
  INTEGRATION_STUDIO_PROVISION,
  listStudioPackSummaries,
  studioPackContract,
  studioSnippetForPath,
  type IntegrationStudioPathId,
} from "@/lib/partner/integrationStudio";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const PATH_LABEL: Record<IntegrationStudioPathId, string> = {
  hosted_partner_flow: "Hosted Partner Flow",
  server_receipt_verify: "Server receipt verification",
  webhook_events: "Webhook / event delivery",
  solana_gate: "Solana eligibility gate",
};

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

export function IntegrationStudioClient() {
  const packs = listStudioPackSummaries();
  const [packId, setPackId] = useState(packs[1]?.pack_id ?? packs[0]?.pack_id ?? "age_21_retail");
  const [pathId, setPathId] = useState<IntegrationStudioPathId>("hosted_partner_flow");

  const contract = useMemo(() => studioPackContract(packId), [packId]);
  const snippet = useMemo(() => studioSnippetForPath(pathId), [pathId]);

  return (
    <>
      <ContentCard title="1. Choose a policy pack">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          These are the same packs Partner Launchpad uses. Identity or liveness is never the default path.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {packs.map((pack) => (
            <button
              key={pack.pack_id}
              type="button"
              onClick={() => setPackId(pack.pack_id)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: 999,
                border: pack.pack_id === packId ? "1px solid rgba(45,212,191,0.55)" : "1px solid var(--border)",
                background: pack.pack_id === packId ? "rgba(45,212,191,0.12)" : "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {pack.display_name}
            </button>
          ))}
        </div>
      </ContentCard>

      {contract && (
        <ContentCard title="2. Partner contract">
          <dl style={{ display: "grid", gap: "0.55rem", margin: 0 }}>
            {[
              ["Requirement", contract.requirement],
              ["Purpose", contract.purpose],
              ["Minimum disclosed result", contract.disclosed_result],
              ["Assurance", contract.assurance],
              ["Withheld", contract.withheld.join(", ")],
            ].map(([k, v]) => (
              <div key={k}>
                <dt style={{ ...body, color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</dt>
                <dd style={{ ...body, margin: "0.2rem 0 0", color: "var(--text-primary)" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <p style={{ ...body, marginTop: "0.85rem" }}>{contract.google_is_account_only}</p>
          <p style={{ ...body, marginTop: "0.45rem" }}>
            Identity is default: {String(contract.identity_is_default)}.
          </p>
          <ul style={{ ...body, margin: "0.75rem 0 0", paddingLeft: "1.1rem" }}>
            {contract.methods.map((method) => (
              <li key={method.id}>
                <strong>{method.label}</strong>
                {method.qualifies ? " · can qualify" : " · does not qualify"}
                {" — "}
                {method.why}
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      <ContentCard title="3. Choose an integration path">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {INTEGRATION_STUDIO_PATHS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPathId(id)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: 999,
                border: pathId === id ? "1px solid rgba(99,102,241,0.55)" : "1px solid var(--border)",
                background: pathId === id ? "rgba(99,102,241,0.14)" : "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {PATH_LABEL[id]}
            </button>
          ))}
        </div>
      </ContentCard>

      <ContentCard title={`4. ${snippet.title}`}>
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          Existing implementation. Docs:{" "}
          <Link href={snippet.docs} style={{ color: "var(--accent)", fontWeight: 700 }}>{snippet.docs}</Link>
        </p>
        {pathId === "solana_gate" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Receipt-gated claim access only. No transaction, mint, wallet custody, or fund movement.
          </p>
        )}
        <pre
          style={{
            fontFamily: MONO,
            fontSize: "0.64rem",
            overflowX: "auto",
            padding: "1rem",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          {snippet.code}
        </pre>
      </ContentCard>

      <ContentCard title="5. Provision a sandbox app">
        <p style={{ ...body, marginBottom: "0.75rem" }}>{INTEGRATION_STUDIO_PROVISION.notice}</p>
        <p style={{ ...body, marginBottom: "0.85rem" }}>
          A partner session is required to provision. Sign in or apply, then use Launchpad.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href={INTEGRATION_STUDIO_PROVISION.apply_href} size="sm">Apply for review →</Btn>
          <Btn href={INTEGRATION_STUDIO_PROVISION.launchpad_href} variant="secondary" size="sm">Partner Launchpad →</Btn>
          <Btn href={INTEGRATION_STUDIO_PROVISION.partner_portal_href} variant="ghost" size="sm">Partner portal →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="6. Integration checklist">
        <ol style={{ ...body, paddingLeft: "1.15rem", display: "grid", gap: "0.45rem" }}>
          {INTEGRATION_STUDIO_CHECKLIST.map((item) => (
            <li key={item.id}>
              <strong>{item.title}.</strong> {item.body}
            </li>
          ))}
        </ol>
      </ContentCard>
    </>
  );
}

