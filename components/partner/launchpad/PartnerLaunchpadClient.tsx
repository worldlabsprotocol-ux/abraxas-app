"use client";
// FILE: components/partner/launchpad/PartnerLaunchpadClient.tsx
// Self service Partner Launchpad — guided sandbox integration workspace.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { LAUNCHPAD_TEST_SCENARIOS } from "@/lib/partner/launchpad/testScenarios";
import type { LaunchpadIntegrationDocs } from "@/lib/partner/launchpad/integrationDocs";
import { slugifyLaunchpadApplication } from "@/lib/partner/launchpad/slug";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { CUSTOM_LAUNCHPAD_CLAIMS, CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/customPolicy";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type WizardStep = "application" | "policy" | "destinations" | "provisioned" | "test" | "production";

interface PolicyTemplate {
  id: string;
  label: string;
  user_explanation: string;
}

interface ApplicationSummary {
  id: string;
  public_slug: string;
  application_name: string;
  display_name: string;
  environment: string;
  policy_template_id: string;
  policy_id: string;
  allowed_return_urls: string[];
  status: string;
  key_prefix: string | null;
  integration_status: string;
}

interface Workspace {
  partner_id: string;
  display_name: string;
  environment: string;
  applications: ApplicationSummary[];
}

interface ActivityEvent {
  id: string;
  event_type: string;
  public_code: string | null;
  created_at: string;
}

interface DomainVerification {
  hostname: string;
  challenge_token: string;
  status: "pending" | "verified" | "expired" | "failed";
  expires_at: string;
  verified_at: string | null;
  last_error: string | null;
}

interface IntegrationHealth {
  overall: "pass" | "action_required" | "blocked";
  checks: Array<{ id: string; label: string; status: "pass" | "action_required" | "blocked"; detail: string }>;
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "application", label: "Application" },
  { id: "policy", label: "Proof" },
  { id: "destinations", label: "Destinations" },
  { id: "provisioned", label: "Credentials" },
  { id: "test", label: "Test" },
  { id: "production", label: "Production" },
];

