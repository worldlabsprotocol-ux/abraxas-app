"use client";
// FILE: app/developers/integration-studio/IntegrationStudioClient.tsx
// Guided studio plus session-bound sandbox create on Partner Launchpad.

import { useEffect, useMemo, useState } from "react";
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
  trading_venue: "Trading venue access",
  wallet_standard_binding: "Wallet Standard binding",
};

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

type CreatedApp = {
  application_id: string;
  partner_id: string;
  public_slug: string;
  policy_id: string;
  policy_version: number;
  key_prefix: string;
  hosted_verify_url: string;
  policy_template_id: string;
  environment: "sandbox";
};

export function IntegrationStudioClient() {
  const packs = listStudioPackSummaries();
  const [packId, setPackId] = useState(packs[1]?.pack_id ?? packs[0]?.pack_id ?? "age_21_retail");
  const [pathId, setPathId] = useState<IntegrationStudioPathId>("hosted_partner_flow");
  const [signedIn, setSignedIn] = useState(false);
  const [applicationName, setApplicationName] = useState("");
  const [returnUrl, setReturnUrl] = useState("http://localhost:3000/callback");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedApp | null>(null);
  const [pathInstructions, setPathInstructions] = useState<Record<string, { title: string; docs: string; code: string }> | null>(null);
  const [hostedDocs, setHostedDocs] = useState<{ hosted_link?: string; sandbox_testing?: string[] } | null>(null);

  const contract = useMemo(() => studioPackContract(packId), [packId]);
  const snippet = useMemo(() => studioSnippetForPath(pathId), [pathId]);
  const createdSnippet = pathInstructions?.[pathId] ?? snippet;

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/launchpad/auth/session", { credentials: "include" });
        const data = await res.json() as { authenticated?: boolean };
        setSignedIn(Boolean(data.authenticated));
      } catch {
        setSignedIn(false);
      }
    })();
  }, []);

  async function createSandbox() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/developers/integration-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          application_name: applicationName,
          policy_template_id: packId,
          return_url: returnUrl,
          environment: "sandbox",
          idempotency_key: `studio-${packId}-${applicationName.trim().toLowerCase()}`,
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        code?: string;
        api_key?: string | null;
        idempotency_replay?: boolean;
        application?: CreatedApp;
        path_instructions?: Record<string, { title: string; docs: string; code: string }>;
        docs?: { hosted_link?: string; sandbox_testing?: string[] };
      };
      if (!res.ok) {
        setError(data.error === "production_denied" || data.code === "production_denied"
          ? "Production credentials are not self-service."
          : (data.error ?? data.code ?? "Could not create sandbox"));
        return;
      }
      if (data.application) setCreated(data.application);
      if (data.api_key) setRevealedKey(data.api_key);
      if (data.path_instructions) setPathInstructions(data.path_instructions);
      if (data.docs) setHostedDocs(data.docs);
      if (data.idempotency_replay) {
        setError("This sandbox already exists. The key is not shown again.");
      }
    } catch {
      setError("Could not create sandbox");
    } finally {
      setSubmitting(false);
    }
  }

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

      <ContentCard title={`4. ${createdSnippet.title}`}>
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          Existing implementation. Docs:{" "}
          <Link href={createdSnippet.docs} style={{ color: "var(--accent)", fontWeight: 700 }}>{createdSnippet.docs}</Link>
        </p>
        {pathId === "solana_gate" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Receipt-gated claim access only. No transaction, mint, wallet custody, or fund movement.
          </p>
        )}
        {pathId === "trading_venue" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Policy pack, then Partner Flow, then a minimum approved receipt, then a venue preflight for Enable market access. Lifecycle and webhook events re-check the public receipt. No trades, wallets, tokens, or funds movement. Venue-neutral. No named exchange partnership.
          </p>
        )}
        {pathId === "wallet_standard_binding" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Optional. Bind a self-custodial wallet to one action contract when a venue or membership check needs it. This is not identity verification and does not reveal a wallet address, balances, or keys. Passport, Partner Flow, and receipt verification still work with no wallet connected.
          </p>
        )}
        {created && hostedDocs?.hosted_link && pathId === "hosted_partner_flow" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Hosted verify for this app uses slug <strong>{created.public_slug}</strong>. The key is never placed in this URL.
          </p>
        )}
        <pre
          style={{
            fontFamily: MONO,
            fontSize: "0.64rem",
            overflowX: "auto",
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "1rem",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          {createdSnippet.code}
        </pre>
      </ContentCard>

      <ContentCard title="5. Create a sandbox integration">
        <p style={{ ...body, marginBottom: "0.75rem" }}>{INTEGRATION_STUDIO_PROVISION.notice}</p>
        {!signedIn && (
          <p style={{ ...body, marginBottom: "0.85rem" }}>
            Sign in on Partner Launchpad first. Studio then creates a sandbox app on your tenant.
          </p>
        )}
        {signedIn && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void createSandbox();
            }}
            style={{ display: "grid", gap: "0.7rem", marginBottom: "0.9rem" }}
          >
            <label style={body}>
              Sandbox application name
              <input
                value={applicationName}
                onChange={(event) => setApplicationName(event.target.value)}
                required
                autoComplete="off"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "0.3rem",
                  padding: "0.55rem 0.7rem",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface-inset)",
                  color: "var(--text-primary)",
                  fontFamily: FONT,
                }}
              />
            </label>
            <label style={body}>
              Development callback (allowlisted)
              <input
                value={returnUrl}
                onChange={(event) => setReturnUrl(event.target.value)}
                required
                autoComplete="off"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "0.3rem",
                  padding: "0.55rem 0.7rem",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface-inset)",
                  color: "var(--text-primary)",
                  fontFamily: FONT,
                }}
              />
            </label>
            <p style={body}>Policy pack: {contract?.display_name ?? packId}. Environment: sandbox only.</p>
            <Btn
              size="sm"
              disabled={submitting || !applicationName.trim()}
              loading={submitting}
              onClick={() => void createSandbox()}
            >
              {INTEGRATION_STUDIO_PROVISION.create_sandbox_cta}
            </Btn>
          </form>
        )}
        {error && <p style={{ ...body, color: "var(--danger, #f87171)", marginBottom: "0.7rem" }}>{error}</p>}
        {revealedKey && (
          <div style={{ ...body, marginBottom: "0.85rem" }}>
            <p style={{ margin: "0 0 0.4rem" }}>Sandbox key. Shown once. Copy it now.</p>
            <code style={{ fontFamily: MONO, fontSize: "0.72rem", wordBreak: "break-all" }}>{revealedKey}</code>
          </div>
        )}
        {created && (
          <p style={{ ...body, marginBottom: "0.85rem" }}>
            App {created.public_slug} · prefix {created.key_prefix} · policy {created.policy_id}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {!signedIn && (
            <Btn href={INTEGRATION_STUDIO_PROVISION.launchpad_href} size="sm">Sign in on Partner Launchpad →</Btn>
          )}
          <Btn href={INTEGRATION_STUDIO_PROVISION.launchpad_href} variant="secondary" size="sm">
            {INTEGRATION_STUDIO_PROVISION.production_upgrade_cta} →
          </Btn>
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
