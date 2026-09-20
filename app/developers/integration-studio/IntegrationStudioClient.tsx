"use client";
// FILE: app/developers/integration-studio/IntegrationStudioClient.tsx
// Guided studio plus session-bound sandbox create on Partner Launchpad.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  INTEGRATION_STUDIO_PATHS,
  INTEGRATION_STUDIO_PROVISION,
  listStudioPackSummaries,
  studioPackContract,
  studioSnippetForPath,
  type IntegrationStudioPathId,
} from "@/lib/partner/integrationStudio";
import {
  STARTER_KIT_DOES_NOT_DO,
  STARTER_KIT_MINIMUM_REQUIREMENTS,
  STARTER_KIT_PLATFORM_MATRIX,
  type StarterKitPlatform,
} from "@/lib/partner/starterKit/contract";
import {
  PARTNER_ACTIVATION_CREATE_CTA,
  PARTNER_ACTIVATION_PRODUCTION,
  PARTNER_ACTIVATION_RESUME_CTA,
  buildPartnerActivationChecklist,
  launchpadResumeHref,
  launchpadSandboxTestHref,
} from "@/lib/partner/activationPath";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const PATH_LABEL: Record<IntegrationStudioPathId, string> = {
  hosted_partner_flow: "Hosted Partner Flow",
  server_receipt_verify: "Server receipt verification",
  webhook_events: "Webhook / event delivery",
  solana_gate: "Solana eligibility gate",
  trading_venue: "Trading venue access",
  wallet_standard_binding: "Wallet Standard binding",
  payment_authorization: "Payment and commerce",
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
  const [platform, setPlatform] = useState<StarterKitPlatform>("universal_https");
  const [optionalCaps, setOptionalCaps] = useState<string[]>([]);
  const [kitError, setKitError] = useState("");
  const [kitBusy, setKitBusy] = useState(false);
  const [kitFiles, setKitFiles] = useState<Array<{ path: string; contents: string }>>([]);
  const [kitArchive, setKitArchive] = useState("");
  const [kitFilename, setKitFilename] = useState("abraxas-starter-kit.zip");
  const [copiedPath, setCopiedPath] = useState("");
  const [pathInstructions, setPathInstructions] = useState<Record<string, { title: string; docs: string; code: string }> | null>(null);
  const [hostedDocs, setHostedDocs] = useState<{ hosted_link?: string; sandbox_testing?: string[] } | null>(null);
  const [resumeApp, setResumeApp] = useState<{ id: string; application_name: string; public_slug: string } | null>(null);

  const contract = useMemo(() => studioPackContract(packId), [packId]);
  const snippet = useMemo(() => studioSnippetForPath(pathId), [pathId]);
  const createdSnippet = pathInstructions?.[pathId] ?? snippet;
  const activationChecklist = useMemo(() => buildPartnerActivationChecklist(optionalCaps), [optionalCaps]);

  function toggleCapability(id: string) {
    setOptionalCaps((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function generateStarter() {
    setKitError("");
    setKitBusy(true);
    try {
      const res = await fetch("/api/developers/integration-studio/starter-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pack_id: packId,
          path: pathId,
          platform,
          capabilities: optionalCaps,
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        filename?: string;
        files?: Array<{ path: string; contents: string }>;
        archive_base64?: string;
      };
      if (!res.ok || !data.ok || !data.files || !data.archive_base64) {
        setKitError(data.error ?? "Could not generate starter kit");
        setKitFiles([]);
        setKitArchive("");
        return;
      }
      setKitFiles(data.files);
      setKitArchive(data.archive_base64);
      setKitFilename(data.filename ?? "abraxas-starter-kit.zip");
    } catch {
      setKitError("Could not generate starter kit");
    } finally {
      setKitBusy(false);
    }
  }

  function downloadArchive() {
    if (!kitArchive) return;
    const bytes = Uint8Array.from(atob(kitArchive), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = kitFilename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadFile(file: { path: string; contents: string }) {
    const blob = new Blob([file.contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.path.split("/").pop() ?? file.path;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function copyFile(file: { path: string; contents: string }) {
    void navigator.clipboard.writeText(file.contents).then(() => {
      setCopiedPath(file.path);
      setTimeout(() => setCopiedPath(""), 1600);
    });
  }

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/launchpad/auth/session", { credentials: "include" });
        const data = await res.json() as { authenticated?: boolean };
        const authenticated = Boolean(data.authenticated);
        setSignedIn(authenticated);
        if (!authenticated) {
          setResumeApp(null);
          return;
        }
        const workspaceRes = await fetch("/api/launchpad/applications", { credentials: "include" });
        const workspace = await workspaceRes.json() as {
          workspace?: { applications?: Array<{ id: string; application_name: string; public_slug: string }> };
        };
        const first = workspace.workspace?.applications?.[0];
        setResumeApp(first ?? null);
      } catch {
        setSignedIn(false);
        setResumeApp(null);
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
      {resumeApp && (
        <ContentCard title={PARTNER_ACTIVATION_RESUME_CTA}>
          <p style={{ ...body, marginBottom: "0.75rem" }}>
            Signed in. Resume {resumeApp.application_name} ({resumeApp.public_slug}) on Partner Launchpad. Readiness stays on existing Launchpad evidence.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href={launchpadSandboxTestHref(resumeApp.id)} size="sm">Test your sandbox integration →</Btn>
            <Btn href={launchpadResumeHref(resumeApp.id)} variant="secondary" size="sm">{PARTNER_ACTIVATION_RESUME_CTA} →</Btn>
          </div>
        </ContentCard>
      )}

      <ContentCard title="Discover · Choose a policy pack">
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
        <ContentCard title="Discover · Narrow result">
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

      <ContentCard title="Discover · Choose an integration path">
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

      <ContentCard title={`Discover · ${createdSnippet.title}`}>
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
        {pathId === "payment_authorization" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Policy pack, then Partner Flow, then a minimum approved receipt, then a payment preflight for checkout or recurring authorization. The merchant then runs its own payment flow. Webhooks re-check the public receipt and never grant access. No charges, transfers, Circle calls, or funds movement.
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

      <ContentCard title="Integrate · Generate starter kit">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Universal HTTPS is the canonical starter. A static or browser-only site cannot verify receipts or hold partner secrets.
        </p>
        <ul style={{ ...body, paddingLeft: "1.1rem", marginBottom: "0.75rem", display: "grid", gap: "0.3rem" }}>
          {STARTER_KIT_MINIMUM_REQUIREMENTS.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p style={{ ...body, marginBottom: "0.55rem", fontWeight: 700, color: "var(--text-primary)" }}>Platform</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.75rem" }}>
          {STARTER_KIT_PLATFORM_MATRIX.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPlatform(item.id)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: 999,
                border: platform === item.id ? "1px solid rgba(45,212,191,0.55)" : "1px solid var(--border)",
                background: platform === item.id ? "rgba(45,212,191,0.12)" : "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {item.label}{item.canonical ? " · canonical" : ""}
            </button>
          ))}
        </div>
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          {STARTER_KIT_PLATFORM_MATRIX.find((item) => item.id === platform)?.note}
          {" Works with: "}
          {(STARTER_KIT_PLATFORM_MATRIX.find((item) => item.id === platform)?.works ?? []).join(", ")}.
        </p>
        <p style={{ ...body, marginBottom: "0.55rem", fontWeight: 700, color: "var(--text-primary)" }}>Optional capabilities</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.75rem" }}>
          {["webhooks", "wallet_standard_binding", "trading_venue", "payment_authorization", "solana_gate"].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleCapability(id)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: 999,
                border: optionalCaps.includes(id) ? "1px solid rgba(99,102,241,0.55)" : "1px solid var(--border)",
                background: optionalCaps.includes(id) ? "rgba(99,102,241,0.14)" : "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {id.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: "0.85rem" }}>
          <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>What this starter kit does not do</p>
          <ul style={{ ...body, paddingLeft: "1.1rem", display: "grid", gap: "0.3rem" }}>
            {STARTER_KIT_DOES_NOT_DO.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Btn size="sm" loading={kitBusy} disabled={kitBusy} onClick={() => void generateStarter()}>
            Generate starter kit
          </Btn>
          {kitArchive && (
            <Btn size="sm" variant="secondary" onClick={downloadArchive}>Download zip project</Btn>
          )}
        </div>
        {kitError && <p style={{ ...body, color: "var(--danger, #f87171)", marginBottom: "0.7rem" }}>{kitError}</p>}
        {kitFiles.length > 0 && (
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <p style={{ ...body, marginBottom: 0 }}>{kitFiles.length} files. Copy or download each file, or take the zip. No secrets included.</p>
            {kitFiles.map((file) => (
              <div key={file.path} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.55rem 0.7rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap", fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>
                  <span>{file.path}</span>
                  <span>
                    <button type="button" onClick={() => copyFile(file)} style={{ marginRight: 8, cursor: "pointer" }}>
                      {copiedPath === file.path ? "Copied" : "Copy"}
                    </button>
                    <button type="button" onClick={() => downloadFile(file)} style={{ cursor: "pointer" }}>Download</button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentCard>

      <ContentCard title={`Create · ${PARTNER_ACTIVATION_CREATE_CTA}`}>
        <p style={{ ...body, marginBottom: "0.75rem" }}>{INTEGRATION_STUDIO_PROVISION.notice}</p>
        {!signedIn && (
          <p style={{ ...body, marginBottom: "0.85rem" }}>
            Explore the catalog without a session. Sign in on Partner Launchpad to create an isolated sandbox app on your tenant. The raw sandbox key is shown once.
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
              {PARTNER_ACTIVATION_CREATE_CTA}
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
          {created && (
            <Btn href={launchpadResumeHref(created.application_id)} size="sm">
              {PARTNER_ACTIVATION_RESUME_CTA} →
            </Btn>
          )}
          <Btn href={created ? launchpadResumeHref(created.application_id) : INTEGRATION_STUDIO_PROVISION.launchpad_href} variant="secondary" size="sm">
            {INTEGRATION_STUDIO_PROVISION.production_upgrade_cta} →
          </Btn>
          <Btn href={INTEGRATION_STUDIO_PROVISION.partner_portal_href} variant="ghost" size="sm">Partner portal →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Test · Sandbox checklist">
        <ol style={{ ...body, paddingLeft: "1.15rem", display: "grid", gap: "0.55rem" }}>
          {activationChecklist.map((item) => (
            <li key={item.id}>
              <strong>{item.title}.</strong> {item.body}{" "}
              <Link href={item.href} style={{ color: "var(--accent)", fontWeight: 700 }}>{item.href}</Link>
              {item.kit_file ? ` · kit file ${item.kit_file}` : ""}
            </li>
          ))}
        </ol>
      </ContentCard>

      <ContentCard title="Upgrade · Production review">
        <p style={body}>{PARTNER_ACTIVATION_PRODUCTION.notice}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Btn href={created ? launchpadResumeHref(created.application_id) : INTEGRATION_STUDIO_PROVISION.launchpad_href} size="sm">
            Open Launchpad readiness →
          </Btn>
        </div>
      </ContentCard>
    </>
  );
}