export function PartnerLaunchpadClient() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [policies, setPolicies] = useState<PolicyTemplate[]>([]);
  const [step, setStep] = useState<WizardStep>("application");
  const [error, setError] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedProductionKey, setRevealedProductionKey] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [docs, setDocs] = useState<LaunchpadIntegrationDocs | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [domainVerifications, setDomainVerifications] = useState<DomainVerification[]>([]);
  const [domainChallenge, setDomainChallenge] = useState<{ hostname: string; record_name: string; record_value: string; expires_at: string } | null>(null);
  const [integrationHealth, setIntegrationHealth] = useState<IntegrationHealth | null>(null);

  const [applicationName, setApplicationName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [policyTemplateId, setPolicyTemplateId] = useState("age_21_retail");
  const [returnUrl, setReturnUrl] = useState("http://localhost:3000/callback");
  const [newReturnUrl, setNewReturnUrl] = useState("");
  const [customPolicyName, setCustomPolicyName] = useState("Protocol eligibility");
  const [customPolicyExplanation, setCustomPolicyExplanation] = useState("Confirm the holder meets this protocol's eligibility requirements.");
  const [customClaimIds, setCustomClaimIds] = useState<string[]>(["identity_verified"]);
  const [customAssurance, setCustomAssurance] = useState("L2");
  const [customReceiptHours, setCustomReceiptHours] = useState("24");

  const activeApp = useMemo(
    () => workspace?.applications.find((app) => app.id === activeAppId) ?? workspace?.applications[0] ?? null,
    [workspace, activeAppId],
  );
  const productionCallbackReady = activeApp
    ? hasProductionLaunchpadCallback(activeApp.allowed_return_urls)
    : false;
  const productionCallback = activeApp?.allowed_return_urls.find(hasProductionLaunchpadCallback) ?? null;
  const productionDomainVerified = Boolean(productionCallback && domainVerifications.some((verification) => {
    try { return verification.status === "verified" && new URL(productionCallback).hostname.toLowerCase() === verification.hostname.toLowerCase(); } catch { return false; }
  }));

  const refreshWorkspace = useCallback(async () => {
    const res = await fetch("/api/launchpad/applications", { credentials: "include" });
    const data = await res.json();
    if (res.ok && data.workspace) {
      setWorkspace(data.workspace);
      if (!activeAppId && data.workspace.applications[0]) {
        setActiveAppId(data.workspace.applications[0].id);
      }
      setAuthenticated(true);
    }
  }, [activeAppId]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [sessionRes, policiesRes] = await Promise.all([
        fetch("/api/launchpad/auth/session", { credentials: "include" }),
        fetch("/api/launchpad/policies"),
      ]);
      const sessionData = await sessionRes.json();
      const policiesData = await policiesRes.json();
      if (policiesData.policies) setPolicies(policiesData.policies);
      if (sessionData.authenticated) {
        await refreshWorkspace();
      }
      setLoading(false);
    })();
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!activeApp) return;
    void (async () => {
      const [docsRes, activityRes] = await Promise.all([
        fetch(`/api/launchpad/applications/${activeApp.id}/integration-docs`, { credentials: "include" }),
        fetch(`/api/launchpad/applications/${activeApp.id}/activity`, { credentials: "include" }),
      ]);
      const docsData = await docsRes.json();
      const activityData = await activityRes.json();
      if (docsData.docs) setDocs(docsData.docs);
      if (activityData.events) setActivity(activityData.events);
    })();
  }, [activeApp]);

  const refreshDomainVerification = useCallback(async () => {
    if (!activeApp) return;
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/domain-verification`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setDomainVerifications(data.verifications ?? []);
  }, [activeApp]);

  const refreshIntegrationHealth = useCallback(async () => {
    if (!activeApp) return;
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/health`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setIntegrationHealth(data);
  }, [activeApp]);

  useEffect(() => { void refreshDomainVerification(); }, [refreshDomainVerification]);
  useEffect(() => { void refreshIntegrationHealth(); }, [refreshIntegrationHealth]);

  useEffect(() => {
    if (applicationName && !partnerId) {
      setPartnerId(slugifyLaunchpadApplication(applicationName));
    }
  }, [applicationName, partnerId]);

  useEffect(() => {
    const firstReturnUrl = activeApp?.allowed_return_urls[0];
    if (firstReturnUrl && !activeApp.allowed_return_urls.includes(returnUrl)) {
      setReturnUrl(firstReturnUrl);
    }
  }, [activeApp, returnUrl]);

  async function signInWithKey() {
    setError("");
    const res = await fetch("/api/launchpad/auth/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKeyInput}` },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Sign in failed");
      return;
    }
    setAuthenticated(true);
    await refreshWorkspace();
  }

  async function signOut() {
    await fetch("/api/launchpad/auth/session", { method: "DELETE", credentials: "include" });
    setAuthenticated(false);
    setWorkspace(null);
    setRevealedKey(null);
  }

  async function provisionApplication() {
    setError("");
    const res = await fetch("/api/launchpad/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        application_name: applicationName,
        display_name: displayName || applicationName,
        partner_id: partnerId,
        policy_template_id: policyTemplateId,
        custom_policy: policyTemplateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID ? {
          name: customPolicyName,
          user_explanation: customPolicyExplanation,
          required_claim_ids: customClaimIds,
          minimum_assurance: customAssurance,
          receipt_lifetime_hours: Number(customReceiptHours),
        } : undefined,
        return_url: returnUrl,
        idempotency_key: `launchpad-${partnerId}-${policyTemplateId}`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? data.code ?? "Provisioning failed");
      return;
    }
    if (data.api_key) setRevealedKey(data.api_key);
    setActiveAppId(data.application.application_id);
    setAuthenticated(true);
    await refreshWorkspace();
    setStep("provisioned");
  }

  async function runScenario(scenarioId: string) {
    if (!activeApp) return;
    setTestResult(null);
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ scenario_id: scenarioId, return_url: returnUrl }),
    });
    const data = await res.json();
    if (res.ok) setTestResult(data.result);
    else setError(data.error ?? "Test failed");
    const activityRes = await fetch(`/api/launchpad/applications/${activeApp.id}/activity`, { credentials: "include" });
    const activityData = await activityRes.json();
    if (activityData.events) setActivity(activityData.events);
  }

  async function addReturnUrl() {
    if (!activeApp || !newReturnUrl.trim()) return;
    setError("");
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/return-urls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ return_url: newReturnUrl.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not add callback URL");
      return;
    }
    setReturnUrl(newReturnUrl.trim());
    setNewReturnUrl("");
    await refreshWorkspace();
    await refreshIntegrationHealth();
  }

  async function removeReturnUrl(url: string) {
    if (!activeApp) return;
    setError("");
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/return-urls`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ return_url: url }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Keep one callback URL configured before removing another.");
      return;
    }
    const remaining = (data.allowed_return_urls as string[] | undefined) ?? [];
    if (url === returnUrl && remaining[0]) setReturnUrl(remaining[0]);
    await refreshWorkspace();
    await refreshIntegrationHealth();
  }

  async function requestProduction() {
    if (!activeApp) return;
    if (!productionCallbackReady || !productionDomainVerified) {
      setError("Add an HTTPS callback URL and verify its domain before activating production.");
      setStep("destinations");
      return;
    }
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/production-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ request_notes: "Automated production safety gate" }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Activation failed"); return; }
    const keyRes = await fetch(`/api/launchpad/applications/${activeApp.id}/credentials/reveal-production`, {
      method: "POST", credentials: "include",
    });
    const keyData = await keyRes.json();
    if (keyRes.ok && keyData.api_key) setRevealedProductionKey(keyData.api_key);
    else if (!keyRes.ok) setError(keyData.error ?? "Production activated, but the key could not be revealed.");
    await refreshWorkspace();
    await refreshIntegrationHealth();
    setStep("production");
  }

  async function createDomainChallenge() {
    if (!activeApp || !productionCallback) return;
    setError("");
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/domain-verification`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ return_url: productionCallback }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Could not create domain challenge"); return; }
    setDomainChallenge(data.verification);
    await refreshDomainVerification();
    await refreshIntegrationHealth();
  }

  async function verifyDomainChallenge() {
    if (!activeApp || !productionCallback) return;
    setError("");
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/domain-verification`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ return_url: productionCallback, action: "verify" }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "DNS record is not visible yet. Wait a few minutes and try again."); return; }
    await refreshDomainVerification();
    await refreshIntegrationHealth();
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback("Copied");
      setTimeout(() => setCopyFeedback(""), 2000);
    });
  }

  if (loading) {
    return (
      <RedesignPage accent="developer" maxWidth={960}>
        <PageHeader eyebrow="Partner Launchpad" title="Loading workspace…" subtitle="" />
      </RedesignPage>
    );
  }

  return (
    <RedesignPage accent="developer" maxWidth={960}>
      <PageHeader
        eyebrow="Partner Launchpad"
        title="Build your integration"
        subtitle="Create a sandbox application, choose a policy, register return URLs, test outcomes, and request production access. No custom Abraxas code required."
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }} role="list" aria-label="Launchpad progress">
        {STEPS.map((s, index) => (
          <button
            key={s.id}
            type="button"
            role="listitem"
            onClick={() => setStep(s.id)}
            style={stepPillStyle(step === s.id)}
            aria-current={step === s.id ? "step" : undefined}
          >
            {index + 1}. {s.label}
          </button>
        ))}
      </div>

      {!authenticated && !workspace?.applications.length ? (
        <ContentCard title="Sign in or create your first application">
          <p style={bodyText}>
            Paste a sandbox API key to resume a workspace, or continue below to provision a new sandbox application.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="abx_test_…"
              aria-label="Sandbox API key"
              style={inputStyle}
            />
            <Btn size="sm" onClick={() => void signInWithKey()}>Sign in</Btn>
          </div>
        </ContentCard>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            {workspace?.display_name ?? partnerId}
            <span style={badgeStyle(workspace?.environment === "production" ? "#10B981" : "#6366F1")}>
              {workspace?.environment ?? "sandbox"}
            </span>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => void signOut()}>Sign out</Btn>
        </div>
      )}

      {error && <p role="alert" style={{ color: "#ef4444", fontFamily: FONT, fontSize: "0.72rem" }}>{error}</p>}

      {step === "application" && (
        <ContentCard title="Create application">
          <label style={labelStyle}>
            Application name
            <input value={applicationName} onChange={(e) => setApplicationName(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Partner display name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Partner identifier
            <input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={inputStyle} />
          </label>
          <Btn size="sm" onClick={() => setStep("policy")}>Continue to proof selection</Btn>
        </ContentCard>
      )}

      {step === "policy" && (
        <ContentCard title="Choose proof">
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {policies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => setPolicyTemplateId(policy.id)}
                style={{
                  textAlign: "left",
                  padding: "0.75rem",
                  borderRadius: 12,
                  border: `1px solid ${policyTemplateId === policy.id ? "var(--accent)" : "var(--border)"}`,
                  background: policyTemplateId === policy.id ? "rgba(99,102,241,0.08)" : "var(--surface)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.82rem" }}>{policy.label}</div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>{policy.user_explanation}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPolicyTemplateId(CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID)}
              style={{
                textAlign: "left", padding: "0.75rem", borderRadius: 12,
                border: `1px solid ${policyTemplateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID ? "var(--accent)" : "var(--border)"}`,
                background: policyTemplateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID ? "rgba(99,102,241,0.08)" : "var(--surface)", cursor: "pointer",
              }}
            >
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.82rem" }}>Custom protocol policy</div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>Choose constrained claim requirements. Production activates automatically after the security gate passes.</div>
            </button>
          </div>
          {policyTemplateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID && (
            <div style={{ marginTop: "0.85rem", padding: "0.85rem", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-inset)" }}>
              <label style={labelStyle}>Policy name<input value={customPolicyName} onChange={(e) => setCustomPolicyName(e.target.value)} style={inputStyle} /></label>
              <label style={labelStyle}>What the holder sees<input value={customPolicyExplanation} onChange={(e) => setCustomPolicyExplanation(e.target.value)} style={inputStyle} /></label>
              <div style={{ ...labelStyle, marginBottom: "0.5rem" }}>Required proof</div>
              <div style={{ display: "grid", gap: "0.35rem", marginBottom: "0.75rem" }}>
                {CUSTOM_LAUNCHPAD_CLAIMS.map((claim) => (
                  <label key={claim.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={customClaimIds.includes(claim.id)} onChange={(e) => setCustomClaimIds((current) => e.target.checked ? [...current, claim.id] : current.filter((id) => id !== claim.id))} />
                    <span><strong style={{ color: "var(--text-primary)" }}>{claim.label}</strong> · {claim.description}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <label style={{ ...labelStyle, flex: "1 1 130px" }}>Minimum assurance<select value={customAssurance} onChange={(e) => setCustomAssurance(e.target.value)} style={inputStyle}>{["L0", "L1", "L2", "L3", "L4"].map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
                <label style={{ ...labelStyle, flex: "1 1 130px" }}>Receipt hours<input type="number" min="1" max="168" value={customReceiptHours} onChange={(e) => setCustomReceiptHours(e.target.value)} style={inputStyle} /></label>
              </div>
            </div>
          )}
          <div style={{ marginTop: "0.75rem" }}>
            <Btn size="sm" onClick={() => setStep("destinations")}>Configure destinations</Btn>
          </div>
        </ContentCard>
      )}

      {step === "destinations" && (
        <ContentCard title="Approved return URLs">
          {activeApp ? (
            <>
              <p style={bodyText}>Add a new callback before removing an old one. This keeps your sandbox flow usable while you deploy.</p>
              <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.85rem" }}>
                {activeApp.allowed_return_urls.map((url) => (
                  <div key={url} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: 10 }}>
                    <code style={{ ...bodyText, margin: 0, flex: "1 1 260px", fontFamily: MONO, fontSize: "0.68rem", overflowWrap: "anywhere" }}>{url}</code>
                    <Btn size="sm" variant="ghost" onClick={() => void removeReturnUrl(url)} disabled={activeApp.allowed_return_urls.length <= 1}>Remove</Btn>
                  </div>
                ))}
              </div>
              <label style={labelStyle}>
                Add callback URL
                <input value={newReturnUrl} onChange={(e) => setNewReturnUrl(e.target.value)} placeholder="https://your-app.example.com/auth/abraxas/callback" style={inputStyle} />
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Btn size="sm" onClick={() => void addReturnUrl()}>Add callback URL</Btn>
                <Btn size="sm" variant="secondary" onClick={() => setStep("test")}>Open test console</Btn>
              </div>
            </>
          ) : (
            <>
              <label style={labelStyle}>
                Development callback URL
                <input value={returnUrl} onChange={(e) => setReturnUrl(e.target.value)} style={inputStyle} />
              </label>
              <p style={bodyText}>Only listed HTTPS or localhost destinations can receive verification results.</p>
              <Btn size="sm" onClick={() => void provisionApplication()}>Provision sandbox</Btn>
            </>
          )}
        </ContentCard>
      )}

      {step === "provisioned" && (
        <ContentCard title="Sandbox credentials">
          {revealedKey ? (
            <div style={{ marginBottom: "0.75rem" }}>
              <p style={bodyText}>Copy your API key now. It will not be shown again.</p>
              <pre style={codeBlockStyle}>{revealedKey}</pre>
              <Btn size="sm" onClick={() => copyText(revealedKey)}>Copy API key</Btn>
              {copyFeedback && <span style={{ marginLeft: 8, fontFamily: FONT, fontSize: "0.72rem" }} role="status">{copyFeedback}</span>}
            </div>
          ) : (
            <p style={bodyText}>Key prefix: <code style={{ fontFamily: MONO }}>{activeApp?.key_prefix ?? "abx_test_…"}</code></p>
          )}
          {docs?.hosted_link && (
            <div style={{ marginTop: "0.75rem" }}>
              <p style={bodyText}>Hosted verification link</p>
              <pre style={codeBlockStyle}>{docs.hosted_link}</pre>
              <Btn size="sm" variant="secondary" onClick={() => copyText(docs.hosted_link)}>Copy hosted link</Btn>
            </div>
          )}
          <div style={{ marginTop: "0.75rem" }}>
            <Btn size="sm" onClick={() => setStep("test")}>Open test console</Btn>
          </div>
        </ContentCard>
      )}

      {step === "test" && activeApp && (
        <ContentCard title="Sandbox test console">
          <p style={bodyText}>Simulated results are labeled sandbox data and never affect production.</p>
          <div style={{ display: "grid", gap: "0.4rem", marginBottom: "0.75rem" }}>
            {LAUNCHPAD_TEST_SCENARIOS.map((scenario) => (
              <button key={scenario.id} type="button" onClick={() => void runScenario(scenario.id)} style={scenarioButtonStyle}>
                <span style={{ fontWeight: 700 }}>{scenario.label}</span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{scenario.description}</span>
              </button>
            ))}
          </div>
          {testResult && (
            <pre style={codeBlockStyle} aria-live="polite">{JSON.stringify(testResult, null, 2)}</pre>
          )}
          {docs && (
            <details style={{ marginTop: "0.75rem" }}>
              <summary style={{ fontFamily: FONT, fontWeight: 700, cursor: "pointer" }}>Integration instructions</summary>
              <pre style={codeBlockStyle}>{docs.javascript_example}</pre>
              <Btn size="sm" variant="secondary" onClick={() => copyText(docs.javascript_example)}>Copy JavaScript example</Btn>
            </details>
          )}
          <div style={{ marginTop: "0.75rem" }}>
            <Btn size="sm" onClick={() => setStep("production")}>Open production safety gate</Btn>
          </div>
        </ContentCard>
      )}

      {step === "production" && (
        <ContentCard title="Automated production safety gate">
          <p style={bodyText}>
            Production activates automatically after Abraxas verifies your callback domain. No generic review queue is needed for a standard integration.
          </p>
          {!productionCallbackReady && (
            <p style={{ ...bodyText, color: "#f59e0b" }}>
              Add an HTTPS callback URL in Destinations first. Localhost is sandbox-only.
            </p>
          )}
          {productionCallbackReady && !productionDomainVerified && (
            <div style={{ marginTop: "0.75rem", padding: "0.8rem", border: "1px solid var(--border)", borderRadius: 10 }}>
              <p style={bodyText}>Prove you control <code style={{ fontFamily: MONO }}>{new URL(productionCallback!).hostname}</code>. Abraxas will only activate a production callback on a verified domain.</p>
              {!domainChallenge ? (
                <Btn size="sm" onClick={() => void createDomainChallenge()}>Create DNS challenge</Btn>
              ) : (
                <>
                  <p style={{ ...bodyText, marginTop: "0.7rem" }}>Create this DNS TXT record:</p>
                  <pre style={codeBlockStyle}>{domainChallenge.record_name}{"\n"}{domainChallenge.record_value}</pre>
                  <Btn size="sm" onClick={() => void verifyDomainChallenge()}>Check DNS record</Btn>
                </>
              )}
            </div>
          )}
          {productionDomainVerified && <p style={{ ...bodyText, color: "#10B981" }}>Domain verified. Your integration can activate production automatically.</p>}
          <Btn size="sm" onClick={() => void requestProduction()} disabled={!productionCallbackReady || !productionDomainVerified}>Activate production automatically</Btn>
          {revealedProductionKey && (
            <div style={{ marginTop: "0.85rem" }}>
              <p style={bodyText}>Copy this production API key now. It will not be shown again.</p>
              <pre style={codeBlockStyle}>{revealedProductionKey}</pre>
              <Btn size="sm" variant="secondary" onClick={() => copyText(revealedProductionKey)}>Copy production API key</Btn>
            </div>
          )}
          <p style={{ ...bodyText, marginTop: "0.75rem" }}>
            Review the <Link href="/good-trouble" style={{ color: "var(--accent)" }}>Good Trouble integration case study</Link> for the pattern this launchpad generalizes.
          </p>
        </ContentCard>
      )}

      {activeApp && activity.length > 0 && (
        <ContentCard title="Recent activity">
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            {activity.slice(0, 12).map((event) => (
              <li key={event.id} style={{ marginBottom: 4 }}>
                {event.event_type.replace(/_/g, " ")} · {event.public_code ?? "—"} · {new Date(event.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {activeApp && integrationHealth && (
        <ContentCard title="Integration health">
          <p style={bodyText}>Abraxas checks this configuration server-side. Fix only the items marked as action required or blocked.</p>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {integrationHealth.checks.map((check) => {
              const color = check.status === "pass" ? "#10B981" : check.status === "action_required" ? "#f59e0b" : "#ef4444";
              return <div key={check.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>
                  <span>{check.label}</span><span style={{ color }}>{check.status.replace(/_/g, " ")}</span>
                </div>
                <p style={{ ...bodyText, margin: "0.3rem 0 0" }}>{check.detail}</p>
              </div>;
            })}
          </div>
          <Btn size="sm" variant="secondary" onClick={() => void refreshIntegrationHealth()}>Refresh health</Btn>
        </ContentCard>
      )}
    </RedesignPage>
  );
}

const bodyText: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  fontFamily: FONT,
  fontSize: "0.72rem",
  fontWeight: 700,
  marginBottom: "0.65rem",
};

const inputStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.72rem",
  padding: "0.55rem 0.65rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  minWidth: 0,
  flex: 1,
};

const codeBlockStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.62rem",
  lineHeight: 1.55,
  padding: "0.85rem",
  borderRadius: 10,
  overflow: "auto",
  background: "var(--surface-inset)",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
};

const scenarioButtonStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  textAlign: "left",
  padding: "0.65rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  cursor: "pointer",
  fontFamily: FONT,
  fontSize: "0.75rem",
};

function stepPillStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: FONT,
    fontSize: "0.68rem",
    fontWeight: 700,
    padding: "0.35rem 0.65rem",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    background: active ? "rgba(99,102,241,0.12)" : "var(--surface)",
    color: active ? "var(--accent)" : "var(--text-secondary)",
    cursor: "pointer",
  };
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    marginLeft: 8,
    fontSize: "0.58rem",
    fontWeight: 700,
    padding: "0.15rem 0.45rem",
    borderRadius: 999,
    background: `${color}18`,
    color,
  };
}
