"use client";
// FILE: components/partner/launchpad/PartnerLaunchpadClient.tsx
// Self service Partner Launchpad — guided sandbox integration workspace.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { LAUNCHPAD_TEST_SCENARIOS } from "@/lib/partner/launchpad/testScenarios";
import type { LaunchpadIntegrationDocs } from "@/lib/partner/launchpad/integrationDocs";
import { slugifyLaunchpadApplication } from "@/lib/partner/launchpad/slug";
import { hasProductionLaunchpadCallback, isProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { CUSTOM_LAUNCHPAD_CLAIMS, CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/customPolicy";
import { SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SEQUENCE } from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { PartnerEventDeliveryPanel } from "@/components/partner/launchpad/PartnerEventDeliveryPanel";
import { PartnerWebhookDeliveryHealthPanel } from "@/components/partner/launchpad/PartnerWebhookDeliveryHealthPanel";
import { PolicyChangeControlLaunchpadSlot } from "@/components/partner/launchpad/PolicyChangeControlLaunchpadSlot";
import { PartnerSandboxReadinessPanel } from "@/components/partner/launchpad/PartnerSandboxReadinessPanel";
import { PartnerActionControlPlanePanel } from "@/components/partner/launchpad/PartnerActionControlPlanePanel";
import { CircleSettlementLaunchpadPanel } from "@/components/partner/launchpad/CircleSettlementLaunchpadPanel";
import {
  launchpadHealthChecksForUi,
  shouldRenderPolicyChangeControlUi,
} from "@/lib/partner/launchpad/policyChangeControlUi";
import { selectLaunchpadResumeAppId } from "@/lib/partner/activationPath";
import { PartnerSandboxTestConsolePanel } from "@/components/partner/launchpad/PartnerSandboxTestConsolePanel";
import { PartnerGoLiveReadinessPanel } from "@/components/partner/launchpad/PartnerGoLiveReadinessPanel";
import { PartnerIntegrationHandoffPanel } from "@/components/partner/launchpad/PartnerIntegrationHandoffPanel";
import { PartnerStarterKitPanel } from "@/components/partner/launchpad/PartnerStarterKitPanel";
import { PartnerLaunchpadConnectPanel } from "@/components/partner/launchpad/PartnerLaunchpadConnectPanel";
import {
  mapLegacyLaunchpadStep,
  resolveLaunchpadJourneyState,
} from "@/lib/partner/launchpad/journeyState";
import { PartnerIntegrationHealthPanel } from "@/components/partner/launchpad/PartnerIntegrationHealthPanel";
import { PartnerIntegrationPerformancePanel } from "@/components/partner/launchpad/PartnerIntegrationPerformancePanel";
import { PartnerPilotProgressPanel } from "@/components/partner/launchpad/PartnerPilotProgressPanel";
import { PartnerApplicationOverview } from "@/components/partner/launchpad/PartnerApplicationOverview";
import { PartnerBindingProductionPanel } from "@/components/partner/launchpad/PartnerBindingProductionPanel";
import { EnvironmentBadge } from "@/components/product/EnvironmentBadge";
import { EligibilityPolicyCard } from "@/components/product/EligibilityPolicyCard";
import { PartnerFlowRequestPanel } from "@/components/partner/launchpad/PartnerFlowRequestPanel";
import { PolicyVersionPlannerPanel } from "@/components/partner/launchpad/PolicyVersionPlannerPanel";
import { NetworkReadinessPanel } from "@/components/partner/launchpad/NetworkReadinessPanel";
import { OnchainGateDeploymentPanel } from "@/components/partner/launchpad/OnchainGateDeploymentPanel";
import { TestnetGateDeploymentKitCard } from "@/components/partner/launchpad/TestnetGateDeploymentKitCard";
import { OnchainVerifierConformanceCard } from "@/components/partner/launchpad/OnchainVerifierConformanceCard";
import { GO_LIVE_REVIEW_ENTRY } from "@/lib/partner/launchpad/goLiveReadiness/contract";
import { PolicyProposalForm } from "@/components/partner/policyProposal/PolicyProposalForm";
import { POLICY_PROPOSAL_NOTICE } from "@/lib/partner/policyProposal/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type WizardStep = "verify" | "test_app" | "connect" | "test" | "go_live" | "advanced";

interface PolicyTemplate {
  id: string;
  label: string;
  user_explanation: string;
  disclosed_result?: string;
  required_claims?: string[];
  minimum_assurance?: string;
  receipt_lifetime_hours?: number;
  intended_use_examples?: string[];
  partner_receives?: string;
  partner_does_not_receive?: string[];
  production_suitability?: string;
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
  policy_change_control_available?: boolean;
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

const STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: "verify", label: "Verify", description: "What do you need to verify?" },
  { id: "test_app", label: "Test app", description: "Your private verification test environment" },
  { id: "connect", label: "Connect", description: "Connect Abraxas to your website or app" },
  { id: "test", label: "Test", description: "Run a customer verification" },
  { id: "go_live", label: "Go live", description: "Activate production" },
];

export function PartnerLaunchpadClient({
  policyChangeControlAvailable = false,
}: {
  policyChangeControlAvailable?: boolean;
} = {}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [policies, setPolicies] = useState<PolicyTemplate[]>([]);
  const [googleDisclaimer, setGoogleDisclaimer] = useState(
    "Google sign-in creates an Abraxas account. It does not prove age, identity, residency, wallet control, membership, or any other eligibility claim.",
  );
  const [step, setStep] = useState<WizardStep>("verify");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const initialStepResolved = useRef(false);
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
  const productionCallback = activeApp?.allowed_return_urls.find((url) => isProductionLaunchpadCallback(url)) ?? null;
  const productionDomainVerified = Boolean(productionCallback && domainVerifications.some((verification) => {
    try { return verification.status === "verified" && new URL(productionCallback).hostname.toLowerCase() === verification.hostname.toLowerCase(); } catch { return false; }
  }));
  const selectedPack = useMemo(
    () => policies.find((policy) => policy.id === policyTemplateId) ?? null,
    [policies, policyTemplateId],
  );
  const pccUiAvailable = shouldRenderPolicyChangeControlUi(policyChangeControlAvailable)
    && (workspace?.policy_change_control_available === undefined
      || workspace.policy_change_control_available === true);
  const healthChecks = launchpadHealthChecksForUi(
    integrationHealth?.checks ?? [],
    pccUiAvailable,
  );

  const refreshWorkspace = useCallback(async () => {
    const res = await fetch("/api/launchpad/applications", { credentials: "include" });
    const data = await res.json();
    if (res.ok && data.workspace) {
      setWorkspace(data.workspace);
      const requested = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("app")
        : null;
      const resumeId = selectLaunchpadResumeAppId(data.workspace.applications, requested);
      if (resumeId && (!activeAppId || requested === resumeId)) {
        setActiveAppId(resumeId);
      } else if (!activeAppId && data.workspace.applications[0]) {
        setActiveAppId(data.workspace.applications[0].id);
      }
      setAuthenticated(true);
      if (!initialStepResolved.current) {
        initialStepResolved.current = true;
        const view = typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("view")
          : null;
        const requestedStep = STEPS.find((item) => item.id === view)?.id
          ?? (view ? mapLegacyLaunchpadStep(view) : undefined);
        setStep(requestedStep ?? (data.workspace.applications.length > 0 ? "connect" : "verify"));
      }
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
      if (typeof policiesData.google_account_not_eligibility === "string") {
        setGoogleDisclaimer(policiesData.google_account_not_eligibility);
      }
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
    setActiveAppId(null);
    setStep("verify");
    initialStepResolved.current = false;
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
    setStep("test_app");
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
    await refreshIntegrationHealth();
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
      setError("Add an HTTPS callback and verify its domain before requesting Production review.");
      setStep("test_app");
      return;
    }
    const res = await fetch(`/api/launchpad/applications/${activeApp.id}/go-live`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Review request was not accepted");
      setStep("go_live");
      return;
    }
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

  const starterKitEvidenced = useMemo(
    () => activity.some((event) =>
      event.public_code === "starter_kit_generated"
      || event.public_code === "starter_kit_downloaded"),
    [activity],
  );
  const activeSandboxKey = Boolean(activeApp?.key_prefix);
  const productionActivated = activeApp?.environment === "production";
  const currentStepMeta = STEPS.find((item) => item.id === step);
  const journey = activeApp
    ? resolveLaunchpadJourneyState({
      application: activeApp,
      configuredPolicyCount: activeApp.policy_template_id ? 1 : 0,
      verifiedReceiptCount: 0,
      activeSandboxKey,
      starterKitEvidenced,
      harnessPassed: integrationHealth?.checks.some((check) => check.id === "harness" && check.status === "pass"),
      productionActivated,
    })
    : null;

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
        title="Integrate private eligibility"
        subtitle="One integration. Multiple eligibility policies. Add approved eligibility questions through the same Abraxas trust infrastructure without collecting underlying identity data."
      />

      {activeApp && (
        <PartnerApplicationOverview
          application={activeApp}
          integrationHealth={integrationHealth}
          productionActivated={productionActivated}
          activeSandboxKey={activeSandboxKey}
          starterKitEvidenced={starterKitEvidenced}
          onNavigate={(s) => setStep(mapLegacyLaunchpadStep(s) as WizardStep)}
        />
      )}

      <div style={{ marginBottom: "0.85rem" }}>
        <p style={{ ...bodyText, fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
          {currentStepMeta?.description ?? "Guided merchant integration"}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }} role="list" aria-label="Launchpad progress">
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
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {workspace?.display_name ?? partnerId}
            <EnvironmentBadge environment={workspace?.environment ?? "sandbox"} />
          </div>
          <Btn variant="ghost" size="sm" onClick={() => void signOut()}>Sign out</Btn>
        </div>
      )}

      {error && <p role="alert" style={{ color: "#ef4444", fontFamily: FONT, fontSize: "0.72rem" }}>{error}</p>}

      {step === "verify" && (
        <ContentCard title="What do you need to verify?">
          <p style={bodyText}>
            What can Abraxas verify for your application? Each pack answers one business question with minimum disclosure. The partner receives a signed eligibility result — not a profile, ID image, or contact list.
          </p>
          <p style={{ ...bodyText, color: "#f59e0b" }}>{googleDisclaimer}</p>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {policies.map((policy) => (
              <EligibilityPolicyCard
                key={policy.id}
                title={policy.label}
                question={policy.user_explanation}
                partnerReceives={policy.partner_receives ?? policy.disclosed_result ?? "Eligibility result"}
                partnerDoesNotReceive={policy.partner_does_not_receive ?? []}
                technicalId={policy.id}
                packId={policy.id}
                catalogVersion={1}
                resultFamily={policy.disclosed_result}
                environment={
                  policy.production_suitability === "sandbox_only" ? "sandbox" : "available"
                }
                policyProductionEligible={policy.production_suitability !== "sandbox_only"}
                selected={policyTemplateId === policy.id}
                onSelect={() => setPolicyTemplateId(policy.id)}
                minimumAssurance={policy.minimum_assurance}
                receiptLifetimeHours={policy.receipt_lifetime_hours}
              />
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
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.82rem" }}>Constrained custom policy</div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>
                Use only when a catalog pack does not fit. Custom policies stay sandbox only and cannot run arbitrary partner code.
              </div>
            </button>
          </div>
          {selectedPack && policyTemplateId !== CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID && (
            <div style={{ marginTop: "0.85rem", padding: "0.85rem", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-inset)" }}>
              <p style={{ ...bodyText, fontWeight: 700, color: "var(--text-primary)" }}>What the holder must prove</p>
              <p style={bodyText}>{selectedPack.user_explanation}</p>
              <p style={bodyText}>Claims: {(selectedPack.required_claims ?? []).join(", ") || "catalog claims"} · Assurance {selectedPack.minimum_assurance ?? "—"} · Receipt {selectedPack.receipt_lifetime_hours ?? "—"}h</p>
              <p style={{ ...bodyText, fontWeight: 700, color: "var(--text-primary)" }}>What the partner receives</p>
              <p style={bodyText}>{selectedPack.partner_receives ?? selectedPack.disclosed_result}</p>
              <p style={{ ...bodyText, fontWeight: 700, color: "var(--text-primary)" }}>What Abraxas does not share</p>
              <p style={bodyText}>{(selectedPack.partner_does_not_receive ?? []).join(", ")}</p>
              {(selectedPack.intended_use_examples ?? []).length > 0 && (
                <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  {selectedPack.intended_use_examples!.map((example) => <li key={example}>{example}</li>)}
                </ul>
              )}
            </div>
          )}
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
          {policyTemplateId === "sandbox_institutional_protocol_access" && (
            <p style={{ ...bodyText, marginTop: "0.75rem" }}>
              Next: {SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SEQUENCE.join(" → ")}.
              Sandbox test result for technical integration only. It is not a live KYB or Production approval.
            </p>
          )}
          {!activeApp && (
            <>
              <label style={labelStyle}>
                What should we call this application?
                <input value={applicationName} onChange={(e) => setApplicationName(e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Display name
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={applicationName || "Your business name"} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Where should customers return after verification?
                <input value={returnUrl} onChange={(e) => setReturnUrl(e.target.value)} placeholder="https://your-site.example.com/verification-result" style={inputStyle} />
              </label>
              <details style={{ marginBottom: "0.75rem" }}>
                <summary style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Advanced options</summary>
                <label style={{ ...labelStyle, marginTop: "0.65rem" }}>
                  Partner identifier
                  <input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={inputStyle} />
                </label>
              </details>
              <Btn size="sm" onClick={() => void provisionApplication()}>Create test app</Btn>
            </>
          )}
          {activeApp && (
            <div style={{ marginTop: "0.75rem" }}>
              <Btn size="sm" onClick={() => setStep("test_app")}>Continue to test app</Btn>
            </div>
          )}
        </ContentCard>
      )}

      {step === "test_app" && (
        <ContentCard title="Your private verification test environment">
          {activeApp ? (
            <>
              <p style={bodyText}>
                Your sandbox application is active. Copy credentials once, confirm where customers return after verification, then connect your website.
              </p>
              {revealedKey ? (
                <div style={{ marginBottom: "0.75rem" }}>
                  <p style={bodyText}>Copy your sandbox API key now. It will not be shown again.</p>
                  <pre style={codeBlockStyle}>{revealedKey}</pre>
                  <Btn size="sm" onClick={() => copyText(revealedKey)}>Copy API key</Btn>
                  {copyFeedback && <span style={{ marginLeft: 8, fontFamily: FONT, fontSize: "0.72rem" }} role="status">{copyFeedback}</span>}
                </div>
              ) : (
                <p style={bodyText}>Sandbox credential prefix: <code style={{ fontFamily: MONO }}>{activeApp.key_prefix ?? "abx_test_…"}</code></p>
              )}
              <p style={bodyText}>Return destination after verification</p>
              <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.85rem" }}>
                {activeApp.allowed_return_urls.map((url) => (
                  <div key={url} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: 10 }}>
                    <code style={{ ...bodyText, margin: 0, flex: "1 1 260px", fontFamily: MONO, fontSize: "0.68rem", overflowWrap: "anywhere" }}>{url}</code>
                    <Btn size="sm" variant="ghost" onClick={() => void removeReturnUrl(url)} disabled={activeApp.allowed_return_urls.length <= 1}>Remove</Btn>
                  </div>
                ))}
              </div>
              <label style={labelStyle}>
                Add return URL
                <input value={newReturnUrl} onChange={(e) => setNewReturnUrl(e.target.value)} placeholder="https://your-app.example.com/verification-result" style={inputStyle} />
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Btn size="sm" onClick={() => void addReturnUrl()}>Add return URL</Btn>
                <Btn size="sm" onClick={() => setStep("connect")}>Connect website</Btn>
              </div>
            </>
          ) : (
            <>
              <p style={bodyText}>Choose a verification requirement first, then Abraxas creates your private sandbox application.</p>
              <Btn size="sm" onClick={() => setStep("verify")}>Choose verification</Btn>
            </>
          )}
        </ContentCard>
      )}

      {step === "connect" && activeApp && (
        <PartnerLaunchpadConnectPanel
          applicationId={activeApp.id}
          appName={activeApp.display_name || activeApp.application_name}
        />
      )}

      {step === "test" && activeApp && (
        journey?.testAvailable ? (
          <>
            <ContentCard title="Run a customer verification">
              <p style={bodyText}>
                Confirm the customer experience works end to end. You should receive the eligibility result on your server — not date of birth, documents, or identity images.
              </p>
              <PartnerSandboxTestConsolePanel
                applicationId={activeApp.id}
                onRequestReview={() => setStep("go_live")}
              />
            </ContentCard>
            <ContentCard title="Run test verification">
              <p style={bodyText}>
                Use the integration test harness to simulate receipt verification with the same trust path used in production.
              </p>
              <div style={{ display: "grid", gap: "0.4rem", marginBottom: "0.75rem" }}>
                {LAUNCHPAD_TEST_SCENARIOS.slice(0, 3).map((scenario) => (
                  <button key={scenario.id} type="button" onClick={() => void runScenario(scenario.id)} style={scenarioButtonStyle}>
                    <span style={{ fontWeight: 700 }}>{scenario.label}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{scenario.description}</span>
                  </button>
                ))}
              </div>
              {testResult && (
                <pre style={codeBlockStyle} aria-live="polite">{JSON.stringify(testResult, null, 2)}</pre>
              )}
              {journey.testPassed && (
                <p style={{ ...bodyText, color: "#10B981", fontWeight: 700 }}>
                  Test passed. Prepare to go live when your production checklist is complete.
                </p>
              )}
              <Btn size="sm" onClick={() => setStep("go_live")}>Prepare to go live</Btn>
            </ContentCard>
          </>
        ) : (
          <ContentCard title="Connect your website first">
            <p style={bodyText}>
              Finish connecting Abraxas to your website before running a test verification. The guided flow prevents test actions that cannot succeed yet.
            </p>
            <Btn size="sm" onClick={() => setStep("connect")}>Connect website</Btn>
          </ContentCard>
        )
      )}

      {step === "go_live" && activeApp && (
        <>
          <ContentCard title="Prepare to go live">
            <p style={bodyText}>
              Production stays fail-closed until Abraxas reviews your integration. Complete the checklist below, then request production access.
            </p>
            <ul style={{ ...bodyText, paddingLeft: "1.1rem", marginBottom: "0.85rem" }}>
              {(journey?.goLiveChecklist ?? []).map((item) => (
                <li key={item.id} style={{ color: item.complete ? "#10B981" : "var(--text-secondary)" }}>
                  {item.complete ? "✓ " : "○ "}{item.label}
                </li>
              ))}
            </ul>
          </ContentCard>
          <PartnerBindingProductionPanel applicationId={activeApp.id} />
          <PartnerIntegrationHandoffPanel applicationId={activeApp.id} />
          <PartnerGoLiveReadinessPanel
            applicationId={activeApp.id}
            onChanged={() => {
              void refreshWorkspace();
              void refreshIntegrationHealth();
            }}
          />
          <ContentCard title="Request production access">
            <p style={bodyText}>
              Reviewers expect an HTTPS return URL on a domain you control. Localhost stays sandbox-only. This step does not automatically activate production.
            </p>
            {!productionCallbackReady && (
              <p style={{ ...bodyText, color: "#f59e0b" }}>
                Add an HTTPS return URL in your test app settings first.
              </p>
            )}
            {productionCallbackReady && !productionDomainVerified && (
              <div style={{ marginTop: "0.75rem", padding: "0.8rem", border: "1px solid var(--border)", borderRadius: 10 }}>
                <p style={bodyText}>Prove you control <code style={{ fontFamily: MONO }}>{new URL(productionCallback!).hostname}</code>.</p>
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
            {productionDomainVerified && (
              <p style={{ ...bodyText, color: "#10B981" }}>Domain verified. Request production access when the checklist is complete.</p>
            )}
            <div style={{ marginTop: "0.75rem" }}>
              <Btn
                size="sm"
                onClick={() => void requestProduction()}
                disabled={!productionCallbackReady || !productionDomainVerified}
              >
                {GO_LIVE_REVIEW_ENTRY}
              </Btn>
            </div>
            {revealedProductionKey && (
              <div style={{ marginTop: "0.85rem" }}>
                <p style={bodyText}>A reviewer already issued a production key for this app. Copy it only if it was just revealed to you.</p>
                <pre style={codeBlockStyle}>{revealedProductionKey}</pre>
                <Btn size="sm" variant="secondary" onClick={() => copyText(revealedProductionKey)}>Copy production API key</Btn>
              </div>
            )}
          </ContentCard>
        </>
      )}

      {activeApp && activeApp.policy_template_id === "sandbox_institutional_protocol_access" && (
        <ContentCard title="Next path">
          <ol style={{ ...bodyText, paddingLeft: "1.2rem" }}>
            {SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SEQUENCE.map((stepLabel) => (
              <li key={stepLabel}>{stepLabel}</li>
            ))}
          </ol>
          <p style={bodyText}>
            Policy ID is pinned by the server. Browser input cannot choose partner, policy version, issuer, assurance, signer, network, or production.
            Sandbox test result for technical integration only. It is not a live KYB or Production approval.
          </p>
        </ContentCard>
      )}

      {activeApp && (
        <ContentCard title="Developer details">
          <p style={bodyText}>
            Advanced configuration, bindings, webhooks, harness scenarios, and integration observability live here. The guided journey above stays merchant-focused.
          </p>
          <Btn size="sm" variant="secondary" onClick={() => setShowAdvancedOptions((current) => !current)}>
            {showAdvancedOptions ? "Hide developer details" : "Show developer details"}
          </Btn>
          {showAdvancedOptions && (
            <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.85rem" }}>
              <div id="policy-proposal">
                <PolicyProposalForm />
              </div>
              <PartnerFlowRequestPanel
                applicationId={activeApp.id}
                partnerId={workspace?.partner_id ?? ""}
              />
              <PolicyVersionPlannerPanel applicationId={activeApp.id} />
              <NetworkReadinessPanel applicationId={activeApp.id} />
              <OnchainGateDeploymentPanel applicationId={activeApp.id} />
              <TestnetGateDeploymentKitCard planned />
              <OnchainVerifierConformanceCard verifiedSandbox />
              <PartnerStarterKitPanel applicationId={activeApp.id} />
              <PartnerActionControlPlanePanel applicationId={activeApp.id} />
              <PartnerSandboxReadinessPanel
                applicationId={activeApp.id}
                onChanged={() => {
                  void refreshWorkspace();
                  void refreshIntegrationHealth();
                }}
              />
              <CircleSettlementLaunchpadPanel applicationId={activeApp.id} />
              {docs && (
                <ContentCard title="Integration kit examples">
                  <p style={bodyText}>Hosted verification URL</p>
                  <pre style={codeBlockStyle}>{docs.hosted_link}</pre>
                  <p style={bodyText}>Next.js route handler</p>
                  <pre style={codeBlockStyle}>{docs.typescript_verification_example}</pre>
                  <p style={bodyText}>
                    <Link href="/docs/partner-flow" style={{ color: "var(--accent)" }}>Partner Flow docs</Link>
                    {" · "}
                    <Link href="/docs/policy-packs" style={{ color: "var(--accent)" }}>Policy packs</Link>
                  </p>
                </ContentCard>
              )}
              <ContentCard title="Integration test harness">
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
              </ContentCard>
              {activity.length > 0 && (
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
              <PolicyChangeControlLaunchpadSlot
                available={pccUiAvailable}
                applicationId={activeApp.id}
                onChanged={() => {
                  void refreshWorkspace();
                  void refreshIntegrationHealth();
                }}
              />
              <PartnerIntegrationHealthPanel applicationId={activeApp.id} />
              <PartnerIntegrationPerformancePanel applicationId={activeApp.id} />
              <PartnerPilotProgressPanel applicationId={activeApp.id} />
              <PartnerWebhookDeliveryHealthPanel applicationId={activeApp.id} />
              <PartnerEventDeliveryPanel applicationId={activeApp.id} />
              {integrationHealth && (
                <ContentCard title="Integration health">
                  <div style={{ display: "grid", gap: "0.45rem" }}>
                    {healthChecks.map((check) => {
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
            </div>
          )}
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
