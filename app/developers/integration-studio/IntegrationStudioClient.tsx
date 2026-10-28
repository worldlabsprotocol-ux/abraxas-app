"use client";
// FILE: app/developers/integration-studio/IntegrationStudioClient.tsx
// Guided studio plus session-bound sandbox create on Partner Launchpad.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Reveal } from "@/lib/motion/Reveal";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  INTEGRATION_STUDIO_CALLBACK_DEFAULT_HINT,
  INTEGRATION_STUDIO_CALLBACK_FIELD_HELP,
  INTEGRATION_STUDIO_CREATE_SANDBOX_BUTTON,
  INTEGRATION_STUDIO_PATHS,
  INTEGRATION_STUDIO_PROVISION,
  INTEGRATION_STUDIO_SANDBOX_STAGE_TITLE,
  isIntegrationStudioPathId,
  listStudioPackSummaries,
  studioPackContract,
  studioPublicCatalog,
  studioSnippetForPath,
  type IntegrationStudioPathId,
} from "@/lib/partner/integrationStudio";
import {
  inferPolicyPackFromPolicyId,
  isPolicyPackId,
  resolvePolicyPack,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";
import { PARTNER_ACTIVITY_NO_RAW_DATA } from "@/lib/partner/partnerActivitySignal/contract";
import { activityCategoriesForPack } from "@/lib/partner/partnerActivitySignal/categories";
import { tradingVenueProfileExample } from "@/lib/partner/tradingVenue/profiles";
import { launchpadConfigureHref } from "@/lib/partner/launchpad/partnerFlowRequest/contract";
import { launchpadPolicyVersionHref } from "@/lib/partner/launchpad/policyVersionPlanner/contract";
import { PolicyFitPlanner } from "@/app/developers/integration-studio/PolicyFitPlanner";
import { PartnerBindingSelector } from "@/components/partner/launchpad/PartnerBindingSelector";
import { OptionalWalletConnectionsPanel } from "@/app/developers/integration-studio/OptionalWalletConnectionsPanel";
import { SolanaUsdcPlansPanel } from "@/app/developers/integration-studio/SolanaUsdcPlansPanel";
import {
  STARTER_KIT_DOES_NOT_DO,
  STARTER_KIT_MINIMUM_REQUIREMENTS,
  STARTER_KIT_PLATFORM_MATRIX,
  PATH_IMPLIED_CAPABILITY,
  isStarterKitOptionalCapability,
  isStarterKitPlatform,
  type StarterKitPlatform,
} from "@/lib/partner/starterKit/contract";
import {
  PARTNER_ACTIVATION_PRODUCTION,
  PARTNER_ACTIVATION_RESUME_CTA,
  buildPartnerActivationChecklist,
  launchpadResumeHref,
  launchpadSandboxTestHref,
} from "@/lib/partner/activationPath";
import { IntegrationStudioOutcomePicker } from "@/components/gtm/IntegrationStudioOutcomePicker";
import {
  INTEGRATION_STUDIO_OUTCOMES,
  isIntegrationStudioOutcomeId,
  type IntegrationStudioOutcomeId,
} from "@/lib/gtm/integrationStudioOutcomes";
import { recordGtmClientEvent } from "@/lib/gtm/clientTelemetry";
import { IntegrationStudioOperationalBridge } from "@/app/developers/integration-studio/IntegrationStudioOperationalBridge";
import {
  DEVELOPER_WORKSPACE_STUDIO_SOURCE,
  developerWorkspaceStudioHandoffNotice,
} from "@/lib/developers/sandboxIntegrationHandoff";
import { buildIntegrationStageUrl } from "@/lib/developers/unifiedWorkspaceContinuity";
import { useUnifiedWorkspaceEmbed } from "@/lib/developers/unifiedWorkspaceEmbedContext";
import { IntegrationStudioRequestWorkbench } from "@/components/developers/IntegrationStudioRequestWorkbench";
import { IntegrationStudioSessionHandoff } from "@/components/developers/IntegrationStudioSessionHandoff";
import { IntegrationStudioConfigurationPanel } from "@/components/developers/IntegrationStudioConfigurationPanel";
import { IntegrationAdoptionReadinessPanel } from "@/components/developers/IntegrationAdoptionReadinessPanel";
import {
  isLocalReferenceCallbackUrl,
  LOCAL_REFERENCE_CALLBACK_URL,
} from "@/lib/developers/integrationAdoptionPath";
import { IntegrationStudioStageFooter } from "@/components/developers/IntegrationStudioStageFooter";
import { IntegrationStudioEmptyState } from "@/components/developers/IntegrationStudioEmptyState";
import { useIntegrationStudioStageFromContext } from "@/lib/developers/integrationStudioStageContext";
import { integrationStudioStageHref } from "@/lib/developers/useIntegrationStudioStage";
import type { ModeCCommandRailItem } from "@/components/product/ModeCCommandRail";
import {
  POLICY_FIT_ACTIONS,
  POLICY_FIT_CATEGORIES,
  POLICY_FIT_ENVIRONMENTS,
  type PolicyFitAction,
  type PolicyFitCategory,
  type PolicyFitEnvironment,
} from "@/lib/partner/integrationStudio/policyFit/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const STUDIO_DRAFT_STORAGE_KEY = "abraxas_integration_studio_draft_v1";

const PATH_LABEL: Record<IntegrationStudioPathId, string> = {
  verify_with_abraxas: "Verify with Abraxas",
  hosted_partner_flow: "Hosted Partner Flow",
  server_receipt_verify: "Server receipt verification",
  webhook_events: "Webhook / event delivery",
  solana_gate: "Solana eligibility gate",
  trading_venue: "Trading venue access",
  wallet_standard_binding: "Wallet Standard binding",
  nft_collection_gate: "NFT or collection-gated access",
  payment_authorization: "Payment and commerce",
  portable_action_contract: "Portable action contract",
  evm_partner_adapter: "EVM partner eligibility",
  onchain_protocol_gate: "Onchain protocol gate",
  solana_onchain_eligibility_gate: "Solana onchain eligibility gate",
  evm_onchain_eligibility_gate: "EVM onchain eligibility gate",
  eligibility_presentation: "Request a private eligibility presentation",
  cross_chain_protocol_access: "Build a cross-chain protocol gate",
  testnet_gate_deployment: "Human-operated testnet gate kit",
  institutional_eligibility_gate: "Institutional eligibility gate",
  onchain_verifier_conformance: "Verify your gate integration",
};

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.92rem",
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

type ResumableApp = {
  id: string;
  application_name: string;
  public_slug: string;
  policy_id: string;
  policy_version: number;
};

export function IntegrationStudioClient({
  variant = "standalone",
}: {
  variant?: "standalone" | "embedded_workspace";
}) {
  const searchParams = useSearchParams();
  const {
    embeddedInDeveloperWorkspace,
    workspaceBasePath,
    preservedQuery,
    authoritativePolicyId,
    walletProofRecorded,
  } = useUnifiedWorkspaceEmbed();
  const studioStageHref = useCallback(
    (stage: "policy" | "sandbox" | "configuration" | "request") =>
      buildIntegrationStageUrl({
        basePath: workspaceBasePath,
        stage,
        query: preservedQuery,
      }),
    [workspaceBasePath, preservedQuery],
  );
  const packs = listStudioPackSummaries();
  const [packId, setPackId] = useState<PolicyPackId | null>(() => {
    const requested = searchParams.get("pack");
    if (requested && isPolicyPackId(requested)) return requested;
    const outcome = searchParams.get("outcome");
    if (outcome && isIntegrationStudioOutcomeId(outcome)) {
      return INTEGRATION_STUDIO_OUTCOMES[outcome].defaultPackId;
    }
    return null;
  });
  const [pathId, setPathId] = useState<IntegrationStudioPathId>(() => {
    const requested = searchParams.get("path");
    return requested && isIntegrationStudioPathId(requested) ? requested : "hosted_partner_flow";
  });
  const [venueProfileId, setVenueProfileId] = useState("generic_trading_venue");
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
  const [resumeApp, setResumeApp] = useState<ResumableApp | null>(null);
  const [resumePartnerId, setResumePartnerId] = useState("");
  const [urlAppId, setUrlAppId] = useState<string | null>(null);
  const [handoffNotice, setHandoffNotice] = useState("");
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<IntegrationStudioOutcomeId | null>(() => {
    const requested = searchParams.get("outcome");
    return requested && isIntegrationStudioOutcomeId(requested) ? requested : null;
  });

  const policyFitInitial = useMemo(() => {
    const actionParam = searchParams.get("action");
    const categoryParam = searchParams.get("category");
    const environmentParam = searchParams.get("environment");
    if (!actionParam && !categoryParam && !environmentParam) return undefined;
    const action = actionParam && (POLICY_FIT_ACTIONS as readonly string[]).includes(actionParam)
      ? (actionParam as PolicyFitAction)
      : undefined;
    const category = categoryParam && (POLICY_FIT_CATEGORIES as readonly string[]).includes(categoryParam)
      ? (categoryParam as PolicyFitCategory)
      : undefined;
    const environment = environmentParam && (POLICY_FIT_ENVIRONMENTS as readonly string[]).includes(environmentParam)
      ? (environmentParam as PolicyFitEnvironment)
      : undefined;
    if (!action && !category && !environment) return undefined;
    return { action, category, environment, autoFind: Boolean(action && category) };
  }, [searchParams]);

  const contract = useMemo(() => (packId ? studioPackContract(packId) : null), [packId]);
  const snippet = useMemo(() => studioSnippetForPath(pathId), [pathId]);
  const venueProfiles = useMemo(() => studioPublicCatalog().trading_venue.profiles ?? [], []);
  const baseCreatedSnippet = pathInstructions?.[pathId] ?? snippet;
  const createdSnippet = pathId === "trading_venue"
    ? { ...baseCreatedSnippet, code: tradingVenueProfileExample(venueProfileId) }
    : baseCreatedSnippet;
  const activationChecklist = useMemo(() => buildPartnerActivationChecklist(optionalCaps), [optionalCaps]);
  const optionalCapabilityChoices = useMemo(
    () => studioPublicCatalog().starter_kit.optional_capabilities.filter(
      (id) => id !== PATH_IMPLIED_CAPABILITY[pathId],
    ),
    [pathId],
  );
  const activitySignalSelected = optionalCaps.includes("partner_activity_signal");
  const activityPackCategories = useMemo(() => {
    if (!packId) return [];
    const pack = resolvePolicyPack(packId);
    if (!pack?.allowed_activity_categories?.length) return [];
    return activityCategoriesForPack(pack, pack.allowed_activity_categories);
  }, [packId]);

  function toggleCapability(id: string) {
    setOptionalCaps((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const configuredAppId = created?.application_id ?? resumeApp?.id ?? urlAppId;

  async function generateStarter() {
    setKitError("");
    setKitBusy(true);
    try {
      if (!packId) {
        setKitError("Choose a policy pack before generating a starter kit.");
        setKitBusy(false);
        return;
      }
      const payload = {
        pack_id: packId,
        path: pathId,
        platform,
        capabilities: optionalCaps,
        ...(pathId === "trading_venue" ? { venue_profile_id: venueProfileId } : {}),
      };
      const endpoint = configuredAppId && signedIn
        ? `/api/launchpad/applications/${configuredAppId}/starter-kit`
        : "/api/developers/integration-studio/starter-kit";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: configuredAppId && signedIn ? "include" : "same-origin",
        body: JSON.stringify(
          configuredAppId && signedIn
            ? { ...payload, binding_id: bindingId ?? "" }
            : payload,
        ),
      });
      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        code?: string;
        filename?: string;
        kit?: { filename?: string; files?: Array<{ path: string; contents: string }>; archive_base64?: string };
        files?: Array<{ path: string; contents: string }>;
        archive_base64?: string;
      };
      const files = data.kit?.files ?? data.files;
      const archive = data.kit?.archive_base64 ?? data.archive_base64;
      const filename = data.kit?.filename ?? data.filename;
      if (!res.ok || !data.ok || !files || !archive) {
        setKitError(data.code ?? data.error ?? "Could not generate starter kit");
        setKitFiles([]);
        setKitArchive("");
        return;
      }
      setKitFiles(files);
      setKitArchive(archive);
      setKitFilename(filename ?? "abraxas-starter-kit.zip");
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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pack = params.get("pack");
    const path = params.get("path");
    const requestedPlatform = params.get("platform");
    const requestedCapabilities = params.getAll("capability").filter(isStarterKitOptionalCapability);
    const catalogVersion = params.get("catalog_version");
    if (pack && isPolicyPackId(pack)) setPackId(pack);
    if (path && isIntegrationStudioPathId(path)) setPathId(path);
    if (requestedPlatform && isStarterKitPlatform(requestedPlatform)) setPlatform(requestedPlatform);
    if (requestedCapabilities.length > 0) setOptionalCaps(requestedCapabilities);
    const outcome = params.get("outcome");
    if (outcome && isIntegrationStudioOutcomeId(outcome)) {
      setSelectedOutcomeId(outcome);
      const mapped = INTEGRATION_STUDIO_OUTCOMES[outcome];
      setPathId(mapped.defaultPathId);
      setPackId(mapped.defaultPackId);
    }
    const appParam = params.get("app")?.trim();
    if (appParam) setUrlAppId(appParam);
    if (params.get("source") === "browser-builder") {
      setHandoffNotice("Your browser-built plan is loaded. Review it, then generate the starter kit or continue to the hosted sandbox. No terminal is required.");
    } else if (params.get("source") === DEVELOPER_WORKSPACE_STUDIO_SOURCE && variant !== "embedded_workspace") {
      setHandoffNotice(
        developerWorkspaceStudioHandoffNotice({
          policyId: pack,
          policyLabel: null,
        }),
      );
      const step = params.get("step");
      const hash = window.location.hash;
      if (step === "create_sandbox" || hash === "#sandbox") {
        window.requestAnimationFrame(() => {
          document.getElementById("sandbox")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } else if (pack && catalogVersion) {
      setHandoffNotice(`Planning catalog version ${catalogVersion} is preselected. Creating a sandbox still uses the current Launchpad pin, not an automatic upgrade.`);
    }
  }, [variant]);

  useEffect(() => {
    if (!embeddedInDeveloperWorkspace || variant !== "embedded_workspace") return;
    if (authoritativePolicyId && isPolicyPackId(authoritativePolicyId)) {
      setPackId((current) => current ?? authoritativePolicyId);
    }
    if (walletProofRecorded && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash !== "#sandbox" && hash !== "#configuration" && hash !== "#request") {
        window.requestAnimationFrame(() => {
          document.getElementById("sandbox")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [authoritativePolicyId, embeddedInDeveloperWorkspace, variant, walletProofRecorded]);

  const refreshLaunchpadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/launchpad/auth/session", { credentials: "include" });
      const data = await res.json() as { authenticated?: boolean };
      const authenticated = Boolean(data.authenticated);
      setSignedIn(authenticated);
      if (!authenticated) {
        setResumeApp(null);
        setResumePartnerId("");
        return;
      }
      const workspaceRes = await fetch("/api/launchpad/applications", { credentials: "include" });
      const workspace = await workspaceRes.json() as {
        workspace?: {
          partner_id?: string;
          applications?: ResumableApp[];
        };
      };
      const apps = workspace.workspace?.applications ?? [];
      const fromUrl = urlAppId ? apps.find((item) => item.id === urlAppId) : undefined;
      const chosen = fromUrl ?? apps[0] ?? null;
      setResumeApp(chosen);
      setResumePartnerId(workspace.workspace?.partner_id ?? "");
      if (chosen) {
        const inferred = inferPolicyPackFromPolicyId(chosen.policy_id);
        if (inferred) {
          setPackId((current) => current ?? inferred.id);
        }
      }
    } catch {
      setSignedIn(false);
      setResumeApp(null);
      setResumePartnerId("");
    }
  }, [urlAppId]);

  useEffect(() => {
    void refreshLaunchpadSession();
  }, [refreshLaunchpadSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { packId?: string; pathId?: string };
      if (draft.packId && isPolicyPackId(draft.packId)) {
        setPackId((current) => (current ?? (draft.packId as PolicyPackId)));
      }
      if (draft.pathId && isIntegrationStudioPathId(draft.pathId)) setPathId(draft.pathId);
    } catch {
      /* ignore corrupt draft */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        STUDIO_DRAFT_STORAGE_KEY,
        JSON.stringify({ packId, pathId }),
      );
    } catch {
      /* ignore quota */
    }
  }, [packId, pathId]);

  async function createSandbox() {
    setError("");
    if (!packId) {
      setError("Choose a policy pack on the Policy stage before creating a sandbox.");
      return;
    }
    setSubmitting(true);
    try {
      const storageKey = "abraxas_studio_sandbox_id";
      let sandboxId = window.sessionStorage.getItem(storageKey);
      if (!sandboxId) {
        sandboxId = window.crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, sandboxId);
      }
      const res = await fetch("/api/developers/integration-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          application_name: applicationName,
          policy_template_id: packId,
          return_url: returnUrl,
          environment: "sandbox",
          sandbox_id: sandboxId,
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
        if (data.error === "production_denied" || data.code === "production_denied") {
          setError("Production credentials are not self-service.");
          return;
        }
        if (data.code === "launchpad_console_session_unconfigured") {
          setError(
            "Launchpad browser session signing is not configured on this deployment. "
              + "Set ABRAXAS_BROWSER_SESSION_SECRET (≥16 characters) for Preview/staging, redeploy, then retry. "
              + "Your sandbox application and API key are still valid.",
          );
          return;
        }
        if (data.code === "launchpad_not_configured") {
          setError(
            "Sandbox provisioning is not connected to Launchpad persistence in this environment. "
              + "Use a staging deployment with Supabase migrations 084–086 applied and valid "
              + "NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY, then retry. "
              + "Your wallet verification in Developer Workspace is still valid.",
          );
          return;
        }
        if (data.code === "launchpad_provision_failed") {
          setError(
            "Could not create the sandbox application. Check the callback URL (use https://localhost or a public HTTPS URL on staging), "
              + "wait out rate limits, and retry. If this persists on staging, contact support with the time of the attempt.",
          );
          return;
        }
        setError(data.error ?? data.code ?? "Could not create sandbox");
        return;
      }
      if (data.application) {
        if (packId && data.application.policy_template_id !== packId) {
          setError(
            "The provisioned sandbox policy does not match your selected pack. Return to Policy, confirm your selection, and try again.",
          );
          setSubmitting(false);
          return;
        }
        if (isPolicyPackId(data.application.policy_template_id)) {
          setPackId(data.application.policy_template_id);
        }
        setCreated(data.application);
        void recordGtmClientEvent("sandbox_created", {
          recommended_path: pathId,
          environment: "sandbox",
        });
        if (typeof window !== "undefined" && !data.idempotency_replay) {
          const next = integrationStudioStageHref("configuration");
          window.history.replaceState(null, "", next);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
      }
      if (data.api_key) {
        setRevealedKey(data.api_key);
        try {
          const sessionRes = await fetch("/api/launchpad/auth/session", {
            method: "POST",
            headers: { Authorization: `Bearer ${data.api_key}` },
            credentials: "include",
          });
          setSignedIn(sessionRes.ok);
        } catch {
          setSignedIn(false);
        }
      } else if (data.application) {
        await refreshLaunchpadSession();
      }
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

  const walletApp = created
    ? {
        applicationId: created.application_id,
        partnerId: created.partner_id,
        policyId: created.policy_id,
        policyVersion: created.policy_version,
      }
    : resumeApp && resumePartnerId
      ? {
          applicationId: resumeApp.id,
          partnerId: resumePartnerId,
          policyId: resumeApp.policy_id,
          policyVersion: resumeApp.policy_version,
        }
      : null;

  const fromDeveloperWorkspace = searchParams.get("source") === DEVELOPER_WORKSPACE_STUDIO_SOURCE;

  const applyLocalReferenceCallback = useCallback(() => {
    setReturnUrl(LOCAL_REFERENCE_CALLBACK_URL);
  }, []);

  const studioNextAction = created
    ? {
        action: "Test your sandbox integration",
        detail: `${created.application_id.slice(0, 8)}… is ready in sandbox. Run a verification before requesting production.`,
        href: launchpadSandboxTestHref(created.application_id),
        buttonLabel: "Run test verification",
      }
    : resumeApp
      ? {
          action: `Continue ${resumeApp.application_name}`,
          detail: "Your sandbox already exists. Launchpad shows the next merchant step from measured integration state.",
          href: launchpadResumeHref(resumeApp.id),
          buttonLabel: PARTNER_ACTIVATION_RESUME_CTA,
        }
      : fromDeveloperWorkspace
        ? {
            action: "Create your test app",
            detail:
              "Step 2 of your first integration. Name a safe sandbox application — advanced callback settings stay optional until you connect your own server.",
            href: "#sandbox",
            buttonLabel: "Create my test app",
          }
        : {
            action: "Choose what to verify",
            detail: "Pick what your app needs to check, then create a private test application.",
            href: undefined,
            buttonLabel: "Start below",
          };

  const stage = useIntegrationStudioStageFromContext();

  const railEnvironment = created || resumeApp ? "Sandbox (safe to experiment)" : "Not started";
  const railApplication =
    resumeApp?.application_name
    ?? (created ? `${created.public_slug} (${created.application_id.slice(0, 8)}…)` : "None yet");
  const railPolicyLabel = contract?.display_name ?? (packId ? packId.replace(/_/g, " ") : "Not selected");
  const railReadiness = studioNextAction.action;

  const operationsRail: ModeCCommandRailItem[] = useMemo(
    () => [
      {
        id: "readiness",
        label: "Next step",
        value: railReadiness,
        tone: created || resumeApp ? "ready" : "neutral",
      },
      { id: "policy", label: "Verifying", value: railPolicyLabel, tone: "neutral" },
      { id: "app", label: "Test app", value: railApplication, tone: "neutral" },
      {
        id: "env",
        label: "Test environment",
        value: railEnvironment,
        tone: created || resumeApp ? "sandbox" : "neutral",
      },
    ],
    [railEnvironment, railPolicyLabel, railApplication, railReadiness, created, resumeApp],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(".abx-studio-workspace__canvas")?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }, [stage]);

  return (
    <>
      <IntegrationStudioOperationalBridge
        applicationId={configuredAppId}
        signedIn={signedIn}
        returnUrl={returnUrl}
        operationsRail={operationsRail}
        nextAction={studioNextAction}
      />

      {stage === "sandbox" && resumeApp && !created && (
        <Reveal delay={0.05}>
          <ContentCard title="Current sandbox">
            <p style={{ ...body, marginBottom: "0.75rem" }}>
              Signed in as a partner developer. {resumeApp.application_name} ({resumeApp.public_slug}) is active in sandbox.
            </p>
            <details>
              <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
                Developer shortcuts
              </summary>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                <Btn href={launchpadSandboxTestHref(resumeApp.id)} size="sm" variant="secondary">Run test verification</Btn>
                <Btn href={launchpadConfigureHref(resumeApp.id)} variant="ghost" size="sm">Configure callbacks</Btn>
                <Btn href={launchpadPolicyVersionHref(resumeApp.id)} variant="ghost" size="sm">Policy version</Btn>
              </div>
            </details>
          </ContentCard>
        </Reveal>
      )}

      {stage === "policy" && (
      <>
      <Reveal delay={0.04}>
      <ContentCard title="Choose a policy pack">
        <p style={{ ...body, marginBottom: "0.85rem", maxWidth: "52ch" }}>
          Select what your customers must prove. These are the same Launchpad policy packs. Identity or liveness is never the default path.
        </p>
        {packId === "content_origin_disclosure" && contract ? (
          <div style={{ ...body, marginBottom: "0.85rem", padding: "0.85rem", borderRadius: 12, border: "1px solid rgba(45,212,191,0.25)", background: "rgba(45,212,191,0.06)" }}>
            <strong>What this proves:</strong> creator attestation (L0), AI assistance disclosure (L0), and source integrity for the bound fingerprint (L1).
            <br />
            <strong>What it does not prove:</strong> authorship, copyright, originality, or AI detection scores.
            <br />
            <Link href="/demo/reference-publisher" style={{ color: "var(--accent)", fontWeight: 700 }}>Open reference publisher demo</Link>
          </div>
        ) : null}
        {handoffNotice && (
          <p role="status" style={{ ...body, marginBottom: "0.75rem", color: "var(--text-primary)", fontWeight: 700 }}>
            {handoffNotice}
          </p>
        )}
        {!packId ? (
          <p role="status" style={{ ...body, marginBottom: "0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>
            Select one pack to continue. Abraxas supports age gates, wallet control, membership, provenance, and institutional protocol access—not identity verification by default.
          </p>
        ) : null}
        <div className="abx-studio-pack-grid">
          {packs.map((pack) => (
            <button
              key={pack.pack_id}
              type="button"
              className={
                pack.pack_id === packId
                  ? "abx-studio-pack-chip abx-studio-pack-chip--selected"
                  : "abx-studio-pack-chip"
              }
              aria-pressed={pack.pack_id === packId}
              onClick={() => setPackId(pack.pack_id)}
            >
              {pack.display_name}
            </button>
          ))}
        </div>
        {contract ? (
          <div className="abx-studio-policy-summary">
            <p className="abx-studio-policy-summary__text">
              <strong>{contract.display_name}</strong> shares only{" "}
              <code style={{ fontFamily: MONO, fontSize: "0.88em" }}>{contract.disclosed_result}</code>{" "}
              with your application.
            </p>
            <Btn href={studioStageHref("sandbox")} size="sm">
              Continue to sandbox →
            </Btn>
          </div>
        ) : null}
      </ContentCard>
      </Reveal>

      <details style={{ marginBottom: "1.25rem" }}>
        <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)", marginBottom: "0.65rem" }}>
          Need help choosing? Guided matching (optional)
        </summary>
        <div style={{ marginTop: "0.85rem", display: "grid", gap: "1rem" }}>
          <IntegrationStudioOutcomePicker
            selectedOutcomeId={selectedOutcomeId}
            onSelect={({ outcomeId, pathId: nextPath, packId: nextPack }) => {
              setSelectedOutcomeId(outcomeId);
              setPathId(nextPath);
              setPackId(nextPack);
            }}
          />
          <PolicyFitPlanner
            initial={policyFitInitial}
            onApply={(selection) => {
              if (!isPolicyPackId(selection.packId)) return;
              setPackId(selection.packId);
              setPathId(selection.pathId);
              setOptionalCaps(selection.capabilities);
            }}
          />
        </div>
      </details>

      {contract && (
        <ContentCard title="Policy privacy contract">
          <p style={{ ...body, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Holders disclose the minimum required for <strong>{contract.display_name}</strong>. Your app receives the disclosed result—not raw identity data.
          </p>
          <details>
            <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
              See requirement, assurance, and verification methods
            </summary>
            <dl style={{ display: "grid", gap: "0.55rem", margin: "0.75rem 0 0" }}>
              {[
                ["Requirement", contract.requirement],
                ["Purpose", contract.purpose],
                ["Assurance", contract.assurance],
                ["Stays private", contract.withheld.join(", ")],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt style={{ ...body, color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>{key}</dt>
                  <dd style={{ ...body, margin: "0.15rem 0 0", color: "var(--text-primary)" }}>{value}</dd>
                </div>
              ))}
            </dl>
            <p style={{ ...body, marginTop: "0.75rem" }}>{contract.google_is_account_only}</p>
            <ul style={{ ...body, margin: "0.75rem 0 0", paddingLeft: "1.1rem" }}>
              {contract.methods.map((method) => (
                <li key={method.id}><strong>{method.label}</strong>{method.qualifies ? " · can qualify" : " · does not qualify"}</li>
              ))}
            </ul>
            <p style={{ ...body, marginTop: "0.75rem" }}>
              <Link href="/docs/selective-disclosure" style={{ color: "var(--accent)", fontWeight: 700 }}>Selective disclosure</Link>
              {" · "}
              <Link href="/docs/policy-compatibility" style={{ color: "var(--accent)", fontWeight: 700 }}>Policy compatibility</Link>
            </p>
          </details>
        </ContentCard>
      )}

      <details style={{ marginBottom: "1.25rem" }}>
        <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
          Technical path, implementation, and starter kit
        </summary>
        <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.5rem" }}>
      <ContentCard title="Advanced integration path">
        <p style={{ ...body, color: "var(--text-primary)" }}>
          Recommended default: <strong>{PATH_LABEL[pathId]}</strong>
        </p>
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>Choose a different technical path</summary>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.75rem" }}>
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
        </details>
      </ContentCard>

      <ContentCard title={`Implementation · ${createdSnippet.title}`}>
        <p style={{ ...body }}>
          A working starter is available for this path.{" "}
          <Link href={createdSnippet.docs} style={{ color: "var(--accent)", fontWeight: 700 }}>Open documentation</Link>
        </p>
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>How this connection works</summary>
          <div style={{ marginTop: "0.75rem" }}>
        {pathId === "solana_gate" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Receipt-gated claim access only. No transaction, mint, wallet custody, or fund movement.
          </p>
        )}
        {pathId === "trading_venue" && (
          <div style={{ ...body, marginBottom: "0.65rem" }}>
            <p style={{ margin: 0 }}>
              Choose the venue model for this starter. Integration Studio writes the choice into server configuration; the browser never chooses a profile during an access check.
            </p>
            <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.65rem" }}>
              {venueProfiles.map((profile) => (
                <button
                  key={profile.profile_id}
                  type="button"
                  onClick={() => setVenueProfileId(profile.profile_id)}
                  aria-pressed={venueProfileId === profile.profile_id}
                  style={{
                    padding: "0.7rem 0.8rem",
                    borderRadius: 10,
                    border: venueProfileId === profile.profile_id
                      ? "1px solid rgba(45,212,191,0.62)"
                      : "1px solid var(--border)",
                    background: venueProfileId === profile.profile_id
                      ? "rgba(45,212,191,0.12)"
                      : "var(--surface-inset)",
                    color: "var(--text-primary)",
                    fontFamily: FONT,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ display: "block", fontSize: "0.78rem" }}>{profile.label}</strong>
                  <span style={{ display: "block", marginTop: "0.2rem", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                    {profile.profile_id === "tokenized_securities_venue"
                      ? "Private eligibility before permissioned tokenized-stock access."
                      : profile.profile_id === "hyperliquid_trading_venue"
                        ? "Eligibility preflight for a Hyperliquid-class venue."
                        : "General receipt-gated market access."}
                  </span>
                </button>
              ))}
            </div>
            <p style={{ margin: "0.65rem 0 0", color: "var(--text-muted)" }}>
              Abraxas returns an access decision only. It never executes a trade, holds an asset, or performs settlement.
            </p>
          </div>
        )}
        {pathId === "nft_collection_gate" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Optional access layer for NFT communities, memberships, and trait-gated drops. Your backend or indexer verifies the wallet owns the configured collection and trait, then re-fetches the current Abraxas receipt before granting one named action. No wallet is required to create the sandbox, and Abraxas never mints, transfers, or holds NFTs.
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
        {pathId === "portable_action_contract" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Issue a server-authoritative action contract, re-fetch the current public receipt, then preflight one named action and narrow scope. Allowed means your system may perform that action. Abraxas never executes membership, trading, payment, or protocol calls.
          </p>
        )}
        {pathId === "evm_partner_adapter" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Server-verified allow or deny for one named protocol action. Allowed is never a transaction approval, signature, gas authorization, transfer, or execution. The partner backend keeps node access, signer, contract, gas, and execution. Optional EVM wallet-control is a personal_sign proof for that one action only: sign this message to prove control; no transaction will be created or signed; Abraxas does not read balances or hold keys.
          </p>
        )}
        {pathId === "onchain_protocol_gate" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Holder proves a narrow result privately. Abraxas issues a short-lived signed authorization. Your own contract or program verifies it. Your own code chooses what action to allow. A valid attestation is not a payment, transfer, trade, token approval, gas authorization, or transaction. Abraxas does not deploy a shared execution contract.
          </p>
        )}
        {pathId === "solana_onchain_eligibility_gate" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Private holder verification, then your server verifies the current receipt. Abraxas signs a narrow Solana authorization. Your transaction includes Ed25519 verification immediately before the gate. Your program consumes it once. Local/reference program only. Not deployed to devnet or Mainnet. No SOL or token transfer.
          </p>
        )}
        {pathId === "evm_onchain_eligibility_gate" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Private holder verification, then your server verifies the current receipt. Abraxas signs a short-lived EIP-712 authorization. Your partner-owned gate verifies it and consumes the nonce once. Your contract records that the named action may proceed. Not a live deployment, Arc activation, USDC path, or Circle settlement.
          </p>
        )}
        {pathId === "cross_chain_protocol_access" && (
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Private proof, then fresh consent, then an audience-bound receipt, then a mandatory public-receipt re-fetch, then a one-time chain authorization, then partner-owned activate_protocol_access. Local/sandbox reference on EVM and Solana. A presentation is never sufficient. Browser input cannot choose chain, contract, program, receipt, policy, action, signer, nonce, expiry, or entitlement.
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
          </div>
        </details>
      </ContentCard>

      <ContentCard title="Generate your starter kit">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Choose your platform, then generate a downloadable project with the selected Abraxas connection.
          {configuredAppId && signedIn
            ? " Your configured application pins the selected policy binding in generated code."
            : " Sign in and create a sandbox to pin a live application binding."}
        </p>
        {configuredAppId && signedIn && (
          <div style={{ marginBottom: "0.85rem" }}>
            <PartnerBindingSelector
              applicationId={configuredAppId}
              selectedBindingId={bindingId}
              onSelect={setBindingId}
              label="Integration policy"
            />
          </div>
        )}
        <details style={{ marginBottom: "0.75rem" }}>
          <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>Technical requirements</summary>
          <ul style={{ ...body, paddingLeft: "1.1rem", margin: "0.65rem 0 0", display: "grid", gap: "0.3rem" }}>
            {STARTER_KIT_MINIMUM_REQUIREMENTS.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </details>
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
        <details style={{ marginBottom: "0.85rem" }}>
          <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
            Add optional capabilities{optionalCaps.length ? ` (${optionalCaps.length} selected)` : ""}
          </summary>
          <div style={{ marginTop: "0.65rem" }}>
          <p style={{ ...body, marginBottom: "0.35rem", fontWeight: 700, color: "var(--text-primary)" }}>Optional capabilities</p>
          <p style={{ ...body, marginBottom: "0.55rem" }}>Your selected path is included automatically. Add only extra capabilities your service needs.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.75rem" }}>
            {optionalCapabilityChoices.map((id) => (
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
          {activitySignalSelected && (
            <div style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "0.65rem 0.75rem",
              marginBottom: "0.75rem",
              background: "var(--surface-inset)",
            }}>
              <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                Partner activity signal (optional)
              </p>
              <p style={{ ...body, marginBottom: "0.45rem" }}>
                Use a category calculated from your own records alongside an Abraxas receipt. Raw activity data is not sent to Abraxas.
              </p>
              <ul style={{ ...body, paddingLeft: "1.1rem", display: "grid", gap: "0.25rem", marginBottom: "0.45rem" }}>
                <li>Allowed categories for this policy pack: {activityPackCategories.length ? activityPackCategories.join(", ") : "none. Choose a pack with an activity allowlist."}</li>
                <li>Categories come from partner-owned records, not Abraxas verification</li>
                <li>Holder consent is required before preflight</li>
                <li>Wallet connection is not required</li>
              </ul>
              <p style={{ ...body, marginBottom: 0 }}>{PARTNER_ACTIVITY_NO_RAW_DATA}</p>
            </div>
          )}
          <div style={{ marginBottom: "0.85rem" }}>
            <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>What this starter kit does not do</p>
            <ul style={{ ...body, paddingLeft: "1.1rem", display: "grid", gap: "0.3rem" }}>
              {STARTER_KIT_DOES_NOT_DO.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
  
          </div>
        </details>
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
        </div>
      </details>
      <IntegrationStudioStageFooter stage="policy" />
      </>
      )}

      {stage === "sandbox" && (
      <>
      <ContentCard title={INTEGRATION_STUDIO_SANDBOX_STAGE_TITLE} id="sandbox">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          This is where you try Abraxas as a developer. Your first application runs safely in a test environment — you
          can change the name later.
        </p>
        <p style={{ ...body, marginBottom: "0.75rem", fontSize: "0.82rem" }}>
          <strong style={{ color: "var(--text-primary)" }}>Safe to experiment.</strong> Your test app will not affect a
          live protocol. Advanced connection settings appear when you need them.
        </p>
        {!packId ? (
          <div style={{ ...body, marginBottom: "0.85rem", padding: "0.75rem", borderRadius: 12, border: "1px solid var(--border)" }}>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Select a policy pack first
            </p>
            <p style={{ margin: 0 }}>
              Step 1 chooses the policy Abraxas will bind to this sandbox. Nothing is provisioned until a pack is selected.
            </p>
            <div style={{ marginTop: "0.65rem" }}>
              <Btn href={studioStageHref("policy")} size="sm">
                Back to policy selection
              </Btn>
            </div>
          </div>
        ) : (
          <p style={{ ...body, marginBottom: "0.75rem" }}>
            What your app will verify:{" "}
            <strong style={{ color: "var(--text-primary)" }}>{contract?.display_name ?? packId}</strong>
          </p>
        )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void createSandbox();
            }}
            style={{ display: "grid", gap: "0.7rem", marginBottom: "0.9rem" }}
          >
            <label style={body}>
              Application name
              <input
                value={applicationName}
                onChange={(event) => setApplicationName(event.target.value)}
                required
                disabled={!packId}
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
            <details style={{ ...body, margin: 0 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text-primary)" }}>
                Advanced: callback URL (where your app receives results)
              </summary>
              <label style={{ ...body, display: "block", marginTop: "0.55rem" }}>
                Allowlisted callback URL
                <input
                  value={returnUrl}
                  onChange={(event) => setReturnUrl(event.target.value)}
                  required
                  disabled={!packId}
                  autoComplete="off"
                  placeholder="http://localhost:3000/callback"
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
              <p style={{ ...body, margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
                {INTEGRATION_STUDIO_CALLBACK_FIELD_HELP}
              </p>
              {isLocalReferenceCallbackUrl(returnUrl) ? (
                <p
                  style={{
                    ...body,
                    margin: "0.35rem 0 0",
                    fontSize: "0.78rem",
                    color: "var(--warning, #f59e0b)",
                  }}
                  role="note"
                >
                  Local reference server only ({LOCAL_REFERENCE_CALLBACK_URL}). Not for hosted or production
                  applications.
                </p>
              ) : null}
              {returnUrl.trim().startsWith("http://localhost") || returnUrl.trim().startsWith("https://localhost") ? (
                <p
                  style={{
                    ...body,
                    margin: "0.5rem 0 0",
                    fontSize: "0.78rem",
                    padding: "0.55rem 0.65rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface-inset)",
                  }}
                  role="note"
                >
                  {INTEGRATION_STUDIO_CALLBACK_DEFAULT_HINT}
                </p>
              ) : null}
              <p style={{ ...body, margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
                Policy identifier: <span style={{ fontFamily: MONO }}>{packId}</span> · Environment: sandbox only
              </p>
            </details>
            <p style={{ ...body, margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              You can create your test app with the default callback while exploring. Open Advanced above to change
              where results are delivered when you connect your own server.
            </p>
            <Btn
              size="sm"
              disabled={submitting || !applicationName.trim() || !packId}
              loading={submitting}
              onClick={() => void createSandbox()}
            >
              {INTEGRATION_STUDIO_CREATE_SANDBOX_BUTTON}
            </Btn>
          </form>
        {error && <p style={{ ...body, color: "var(--danger, #f87171)", marginBottom: "0.7rem" }}>{error}</p>}
        {revealedKey && (
          <div style={{ ...body, marginBottom: "0.85rem" }}>
            <p style={{ margin: "0 0 0.4rem" }}>Sandbox key. Shown once. Copy it now.</p>
            <code style={{ fontFamily: MONO, fontSize: "0.72rem", wordBreak: "break-all" }}>{revealedKey}</code>
          </div>
        )}
        {created && (
          <div style={{ ...body, marginBottom: "0.85rem" }}>
            <p style={{ margin: "0 0 0.45rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Sandbox ready — {created.public_slug}
            </p>
            <p style={{ margin: 0 }}>
              Policy {created.policy_id} (pack {created.policy_template_id}) · key prefix {created.key_prefix}
            </p>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {created && (
            <Btn href={integrationStudioStageHref("request")} size="sm">
              Run test verification →
            </Btn>
          )}
          {created && (
            <Btn href={integrationStudioStageHref("configuration")} variant="secondary" size="sm">
              Review configuration →
            </Btn>
          )}
          {created && hostedDocs?.hosted_link && (
            <Btn href={hostedDocs.hosted_link} variant="secondary" size="sm">
              Hosted sandbox test →
            </Btn>
          )}
          {!signedIn && !created && (
            <Btn href={INTEGRATION_STUDIO_PROVISION.launchpad_href} variant="ghost" size="sm">
              Open an existing sandbox →
            </Btn>
          )}
        </div>
        <details style={{ marginTop: "0.85rem" }}>
          <summary style={{ ...body, cursor: "pointer", fontWeight: 700, color: "var(--text-muted)" }}>
            Production review and portal (later)
          </summary>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
            {created && (
              <Btn href={launchpadResumeHref(created.application_id)} variant="ghost" size="sm">
                Open in Launchpad →
              </Btn>
            )}
            <Btn href={INTEGRATION_STUDIO_PROVISION.partner_portal_href} variant="ghost" size="sm">
              Partner portal →
            </Btn>
            <span style={{ ...body, alignSelf: "center" }}>{INTEGRATION_STUDIO_PROVISION.production_upgrade_cta}</span>
          </div>
        </details>
      </ContentCard>

      <IntegrationStudioSessionHandoff
        signedIn={signedIn}
        applicationId={configuredAppId}
        onSessionChange={(authenticated) => {
          setSignedIn(authenticated);
          if (authenticated) void refreshLaunchpadSession();
        }}
      />

      <ContentCard title="Test your sandbox">
        <p style={{ ...body }}>Run the hosted flow first. Open the full checklist only when you are ready to verify every integration edge.</p>
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>Show sandbox checklist</summary>
          <ol style={{ ...body, paddingLeft: "1.15rem", display: "grid", gap: "0.55rem", marginTop: "0.75rem" }}>
            {activationChecklist.map((item) => (
              <li key={item.id}>
                <strong>{item.title}.</strong> {item.body}{" "}
                <Link href={item.href} style={{ color: "var(--accent)", fontWeight: 700 }}>{item.href}</Link>
                {item.kit_file ? ` · kit file ${item.kit_file}` : ""}
              </li>
            ))}
          </ol>
        </details>
      </ContentCard>
      <IntegrationStudioStageFooter stage="sandbox" />
      </>
      )}

      {stage === "configuration" && (
      <>
      {!configuredAppId ? (
        <IntegrationStudioEmptyState
          title="Configuration unlocks after sandbox provisioning"
          lead="Callback URLs, policy pins, and optional wallet bindings load from Launchpad once a sandbox application exists. Nothing is fabricated in this workspace."
          steps={[
            "Choose a policy pack on the Policy stage.",
            "Create or resume a sandbox application with an allowlisted callback URL.",
            "Return here to review live pins, callbacks, and readiness checks.",
          ]}
          action={
            <>
              <Btn href={studioStageHref("sandbox")} size="sm">
                Create sandbox application
              </Btn>
              <Btn href={studioStageHref("policy")} variant="secondary" size="sm">
                Review policy packs
              </Btn>
            </>
          }
        />
      ) : (
        <>
          <IntegrationStudioConfigurationPanel applicationId={configuredAppId} signedIn={signedIn} />
          {configuredAppId && (
            <IntegrationAdoptionReadinessPanel
              baseUrl={typeof window !== "undefined" ? window.location.origin : "https://demo.abraxasworld.xyz"}
              applicationId={configuredAppId}
              partnerId={walletApp?.partnerId ?? null}
              policyId={walletApp?.policyId ?? packId}
              callbackUrl={returnUrl}
              apiKeyRevealedOnce={Boolean(revealedKey)}
              fromDeveloperWorkspace={fromDeveloperWorkspace}
              onRequestLocalReferenceCallback={applyLocalReferenceCallback}
            />
          )}
          {configuredAppId && signedIn && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <Btn href={launchpadConfigureHref(configuredAppId)} size="sm">
                Edit callbacks in Launchpad
              </Btn>
              <Btn href={launchpadPolicyVersionHref(configuredAppId)} variant="secondary" size="sm">
                Policy version planner
              </Btn>
            </div>
          )}
          {walletApp && (
            <OptionalWalletConnectionsPanel
              applicationId={walletApp.applicationId}
              partnerId={walletApp.partnerId}
              policyId={walletApp.policyId}
              policyVersion={walletApp.policyVersion}
            />
          )}
          {walletApp && (
            <details style={{ marginTop: "0.75rem" }}>
              <summary style={{ cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>
                Optional upgrade · paid usage plans (not required for sandbox testing)
              </summary>
              <div style={{ marginTop: "0.75rem" }}>
                <SolanaUsdcPlansPanel applicationId={walletApp.applicationId} />
              </div>
            </details>
          )}
        </>
      )}
      <IntegrationStudioStageFooter stage="configuration" />
      </>
      )}

      {stage === "request" && (
      <>
      {!configuredAppId ? (
        <IntegrationStudioEmptyState
          title="Verification requests require a sandbox application"
          lead="Run authenticated harness scenarios against your sandbox after provisioning. Signed receipt material appears in the integration inspector—never in the URL."
          steps={[
            "Create your test app in the sandbox and attach your Launchpad session (one-time API key).",
            "Confirm callback configuration on the Configuration stage.",
            "Run a harness scenario here, then verify receipts independently on the workbench.",
          ]}
          action={
            <Btn href={studioStageHref("sandbox")} size="sm">
              Go to sandbox provisioning
            </Btn>
          }
        />
      ) : (
        <IntegrationStudioRequestWorkbench />
      )}

      <ContentCard title="Upgrade · Production review">
        <p style={body}>{PARTNER_ACTIVATION_PRODUCTION.notice}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Btn href={created ? launchpadResumeHref(created.application_id) : resumeApp ? launchpadResumeHref(resumeApp.id) : INTEGRATION_STUDIO_PROVISION.launchpad_href} size="sm">
            Open Launchpad readiness →
          </Btn>
          <Btn href="/verify" variant="secondary" size="sm">
            Independent verification workbench →
          </Btn>
          <Btn href="/docs/sandbox-conformance" variant="ghost" size="sm">
            Sandbox partner contract →
          </Btn>
        </div>
      </ContentCard>
      <IntegrationStudioStageFooter stage="request" />
      </>
      )}
    </>
  );
}
