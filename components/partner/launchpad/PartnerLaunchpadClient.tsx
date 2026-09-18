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
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [docs, setDocs] = useState<LaunchpadIntegrationDocs | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");

  const [applicationName, setApplicationName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [policyTemplateId, setPolicyTemplateId] = useState("age_21_retail");
  const [returnUrl, setReturnUrl] = useState("http://localhost:3000/callback");
  const [newReturnUrl, setNewReturnUrl] = useState("");

  const activeApp = useMemo(
    () => workspace?.applications.find((app) => app.id === activeAppId) ?? workspace?.applications[0] ?? null,
    [workspace, activeAppId],
  );

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
  }

  async function requestProduction() {
    if (!activeApp) return;
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/production-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ request_notes: "Ready for production review" }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Request failed");
    else setStep("production");
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
          </div>
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
            <Btn size="sm" onClick={() => setStep("production")}>Request production access</Btn>
          </div>
        </ContentCard>
      )}

      {step === "production" && (
        <ContentCard title="Production access">
          <p style={bodyText}>
            Submit a production access request for operator review. Approved applications receive production scoped credentials and return URL validation.
          </p>
          <Btn size="sm" onClick={() => void requestProduction()}>Submit production request</Btn>
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
