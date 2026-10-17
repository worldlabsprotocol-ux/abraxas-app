"use client";
// FILE: app/developers/institutional-integration/InstitutionalIntegrationClient.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { AbxInstitutionalWorkspaceShell } from "@/components/design/AbxInstitutionalWorkspaceShell";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
  INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
} from "@/lib/partner/launchpad/institutionalActivationEntry";
import type { InstitutionalIntegrationWorkspacePayload } from "@/lib/partner/launchpad/institutionalIntegrationWorkspace";
import { InstitutionalDeveloperJourneyNav } from "@/components/developers/InstitutionalDeveloperJourneyNav";
import { InstitutionalTaskOnboardingPanel } from "@/components/developers/InstitutionalTaskOnboardingPanel";
import { InstitutionalVerificationRequirementsPanel } from "@/components/developers/InstitutionalVerificationRequirementsPanel";
import { InstitutionalFirstVerifiedOutcomePanel } from "@/components/partner/launchpad/InstitutionalFirstVerifiedOutcomePanel";
import { deriveInstitutionalTaskOnboarding } from "@/lib/partner/launchpad/institutionalTaskOnboarding";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
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

interface ApplicationOption {
  id: string;
  display_name: string;
  environment: string;
  policy_template_id: string;
}

function stepStatusColor(status: string): string {
  if (status === "complete") return "#10B981";
  if (status === "blocked") return "#F87171";
  if (status === "current") return "var(--accent)";
  return "var(--text-muted)";
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function InstitutionalIntegrationClient() {
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [applications, setApplications] = useState<ApplicationOption[]>([]);
  const [partnerLabel, setPartnerLabel] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<InstitutionalIntegrationWorkspacePayload | null>(null);
  const [sdkSnippet, setSdkSnippet] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const institutionalApps = useMemo(
    () => applications.filter((a) => a.policy_template_id === "sandbox_institutional_protocol_access"),
    [applications],
  );

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/launchpad/auth/session", { credentials: "include" });
    if (!res.ok) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }
    const session = await res.json();
    setAuthenticated(Boolean(session.authenticated));
    if (!session.authenticated) {
      setLoading(false);
      return;
    }
    const appsRes = await fetch("/api/launchpad/applications", { credentials: "include" });
    if (!appsRes.ok) {
      setLoadError("Could not load partner applications.");
      setLoading(false);
      return;
    }
    const appsBody = await appsRes.json();
    setPartnerLabel(typeof appsBody.display_name === "string" ? appsBody.display_name : null);
    const list = Array.isArray(appsBody.applications) ? appsBody.applications : [];
    setApplications(
      list.map((row: ApplicationOption) => ({
        id: row.id,
        display_name: row.display_name,
        environment: row.environment,
        policy_template_id: row.policy_template_id,
      })),
    );
    const queryApp = searchParams.get("application")?.trim();
    const institutional = list.filter(
      (a: ApplicationOption) => a.policy_template_id === "sandbox_institutional_protocol_access",
    );
    const initial =
      (queryApp && institutional.some((a: ApplicationOption) => a.id === queryApp) ? queryApp : null)
      ?? institutional[0]?.id
      ?? null;
    setActiveAppId(initial);
    setLoading(false);
  }, [searchParams]);

  const loadWorkspace = useCallback(async (applicationId: string) => {
    setLoadError(null);
    setWorkspace(null);
    const res = await fetch(`/api/launchpad/applications/${applicationId}/institutional-integration`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(typeof body.message === "string" ? body.message : body.code ?? "load_failed");
      return;
    }
    setWorkspace(body.workspace as InstitutionalIntegrationWorkspacePayload);
    setSdkSnippet(typeof body.sdk_snippet === "string" ? body.sdk_snippet : "");
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (authenticated && activeAppId) {
      void loadWorkspace(activeAppId);
    }
  }, [authenticated, activeAppId, loadWorkspace]);

  const onCopy = async (label: string, text: string) => {
    const ok = await copyText(text);
    setCopyNotice(ok ? `${label} copied` : `Could not copy ${label}`);
    setTimeout(() => setCopyNotice(null), 2500);
  };

  const taskOnboarding = useMemo(
    () =>
      deriveInstitutionalTaskOnboarding({
        hasInstitutionalApplication: institutionalApps.length > 0,
        applicationId: activeAppId,
        binding: workspace?.binding ?? null,
        activation: workspace?.activation ?? null,
        hostedVerificationHref: workspace?.links.hosted_verification ?? null,
      }),
    [institutionalApps.length, activeAppId, workspace],
  );

  if (loading) {
    return (
      <AbxInstitutionalWorkspaceShell aria-label="Institutional integration workspace">
        <PageHeader
          eyebrow="Institutional integration"
          title="Institutional integration workspace"
          subtitle="Loading session…"
        />
      </AbxInstitutionalWorkspaceShell>
    );
  }

  if (authenticated === false) {
    return (
      <AbxInstitutionalWorkspaceShell aria-label="Institutional integration workspace">
        <PageHeader
          eyebrow="Institutional integration"
          title="Sign in to configure institutional integration"
          subtitle="Use Partner Launchpad authentication. This workspace reuses your authorized partner tenant — no parallel customer account."
        />
        <ContentCard title="Authentication required">
          <p style={body}>
            Institutional SDK delivery, trust configuration, and verification journey steps require an authenticated Launchpad session bound to your partner organization.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
            <Btn href={`/developers/launchpad?return=${encodeURIComponent(INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF)}`} size="sm">
              Sign in via Launchpad
            </Btn>
            <Btn href="/developers/institutional-verification" size="sm" variant="ghost">
              Public SDK documentation
            </Btn>
          </div>
        </ContentCard>
      </AbxInstitutionalWorkspaceShell>
    );
  }

  return (
    <AbxInstitutionalWorkspaceShell aria-label="Institutional integration workspace">
      <PageHeader
        eyebrow={partnerLabel ? `Partner · ${partnerLabel}` : "Institutional integration workspace"}
        title="Connect application"
        subtitle="Verify in sandbox, inspect receipts, then request Production."
      />

      {copyNotice && (
        <p style={{ ...body, color: "var(--accent)", marginBottom: "0.75rem" }} role="status">
          {copyNotice}
        </p>
      )}

      <InstitutionalTaskOnboardingPanel onboarding={taskOnboarding} />

      <ContentCard title="Your application">
        {institutionalApps.length === 0 ? (
          <>
            <p style={body}>
              No sandbox institutional protocol access application exists for this partner yet. Create one in Launchpad — policy template{" "}
              <code style={inlineCode}>sandbox_institutional_protocol_access</code> is server-pinned.
            </p>
            <Btn href={INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF} size="sm" style={{ marginTop: "0.75rem" }}>
              Open institutional Launchpad
            </Btn>
          </>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            <label style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Authorized application
              <select
                value={activeAppId ?? ""}
                onChange={(e) => setActiveAppId(e.target.value)}
                style={{
                  display: "block",
                  marginTop: "0.35rem",
                  width: "100%",
                  maxWidth: 480,
                  fontFamily: FONT,
                  fontSize: "0.85rem",
                  padding: "0.5rem 0.65rem",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                }}
              >
                {institutionalApps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.display_name} · {app.environment}
                  </option>
                ))}
              </select>
            </label>
            {loadError && (
              <p style={{ ...body, color: "#F87171" }} role="alert">
                {loadError}
              </p>
            )}
          </div>
        )}
      </ContentCard>

      <InstitutionalDeveloperJourneyNav
        title="Quick links"
        currentStepId={taskOnboarding.current_step_id}
        compact
      />

      {workspace && (
        <>
          <InstitutionalVerificationRequirementsPanel
            selectedPolicyTemplateId={workspace.binding.policy_template_id}
            launchpadHref={workspace.links.launchpad}
          />

          {workspace.first_verified_outcome ? (
            <InstitutionalFirstVerifiedOutcomePanel outcome={workspace.first_verified_outcome} />
          ) : null}

          <ContentCard title="Receipt and activity">
            <p style={body}>
              Server-side holder consent and signed receipts for this tenant. External SDK verification runs on your infrastructure.
            </p>
            <Btn href={workspace.links.launchpad} size="sm" variant="secondary">
              View activity
            </Btn>
          </ContentCard>

          <details>
            <summary style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", marginBottom: "0.75rem" }}>
              Advanced setup
            </summary>

          <ContentCard title="Application ↔ SDK binding">
            <BulletList
              items={[
                `Partner ID: ${workspace.binding.partner_id}`,
                `Application slug: ${workspace.binding.public_slug}`,
                `Policy: ${workspace.binding.policy_id} (v${workspace.binding.policy_version})`,
                `Environment: ${workspace.binding.environment}${workspace.binding.production_blocked ? " — production institutional policy blocked" : ""}`,
                `Receipt audience / partner scope: ${workspace.binding.receipt_audience}`,
              ]}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
              <Btn href={workspace.links.launchpad} size="sm" variant="secondary">
                Launchpad
              </Btn>
              <Btn href={workspace.links.hosted_verification} size="sm" variant="ghost">
                Hosted verification
              </Btn>
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => void onCopy("Binding JSON", JSON.stringify(workspace.binding, null, 2))}
              >
                Copy binding JSON
              </Btn>
            </div>
          </ContentCard>

          <ContentCard title="Controlled SDK delivery">
            <p style={body}>
              Package <code style={inlineCode}>{workspace.sdk_release.package_name}</code> v
              <code style={inlineCode}>{workspace.sdk_release.package_version}</code>
              {" · "}
              contract <code style={inlineCode}>{workspace.sdk_release.contract_version}</code>
              {" · "}
              digest v<code style={inlineCode}>{workspace.sdk_release.digest_version}</code>
            </p>
            <p style={{ ...body, marginTop: "0.5rem" }}>
              Status:{" "}
              <strong style={{ color: "var(--text-primary)" }}>{workspace.sdk_release.release_status}</strong>
              {" — "}
              {workspace.sdk_release.notice}
            </p>
            {workspace.sdk_release.integrity.approved_tarball_sha256 && (
              <p style={{ ...body, marginTop: "0.5rem" }}>
                Founder-approved SHA-256{" "}
                <code style={inlineCode}>{workspace.sdk_release.integrity.approved_tarball_sha256}</code>
                {workspace.sdk_release.integrity.artifact_matches_approved_digest
                  ? " · deployment artifact matches"
                  : " · deployment artifact not verified"}
              </p>
            )}
            {workspace.sdk_release.entitlement.status !== "granted" && (
              <p style={{ ...body, marginTop: "0.5rem" }}>
                Entitlement:{" "}
                <strong style={{ color: "var(--text-primary)" }}>{workspace.sdk_release.entitlement.status}</strong>
                {workspace.sdk_release.entitlement.reason_code
                  ? ` (${workspace.sdk_release.entitlement.reason_code})`
                  : ""}
              </p>
            )}
            <pre className="abx-code-scroll" style={{ ...codeBlock, marginTop: "0.75rem" }}>
              {workspace.sdk_release.installation.npm_install_from_tarball}
            </pre>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
              {workspace.sdk_release.download.available && workspace.sdk_release.download.href ? (
                <Btn href={workspace.sdk_release.download.href} size="sm">
                  Download authorized tarball
                </Btn>
              ) : (
                <Btn href={workspace.sdk_release.request_access_href} size="sm" variant="secondary">
                  Request SDK access
                </Btn>
              )}
              <Btn href={workspace.links.institutional_verification_docs} size="sm" variant="ghost">
                Documentation
              </Btn>
              <Link href={workspace.sdk_release.migration_href} style={{ alignSelf: "center", fontSize: "0.78rem" }}>
                Migration notes
              </Link>
            </div>
          </ContentCard>

          <ContentCard title="Issuer trust configuration">
            <p style={body}>
              Pin digest v2 receipt key material independently. Network fetch without a mandatory digest pin is rejected by the SDK.
            </p>
            <BulletList
              items={[
                `Receipt key digest: ${workspace.trust.receipt_key_document_digest ?? "unavailable in this deployment"}`,
                `Receipt key environment: ${workspace.trust.receipt_key_environment ?? "—"}`,
                workspace.trust.bootstrap_notice,
                ...workspace.trust.trust_errors,
              ]}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
              <Btn href={workspace.trust.registry_paths.verification_contract} size="sm" variant="secondary">
                Verification contract JSON
              </Btn>
              <Btn href={workspace.trust.registry_paths.well_known} size="sm" variant="ghost">
                Well-known trust
              </Btn>
              <Btn href={workspace.trust.registry_paths.receipt_public_keys} size="sm" variant="ghost">
                Receipt public keys
              </Btn>
            </div>
            <pre className="abx-code-scroll" style={{ ...codeBlock, marginTop: "0.75rem" }}>
              {`# Required env keys (operate on your infrastructure)
${workspace.trust.env_keys.receipt_registry}=<offline registry JSON>
${workspace.trust.env_keys.pinned_digest}=${workspace.trust.receipt_key_document_digest ?? "<digest v2 pin>"}
${workspace.trust.env_keys.portable_revocation_issuer_trust}=<authenticated issuer trust JSON>
${workspace.trust.env_keys.consumption_store_dir}=/var/lib/your-rp/receipt-consumption`}
            </pre>
          </ContentCard>

          <ContentCard title="SDK verification snippet (this application)">
            <pre className="abx-code-scroll" style={codeBlock}>{sdkSnippet}</pre>
            <Btn
              size="sm"
              variant="secondary"
              style={{ marginTop: "0.75rem" }}
              onClick={() => void onCopy("SDK snippet", sdkSnippet)}
            >
              Copy snippet
            </Btn>
          </ContentCard>

          <ContentCard title="Verification journey">
            <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.85rem" }}>
              {workspace.journey_steps.map((step) => (
                <li key={step.id} style={{ listStyle: "decimal" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.35rem" }}>
                    <span style={{ fontWeight: 700, color: stepStatusColor(step.status) }}>
                      {step.status.replace("_", " ")}
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{step.title}</span>
                  </div>
                  <p style={{ ...body, marginTop: "0.35rem" }}>{step.detail}</p>
                  {step.action_href && step.action_label && (
                    <Btn href={step.action_href} size="sm" variant="ghost" style={{ marginTop: "0.35rem" }}>
                      {step.action_label}
                    </Btn>
                  )}
                </li>
              ))}
            </ol>
          </ContentCard>

          <ContentCard title="External verification on your infrastructure">
            <p style={body}>{workspace.external_verification.notice}</p>
            <p style={{ ...body, marginTop: "0.5rem" }}>{workspace.external_verification.telemetry_disclaimer}</p>
            <pre className="abx-code-scroll" style={{ ...codeBlock, marginTop: "0.75rem" }}>
              {workspace.external_verification.evidence_command}
            </pre>
            <p style={{ ...body, marginTop: "0.5rem" }}>
              Operator runbook:{" "}
              <code style={inlineCode}>{workspace.external_verification.runbook_relative_path}</code>
              {" · "}
              Status:{" "}
              <strong style={{ color: "var(--text-primary)" }}>{workspace.external_verification.status}</strong>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
              <Btn
                size="sm"
                variant="secondary"
                onClick={() => void onCopy("Evidence command", workspace.external_verification.evidence_command)}
              >
                Copy evidence command
              </Btn>
              <Btn href={workspace.links.institutional_verification_docs} size="sm" variant="ghost">
                SDK verifier docs
              </Btn>
              <Btn href={workspace.links.independent_verifier_handoff} size="sm" variant="ghost">
                Independent verifier handoff
              </Btn>
            </div>
          </ContentCard>

          </details>
        </>
      )}

      {!workspace && institutionalApps.length > 0 && activeAppId && !loadError && (
        <p style={body}>Loading integration details for the selected application…</p>
      )}
    </AbxInstitutionalWorkspaceShell>
  );
}
