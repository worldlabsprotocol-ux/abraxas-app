"use client";
// FILE: components/account/EphemeralSandboxWorkspaceClient.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  fetchWalletActionChallenge,
  signWalletActionChallenge,
  type WalletActionChallengePayload,
} from "@/lib/auth/ephemeralWallet/clientActionAuth";
import {
  EPHEMERAL_WORKSPACE_SANDBOX_BADGE,
  EPHEMERAL_WORKSPACE_SANDBOX_EXPIRY_NOTE,
  policyExperienceBanner,
  verificationReviewScopeNote,
  verificationReviewTitle,
} from "@/lib/developers/ephemeralWorkspaceCopy";
import {
  mapEphemeralWalletOperationalError,
  mapWorkspaceUserFacingError,
  type WorkspaceUserFacingError,
} from "@/lib/developers/ephemeralWorkspaceUserErrors";
import {
  mapReceiptValidationApiResponse,
  type ReceiptValidationUiState,
} from "@/lib/developers/mapReceiptValidationOutcome";
import {
  firstSandboxPolicyIdWithVerification,
  pickSandboxPolicyAvailability,
  type SandboxPolicyAvailability,
} from "@/lib/auth/ephemeralWallet/sandboxPolicyAvailability.shared";
import {
  EPHEMERAL_WALLET_SESSION_EVENT,
  WALLET_SIGN_IN_DIALOG_EVENT,
  fetchEphemeralWalletClientSession,
  notifyEphemeralWalletSessionChanged,
  type WalletSignInDialogDetail,
} from "@/lib/auth/ephemeralWallet/clientSession";
import { EphemeralWorkspaceSessionRail } from "./EphemeralWorkspaceSessionRail";
import {
  signPassportPossessionChallenge,
  type PassportPossessionChallengePayload,
} from "@/lib/passport/reusableCredential/holderPossessionChallengeSigning";
import { generateSandboxSessionPossessionKeyPair } from "@/lib/auth/ephemeralWallet/sandboxHolderPossessionKey.shared";
import { TrustExecutionTrace, deriveTrustExecutionStages } from "./TrustExecutionTrace";
import { WalletScopedAuthorizationReviewCard } from "@/components/wallet/WalletAuthorizationReviewCard";
import {
  buildEphemeralSandboxCompletionView,
  sandboxIntegrationStudioEligible,
} from "@/lib/developers/ephemeralWorkspaceCompletion";
import { buildUnifiedWorkspaceIntegrationUrl } from "@/lib/developers/unifiedWorkspaceContinuity";
import { capturePostAuthResumePath } from "@/lib/nav/postAuthResume";
import { EphemeralSandboxVerificationCompletion } from "./EphemeralSandboxVerificationCompletion";
import { EmbeddedIntegrationStudioPanel } from "@/components/developers/EmbeddedIntegrationStudioPanel";
import { UnifiedWorkspaceJourneyBar } from "@/components/developers/UnifiedWorkspaceJourneyBar";
import { HomeInlineWorkspaceProcessing } from "@/components/home/HomeInlineWorkspaceProcessing";
import { isUnifiedWorkspaceIntegrationSearch } from "@/lib/developers/unifiedWorkspaceContinuity";
import { mapGuidedProgressReceiptValidation } from "@/lib/developers/mapGuidedProgressRestore";
import type { GuidedIntegrationJourneyStepId } from "@/lib/developers/guidedIntegrationJourney";
import styles from "./EphemeralDeveloperWorkspace.module.css";

const EPHEMERAL_SANDBOX_RESULT_LABEL = "ephemeral_sandbox_test_only";

type Policy = {
  policy_id: string;
  label: string;
  description: string;
};

type Workspace = {
  workspace_id: string;
  expires_at: string;
};

type TestResult = {
  receipt_id: string;
  result_label: string;
  signature: string;
  payload_hash: string;
  [key: string]: unknown;
};

type WorkspacePhase =
  | "loading"
  | "signed_out"
  | "awaiting_sign_in"
  | "ready"
  | "entering"
  | "workspace"
  | "disclosure"
  | "authorizing"
  | "review"
  | "signing"
  | "submitting"
  | "result"
  | "failure";

type PreparedEvidence = {
  kind: "passport_reusable_credential";
  credential: Record<string, unknown>;
  portable_revocation_snapshot: Record<string, unknown>;
};

type PresentationDisclosure = {
  experience_kind?: string;
  headline?: string;
  requested_attribute: string;
  disclosed_to_partner: string[];
  withheld: string[];
  sandbox_notice: string;
};

function logSandboxStage(input: Record<string, unknown>): void {
  if (typeof console !== "undefined" && console.info) {
    console.info("[abraxas sandbox]", input);
  }
}

function mapSignFailure(code?: string | null): WorkspaceUserFacingError {
  switch (code) {
    case "expired":
      return {
        title: "Request expired",
        message: "For your security, this request is no longer valid.",
        recovery: "Create a new request.",
        technicalCode: code,
      };
    case "cancelled":
    case "aborted":
      return {
        title: "Signature request cancelled",
        message: "No signature was submitted. Your workspace and presentation stay as they were.",
        recovery: "Try again when you are ready, or cancel to return to the policy screen.",
        technicalCode: code,
      };
    case "timeout":
      return {
        title: "Wallet did not respond",
        message: "Phantom may still show a pending request. Open your wallet to approve or dismiss it.",
        recovery: "Try again to start a fresh request after you finish in Phantom.",
        technicalCode: code,
      };
    case "stale":
      return {
        title: "Request superseded",
        message: "This signing attempt was replaced or cancelled.",
        recovery: "Use Try again if you still need to sign.",
        technicalCode: code,
      };
    default:
      return mapWorkspaceUserFacingError({ code });
  }
}

export function EphemeralSandboxWorkspaceClient({
  surface = "route",
}: {
  /** `homepage` keeps the guided journey on `/` without route hops. */
  surface?: "route" | "homepage";
}) {
  const isHomepageEmbed = surface === "homepage";
  const router = useRouter();
  const searchParams = useSearchParams();
  const integrationContinuityActive = isUnifiedWorkspaceIntegrationSearch(searchParams);
  const integrationUrlSyncedRef = useRef(false);
  const integrationHandoffLanding =
    integrationContinuityActive
    && Boolean(searchParams.get("pack"))
    && searchParams.get("step") === "create_sandbox";
  const { signMessage, publicKey, connected: walletAdapterConnected } = useWallet();
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);
  const [phase, setPhase] = useState<WorkspacePhase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyAvailability, setPolicyAvailability] = useState<SandboxPolicyAvailability[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [serverAuthoritativeStudioPack, setServerAuthoritativeStudioPack] = useState<string | null>(null);
  const [serverPolicyLocked, setServerPolicyLocked] = useState(false);
  const [serverSessionAuthenticated, setServerSessionAuthenticated] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState<WalletActionChallengePayload | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [receiptValidation, setReceiptValidation] = useState<ReceiptValidationUiState>({ status: "idle" });
  const [preparedEvidence, setPreparedEvidence] = useState<PreparedEvidence | null>(null);
  const [presentationCommitId, setPresentationCommitId] = useState<string | null>(null);
  const [presentationDisclosure, setPresentationDisclosure] = useState<PresentationDisclosure | null>(null);
  const [possessionChallenge, setPossessionChallenge] = useState<PassportPossessionChallengePayload | null>(null);
  const [presentationAuthorized, setPresentationAuthorized] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userError, setUserError] = useState<WorkspaceUserFacingError | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [walletFocusHint, setWalletFocusHint] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [walletAuthOperational, setWalletAuthOperational] = useState<boolean | null>(null);
  const [needsManualSandboxEnter, setNeedsManualSandboxEnter] = useState(false);

  const sandboxPossessionSecretKeyRef = useRef<Uint8Array | null>(null);
  const autoEnterAttemptedRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const signingAbortRef = useRef<AbortController | null>(null);
  const phaseRef = useRef<WorkspacePhase>("loading");
  phaseRef.current = phase;
  const walletConnectedRef = useRef(false);
  walletConnectedRef.current = walletAdapterConnected && Boolean(publicKey);
  const publicKeyRef = useRef(publicKey);
  publicKeyRef.current = publicKey;

  const abortPendingWalletSign = useCallback(() => {
    signingAbortRef.current?.abort();
    signingAbortRef.current = null;
  }, []);

  const bumpRequestGeneration = useCallback(() => {
    requestGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    abortPendingWalletSign();
  }, [abortPendingWalletSign]);

  const hydrate = useCallback(async (options?: { silent?: boolean }) => {
    const protectedPhases: WorkspacePhase[] = ["review", "signing", "submitting"];
    const silent = Boolean(options?.silent);
    if (!silent) {
      setPhase("loading");
      setUserError(null);
    }
    try {
      const enabledRes = await fetch("/api/auth/wallet/enabled", { cache: "no-store" });
      const enabledBody = (await enabledRes.json()) as {
        operational?: boolean;
        degraded_reason?: string | null;
        config_code?: string | null;
      };
      if (!enabledBody.operational) {
        setWalletAuthOperational(false);
        setServerSessionAuthenticated(false);
        setSessionId(null);
        setWalletAddress(null);
        setSessionExpiresAt(null);
        setWorkspace(null);
        setPhase("failure");
        setUserError(
          mapEphemeralWalletOperationalError({
            degradedReason: enabledBody.degraded_reason,
            configCode: enabledBody.config_code,
          }),
        );
        return;
      }
      setWalletAuthOperational(true);

      const session = await fetchEphemeralWalletClientSession();
      setServerSessionAuthenticated(session.authenticated);
      if (!session.authenticated) {
        const walletConnected = walletConnectedRef.current;
        setPhase(walletConnected ? "awaiting_sign_in" : "signed_out");
        setSessionId(null);
        setWalletAddress(walletConnected ? publicKeyRef.current?.toBase58() ?? null : null);
        setSessionExpiresAt(null);
        setWorkspace(null);
        setServerAuthoritativeStudioPack(null);
        setServerPolicyLocked(false);
        return;
      }
      setSessionId(session.sessionId);
      setWalletAddress(session.walletAddress);
      setSessionExpiresAt(session.expiresAt);

      if (silent && protectedPhases.includes(phaseRef.current)) {
        return;
      }

      const workspaceRes = await fetch("/api/auth/wallet/sandbox/workspace", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const workspaceBody = (await workspaceRes.json()) as {
        workspace?: Workspace | null;
        code?: string;
        guided_progress?: {
          policy_id: string;
          decision: string;
          receipt_id: string;
          receipt_validation?: Parameters<typeof mapGuidedProgressReceiptValidation>[0];
        } | null;
        guided_result?: TestResult | null;
        authoritative_journey?: {
          studio_pack_id?: string | null;
          policy_locked?: boolean;
        } | null;
      };
      if (workspaceBody.workspace) {
        setWorkspace(workspaceBody.workspace);
        setServerAuthoritativeStudioPack(workspaceBody.authoritative_journey?.studio_pack_id ?? null);
        setServerPolicyLocked(Boolean(workspaceBody.authoritative_journey?.policy_locked));
        if (workspaceBody.guided_result && workspaceBody.guided_progress) {
          setResult(workspaceBody.guided_result);
          setDecision(workspaceBody.guided_progress.decision ?? null);
          setSelectedPolicy(workspaceBody.guided_progress.policy_id);
          setReceiptValidation(
            mapGuidedProgressReceiptValidation(workspaceBody.guided_progress.receipt_validation),
          );
          if (!protectedPhases.includes(phaseRef.current)) {
            setPhase("result");
          }
          return;
        }
        if (!protectedPhases.includes(phaseRef.current)) {
          setPhase("workspace");
        }
        return;
      }
      setServerAuthoritativeStudioPack(null);
      setServerPolicyLocked(false);
      if (!protectedPhases.includes(phaseRef.current)) {
        setPhase("ready");
      }
    } catch {
      if (!silent) {
        setPhase("failure");
        setUserError(
          mapWorkspaceUserFacingError({
            code: "ephemeral_state_unavailable",
          }),
        );
      }
    }
  }, []);

  useEffect(() => {
    const onSignInDialog = (event: Event) => {
      const detail = (event as CustomEvent<WalletSignInDialogDetail>).detail;
      setSignInDialogOpen(Boolean(detail?.open));
    };
    window.addEventListener(WALLET_SIGN_IN_DIALOG_EVENT, onSignInDialog);
    return () => window.removeEventListener(WALLET_SIGN_IN_DIALOG_EVENT, onSignInDialog);
  }, []);

  useEffect(() => {
    if (phase !== "loading" && !serverSessionAuthenticated && walletAdapterConnected && publicKey) {
      setPhase((current) =>
        current === "signed_out" || current === "awaiting_sign_in" ? "awaiting_sign_in" : current,
      );
    }
  }, [phase, publicKey, serverSessionAuthenticated, walletAdapterConnected]);

  useEffect(() => {
    void hydrate();
    void fetch("/api/auth/wallet/sandbox/policies", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((json: { policies?: Policy[]; availability?: SandboxPolicyAvailability[] }) => {
        const list = json.policies ?? [];
        const availability = json.availability ?? [];
        setPolicies(list);
        setPolicyAvailability(availability);
        const defaultPolicy = firstSandboxPolicyIdWithVerification(list, availability) ?? "";
        if (defaultPolicy) setSelectedPolicy(defaultPolicy);
      })
      .catch(() => setPolicies([]));
  }, [hydrate]);

  useEffect(() => {
    const onSession = () => void hydrate({ silent: true });
    window.addEventListener(EPHEMERAL_WALLET_SESSION_EVENT, onSession);
    return () => window.removeEventListener(EPHEMERAL_WALLET_SESSION_EVENT, onSession);
  }, [hydrate]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && phase === "signing") {
        setWalletFocusHint(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase]);

  useEffect(() => {
    if (phase !== "signing" || !walletAddress || !publicKey) return;
    if (publicKey.toBase58() !== walletAddress) {
      bumpRequestGeneration();
      setPendingChallenge(null);
      setPhase("workspace");
      setUserError({
        title: "Wallet changed",
        message: "Connect the same wallet as your signed in session and try again.",
      });
    }
  }, [phase, publicKey, walletAddress, bumpRequestGeneration]);

  const enterWorkspace = useCallback(async () => {
    setBusy(true);
    setUserError(null);
    setCorrelationId(null);
    setPhase("entering");
    try {
      const sessionProbe = await fetchEphemeralWalletClientSession();
      setServerSessionAuthenticated(sessionProbe.authenticated);
      if (!sessionProbe.authenticated || !sessionProbe.sessionId) {
        const walletConnected = walletConnectedRef.current;
        setPhase(walletConnected ? "awaiting_sign_in" : "signed_out");
        setUserError(mapWorkspaceUserFacingError({ code: "wallet_sign_in_required" }));
        notifyEphemeralWalletSessionChanged();
        return;
      }
      setSessionId(sessionProbe.sessionId);
      setWalletAddress(sessionProbe.walletAddress);
      setSessionExpiresAt(sessionProbe.expiresAt);
      logSandboxStage({ stage: "enter_request", session_id_prefix: sessionProbe.sessionId.slice(0, 8) });
      const res = await fetch("/api/auth/wallet/sandbox/enter", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        workspace?: Workspace;
        code?: string;
        correlation_id?: string;
        stage?: string;
      };
      if (json.correlation_id) setCorrelationId(json.correlation_id);
      logSandboxStage({
        stage: json.stage ?? "enter_response",
        http_status: res.status,
        code: json.code ?? null,
        correlation_id: json.correlation_id ?? null,
      });
      if (!res.ok || !json.workspace) {
        if (json.code === "wallet_sign_in_required" || res.status === 401) {
          const recheck = await fetchEphemeralWalletClientSession();
          setServerSessionAuthenticated(recheck.authenticated);
          if (!recheck.authenticated) {
            setPhase(walletConnectedRef.current ? "awaiting_sign_in" : "signed_out");
            notifyEphemeralWalletSessionChanged();
          } else {
            setPhase("ready");
            setNeedsManualSandboxEnter(true);
          }
        } else {
          setPhase("failure");
        }
        setUserError(
          mapWorkspaceUserFacingError({ code: json.code, correlationId: json.correlation_id ?? null }),
        );
        if (json.correlation_id) setCorrelationId(json.correlation_id);
        return;
      }
      setWorkspace(json.workspace);
      setPhase("workspace");
      setNeedsManualSandboxEnter(false);
      setUserError(null);
    } catch {
      setPhase("failure");
      setUserError(mapWorkspaceUserFacingError({ code: "network_error" }));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (
      phase === "ready"
      && serverSessionAuthenticated
      && !workspace
      && !busy
      && !autoEnterAttemptedRef.current
    ) {
      autoEnterAttemptedRef.current = true;
      void enterWorkspace();
    }
  }, [phase, serverSessionAuthenticated, workspace, busy, enterWorkspace]);

  const cancelVerificationRequest = useCallback(() => {
    const signing = phaseRef.current === "signing";
    const challenge = pendingChallenge;
    bumpRequestGeneration();
    setWalletFocusHint(false);
    setUserError(null);
    setBusy(false);
    if (
      signing
      && challenge
      && new Date(challenge.expires_at) > new Date()
    ) {
      setPhase("review");
      return;
    }
    setPendingChallenge(null);
    setPhase("workspace");
  }, [bumpRequestGeneration, pendingChallenge]);

  const loadVerificationChallenge = useCallback(async (): Promise<boolean> => {
    if (!selectedPolicy || !workspace) return false;
    const generation = requestGenerationRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const resource = `abraxas:sandbox:${workspace.workspace_id}:policy:${selectedPolicy}`;
    const challengeResult = await fetchWalletActionChallenge({
      operation: "sandbox:verification:test",
      resource,
      policyId: selectedPolicy,
      signal: controller.signal,
    });
    if (generation !== requestGenerationRef.current) return false;
    if (!challengeResult.ok) {
      setUserError(mapWorkspaceUserFacingError({ code: challengeResult.code }));
      setPhase("workspace");
      return false;
    }
    setPendingChallenge(challengeResult.challenge);
    setUserError(null);
    setWalletFocusHint(false);
    setPhase("review");
    return true;
  }, [selectedPolicy, workspace]);

  const prepareAgePresentation = useCallback(async () => {
    if (!selectedPolicy || !workspace) return;
    setBusy(true);
    setUserError(null);
    try {
      const possessionKeys = generateSandboxSessionPossessionKeyPair();
      sandboxPossessionSecretKeyRef.current = possessionKeys.secretKey;
      const res = await fetch("/api/auth/wallet/sandbox/presentation/prepare", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          policy_id: selectedPolicy,
          presentation_method_id: "authorized_test_issuer_credential",
          holder_possession_public_key: possessionKeys.publicKeyB64Url,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        code?: string;
        disclosure?: PresentationDisclosure;
        evidence?: PreparedEvidence;
        presentation_commit_id?: string;
        possession_challenge?: PassportPossessionChallengePayload;
      };
      if (!res.ok || !json.evidence || !json.disclosure || !json.presentation_commit_id || !json.possession_challenge) {
        setUserError(mapWorkspaceUserFacingError({ code: json.code ?? "unsupported_evidence" }));
        return;
      }
      setPreparedEvidence(json.evidence);
      setPresentationCommitId(json.presentation_commit_id);
      setPresentationDisclosure(json.disclosure);
      setPossessionChallenge(json.possession_challenge);
      setPresentationAuthorized(false);
      setPhase("disclosure");
    } catch {
      setUserError(mapWorkspaceUserFacingError({ code: "network_error" }));
    } finally {
      setBusy(false);
    }
  }, [selectedPolicy, workspace]);

  const authorizeCredentialPresentation = useCallback(async () => {
    if (!selectedPolicy || !workspace || !preparedEvidence || !presentationCommitId || !possessionChallenge) {
      return;
    }
    if (!walletAddress) {
      setUserError({
        title: "Wallet session required",
        message: "Connect your wallet before authorizing credential presentation.",
      });
      return;
    }
    setBusy(true);
    setUserError(null);
    setPhase("authorizing");
    try {
      const secretKey = sandboxPossessionSecretKeyRef.current;
      if (!secretKey) {
        setPhase("disclosure");
        setUserError({
          title: "Presentation session expired",
          message: "Prepare the presentation again before authorizing.",
          recovery: "Return to the policy screen and choose Prepare presentation.",
        });
        return;
      }
      const holder_possession_proof = {
        challenge_id: possessionChallenge.challenge_id,
        signature: signPassportPossessionChallenge(possessionChallenge, secretKey),
      };
      const res = await fetch("/api/auth/wallet/sandbox/presentation/authorize", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          policy_id: selectedPolicy,
          presentation_commit_id: presentationCommitId,
          challenge: possessionChallenge,
          holder_possession_proof,
          evidence: preparedEvidence,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; code?: string };
      if (!res.ok || !json.ok) {
        setPhase("disclosure");
        setUserError(mapWorkspaceUserFacingError({ code: json.code ?? "presentation_authorization_failed" }));
        return;
      }
      setPresentationAuthorized(true);
      setPhase("disclosure");
    } catch {
      setPhase("disclosure");
      setUserError(mapWorkspaceUserFacingError({ code: "network_error" }));
    } finally {
      setBusy(false);
    }
  }, [
    selectedPolicy,
    workspace,
    preparedEvidence,
    presentationCommitId,
    possessionChallenge,
    walletAddress,
  ]);

  const beginVerificationReview = useCallback(async () => {
    const availability = pickSandboxPolicyAvailability(policyAvailability, selectedPolicy);
    if (selectedPolicy === "age_21_retail" && !preparedEvidence) {
      setUserError({
        title: "Evidence required",
        message: "Prepare an issuer credential presentation before authorizing this age policy test.",
        recovery: "Use Prepare presentation on the policy card.",
      });
      return;
    }
    if (selectedPolicy === "age_21_retail" && !presentationAuthorized) {
      setUserError({
        title: "Presentation not authorized",
        message: "Authorize holder possession of the selected credential before requesting verification.",
        recovery: "Use Authorize presentation on the disclosure screen.",
      });
      return;
    }
    if (!availability?.can_request_verification) {
      setUserError({
        title: "Action unavailable",
        message:
          availability?.availability_detail
          ?? "This policy cannot be verified in the developer sandbox yet.",
        recovery: "Choose Wallet Control to run a supported test verification.",
      });
      return;
    }
    if (!signMessage) {
      setUserError({
        title: "Wallet disconnected",
        message: "Connect your wallet in the browser to authorize test verification.",
      });
      return;
    }
    setBusy(true);
    setResult(null);
    setReceiptValidation({ status: "idle" });
    setDecision(null);
    try {
      await loadVerificationChallenge();
    } finally {
      setBusy(false);
    }
  }, [
    loadVerificationChallenge,
    signMessage,
    selectedPolicy,
    policyAvailability,
    preparedEvidence,
    presentationAuthorized,
  ]);

  const submitSignedVerification = useCallback(
    async (input: { action_challenge_id: string; signature: string; generation: number }) => {
      if (input.generation !== requestGenerationRef.current) return;
      setPhase("submitting");
      try {
        const res = await fetch("/api/auth/wallet/sandbox/test-verify", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            policy_id: selectedPolicy,
            action_challenge_id: input.action_challenge_id,
            signature: input.signature,
            evidence: preparedEvidence ? [preparedEvidence] : undefined,
            presentation_commit_id: presentationCommitId ?? undefined,
            presentation_method_id: preparedEvidence ? "authorized_test_issuer_credential" : undefined,
          }),
        });
        if (input.generation !== requestGenerationRef.current) return;
        const json = (await res.json()) as {
          ok?: boolean;
          result?: TestResult;
          code?: string;
          decision?: string;
          unsupported?: boolean;
        };
        if (!res.ok || !json.result) {
          setPhase("workspace");
          setPendingChallenge(null);
          setUserError(
            mapWorkspaceUserFacingError({
              code: json.unsupported ? "unsupported_evidence" : json.code,
            }),
          );
          return;
        }
        setResult(json.result);
        setDecision(json.decision ?? null);
        setReceiptValidation({ status: "idle" });
        setPendingChallenge(null);
        setPhase("result");
      } catch {
        if (input.generation === requestGenerationRef.current) {
          setPhase("workspace");
          setUserError(mapWorkspaceUserFacingError({ code: "network_error" }));
        }
      }
    },
    [selectedPolicy, preparedEvidence, presentationCommitId],
  );

  const validateReceiptIndependent = useCallback(async () => {
    if (!result?.receipt_id || receiptValidation.status === "checking") return;
    setReceiptValidation({ status: "checking" });
    try {
      const res = await fetch("/api/auth/wallet/sandbox/validate", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receipt: result }),
      });
      const json = (await res.json()) as Parameters<typeof mapReceiptValidationApiResponse>[0];
      if (!res.ok && !json.code) {
        setReceiptValidation({
          status: "failed",
          title: "Validation unavailable",
          message: "Could not reach the receipt validator. Try again in a moment.",
          recovery: "Retry validation.",
          technicalCode: "network_error",
        });
        return;
      }
      const mapped = mapReceiptValidationApiResponse(json);
      setReceiptValidation(mapped);
      if (mapped.status === "validated" && result?.receipt_id) {
        void fetch("/api/auth/wallet/sandbox/guided-progress", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            receipt_id: result.receipt_id,
            validation: {
              status: "validated",
              checked_at: mapped.checkedAt,
              signature_authentic: mapped.signatureAuthentic,
              currently_acceptable: mapped.currentlyAcceptable,
              invalidation_reasons: mapped.invalidationReasons,
              standalone_cryptographic_verification: mapped.standaloneCryptographicVerification,
              verification_summary: mapped.verificationSummary ?? null,
            },
          }),
        });
      }
    } catch {
      setReceiptValidation({
        status: "failed",
        title: "Validation unavailable",
        message: "Could not reach the receipt validator. Try again in a moment.",
        recovery: "Retry validation.",
        technicalCode: "network_error",
      });
    }
  }, [result, receiptValidation.status]);

  const openPhantomForReview = useCallback(async () => {
    if (!pendingChallenge || !signMessage) return;
    if (signingAbortRef.current) return;
    abortPendingWalletSign();
    const controller = new AbortController();
    signingAbortRef.current = controller;
    const generation = requestGenerationRef.current;
    setBusy(true);
    setUserError(null);
    setWalletFocusHint(false);
    setPhase("signing");
    try {
      const signed = await signWalletActionChallenge({
        challenge: pendingChallenge,
        signMessage: (msg) => signMessage(msg),
        signal: controller.signal,
        isStale: () => generation !== requestGenerationRef.current,
      });
      if (generation !== requestGenerationRef.current) return;
      if (!signed.ok) {
        if (signed.code === "aborted" || signed.code === "stale") {
          return;
        }
        setPhase(
          signed.code === "expired" || !pendingChallenge ? "workspace" : "review",
        );
        setUserError(mapSignFailure(signed.code));
        if (signed.code === "expired") {
          setPendingChallenge(null);
          setPhase("workspace");
        }
        return;
      }
      await submitSignedVerification({
        action_challenge_id: signed.action_challenge_id,
        signature: signed.signature,
        generation,
      });
    } finally {
      if (signingAbortRef.current === controller) {
        signingAbortRef.current = null;
      }
      setBusy(false);
    }
  }, [pendingChallenge, signMessage, submitSignedVerification, abortPendingWalletSign]);

  const retryVerificationRequest = useCallback(async () => {
    bumpRequestGeneration();
    setPendingChallenge(null);
    setWalletFocusHint(false);
    setUserError(null);
    setBusy(false);
    setBusy(true);
    try {
      await loadVerificationChallenge();
    } finally {
      setBusy(false);
    }
  }, [bumpRequestGeneration, loadVerificationChallenge]);

  const signOut = useCallback(async () => {
    bumpRequestGeneration();
    await fetch("/api/auth/wallet/session", { method: "DELETE", credentials: "same-origin" });
    notifyEphemeralWalletSessionChanged();
    setWorkspace(null);
    setResult(null);
    setPendingChallenge(null);
    void hydrate();
  }, [hydrate, bumpRequestGeneration]);

  const openWalletSignIn = useCallback(() => {
    if (typeof window !== "undefined") {
      capturePostAuthResumePath(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
    }
    window.dispatchEvent(new Event("abraxas:open-wallet-sign-in"));
  }, []);

  const selectedPolicyMeta = policies.find((p) => p.policy_id === selectedPolicy);
  const reviewTitle = verificationReviewTitle(selectedPolicy, selectedPolicyMeta?.label);
  const scopeNote = verificationReviewScopeNote(selectedPolicy);
  const display = pendingChallenge?.display;

  const stepIndex =
    phase === "ready" || phase === "entering" || phase === "failure"
      ? 0
      : phase === "workspace" || phase === "review" || phase === "signing" || phase === "submitting"
        ? 1
        : phase === "result"
          ? 3
          : 0;

  const steps = ["Application", "Policy", "Verification", "Receipt"];

  const sessionRailState = ((): import("./EphemeralWorkspaceSessionRail").WorkspaceSessionRailState => {
    if (phase === "loading") return "loading";
    if (walletAuthOperational === false) return "sandbox_unavailable";
    if (!serverSessionAuthenticated) {
      if (walletAdapterConnected && publicKey) return "sign_in_required";
      return "session_expired";
    }
    if (userError?.technicalCode === "wallet_sign_in_required") {
      return walletAdapterConnected && publicKey ? "sign_in_required" : "session_expired";
    }
    if (phase === "review" || phase === "signing") return "authorization_required";
    if (workspace) return "workspace_ready";
    if (phase === "ready" || phase === "entering") return "authenticated";
    if (phase === "failure") return "authenticated";
    return walletAdapterConnected && publicKey ? "authenticated" : "disconnected";
  })();

  const selectedAvailability = pickSandboxPolicyAvailability(policyAvailability, selectedPolicy);

  const evidenceRequired = selectedPolicy === "age_21_retail";
  const receiptValidationTraceStatus =
    receiptValidation.status === "idle"
      ? "idle"
      : receiptValidation.status === "checking"
        ? "checking"
        : receiptValidation.status === "validated"
          ? "validated"
          : receiptValidation.status === "failed"
            ? "failed"
            : "not_applicable";

  const trustStages = deriveTrustExecutionStages({
    phase,
    policySelected: Boolean(selectedPolicy && workspace),
    presentationPrepared: Boolean(preparedEvidence),
    presentationAuthorized,
    evidenceRequired,
    decision,
    receiptValidationStatus: phase === "result" ? receiptValidationTraceStatus : "not_applicable",
    errorActive: Boolean(userError),
  });

  const sandboxCompletionView = result
    ? buildEphemeralSandboxCompletionView({
        policyId: selectedPolicy,
        policyLabel: selectedPolicyMeta?.label ?? selectedPolicy,
        decision,
        receiptValidation,
      })
    : null;

  const walletProofReadyForStudio =
    phase === "result"
    && sandboxIntegrationStudioEligible({ decision, receiptValidation });

  useEffect(() => {
    if (isHomepageEmbed) return;
    if (!walletProofReadyForStudio || !selectedPolicy) return;
    if (integrationContinuityActive && searchParams.get("pack")) return;
    if (integrationUrlSyncedRef.current) return;
    integrationUrlSyncedRef.current = true;
    router.replace(
      buildUnifiedWorkspaceIntegrationUrl({
        policyId: selectedPolicy,
        focusCreateSandbox: true,
      }),
    );
  }, [
    integrationContinuityActive,
    isHomepageEmbed,
    router,
    searchParams,
    selectedPolicy,
    walletProofReadyForStudio,
  ]);

  if (phase === "loading") {
    if (isHomepageEmbed) {
      return (
        <HomeInlineWorkspaceProcessing
          label="Restoring your workspace"
          detail="Confirming authorized session with Abraxas servers."
        />
      );
    }
    return (
      <div className={styles.shell}>
        <div className={styles.statusRow} role="status">
          <span className={styles.spinner} aria-hidden />
          Loading workspace…
        </div>
      </div>
    );
  }

  if (phase === "failure" && walletAuthOperational === false && userError) {
    return (
      <div className={styles.shell}>
        <EphemeralWorkspaceSessionRail
          state="sandbox_unavailable"
          walletAddress={null}
          sessionExpiresAt={null}
          workspaceExpiresAt={null}
        />
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>{userError.title}</h2>
          <p className={styles.muted}>{userError.message}</p>
          {userError.recovery ? <p className={styles.note}>{userError.recovery}</p> : null}
          {userError.technicalCode ? (
            <p className={styles.technicalDetails}>Code: {userError.technicalCode}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const unifiedIntegrationExperienceActive =
    integrationHandoffLanding
    || (integrationContinuityActive && Boolean(result && sandboxCompletionView))
    || walletProofReadyForStudio
    || (isHomepageEmbed && Boolean(result && sandboxCompletionView));

  if (unifiedIntegrationExperienceActive) {
    const journeyStepId: GuidedIntegrationJourneyStepId =
      result && sandboxCompletionView
        ? "create_test_app"
        : integrationHandoffLanding
          ? "create_test_app"
          : "prove_wallet_control";
    return (
      <div className={`${styles.shell} ${isHomepageEmbed ? styles.shellHomepageEmbed : ""}`.trim()}>
        {!isHomepageEmbed ? (
          <EphemeralWorkspaceSessionRail
            state={sessionRailState}
            walletAddress={walletAddress}
            sessionExpiresAt={sessionExpiresAt}
            workspaceExpiresAt={workspace?.expires_at ?? null}
          />
        ) : null}
        {!isHomepageEmbed ? <UnifiedWorkspaceJourneyBar currentStepId={journeyStepId} /> : null}
        {result && sandboxCompletionView ? (
          <div className={styles.panel}>
            <EphemeralSandboxVerificationCompletion
              view={sandboxCompletionView}
              receiptValidation={receiptValidation}
              onCheckProof={() => void validateReceiptIndependent()}
              checkProofBusy={busy}
              receiptId={result.receipt_id ? String(result.receipt_id) : null}
              payloadHash={result.payload_hash ?? null}
              onRunAnotherTest={() => {
                setResult(null);
                setReceiptValidation({ status: "idle" });
                setDecision(null);
                setPreparedEvidence(null);
                setPresentationCommitId(null);
                setPresentationDisclosure(null);
                setUserError(null);
                setPhase("workspace");
              }}
            />
          </div>
        ) : (
          <div className={styles.panel}>
            <p className={styles.note} role="status">
              Illustrative workflow. Actual completion must come from authorized server state.
            </p>
          </div>
        )}
        <EmbeddedIntegrationStudioPanel
          authoritativePolicyId={serverPolicyLocked ? serverAuthoritativeStudioPack : selectedPolicy || null}
          walletProofRecorded={walletProofReadyForStudio}
          serverPolicyLocked={serverPolicyLocked}
        />
      </div>
    );
  }

  if (phase === "signed_out" || phase === "awaiting_sign_in") {
    const awaitingSignIn = phase === "awaiting_sign_in";
    return (
      <div className={`${styles.shell} ${signInDialogOpen ? styles.workspaceSignInActive : ""}`}>
        <EphemeralWorkspaceSessionRail
          state={awaitingSignIn ? "sign_in_required" : "session_expired"}
          walletAddress={walletAddress}
          sessionExpiresAt={null}
          workspaceExpiresAt={null}
        />
        <div className={styles.panel} aria-hidden={signInDialogOpen ? true : undefined}>
          <h2 className={styles.sectionTitle}>
            {awaitingSignIn ? "Sign in to continue" : "Session expired"}
          </h2>
          <p className={styles.muted}>
            {awaitingSignIn
              ? "Your wallet is connected. Abraxas still needs a message signature before this workspace opens."
              : "Connect your wallet to continue in the Developer Workspace."}
          </p>
          {signInDialogOpen ? (
            <p className={styles.note} role="status">
              Complete sign-in in the dialog above. Cancel or try again there if Phantom was dismissed.
            </p>
          ) : null}
          <div className={styles.actions}>
            <button type="button" className={styles.walletBtn} onClick={openWalletSignIn}>
              {awaitingSignIn ? "Sign in" : "Connect wallet"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.shell} ${isHomepageEmbed ? styles.shellHomepageEmbed : ""}`.trim()}>
      {!isHomepageEmbed ? (
        <EphemeralWorkspaceSessionRail
          state={sessionRailState}
          walletAddress={walletAddress}
          sessionExpiresAt={sessionExpiresAt}
          workspaceExpiresAt={workspace?.expires_at ?? null}
        />
      ) : null}
      {!isHomepageEmbed ? (
        <div className={styles.workspaceHeader}>
          <span className={styles.sandboxBadge}>{EPHEMERAL_WORKSPACE_SANDBOX_BADGE}</span>
          <p className={styles.muted}>{EPHEMERAL_WORKSPACE_SANDBOX_EXPIRY_NOTE}</p>
          {policyAvailability.some((row) => row.age_experience === "age_21_test") ? (
            <p className={styles.integrityNote} role="note">
              Issuer backed verification demonstration. Sandbox fixtures do not establish real world age eligibility.
            </p>
          ) : null}
        </div>
      ) : workspace ? (
        <p className={styles.note} role="status">
          {EPHEMERAL_WORKSPACE_SANDBOX_BADGE} · active until{" "}
          {new Date(workspace.expires_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      ) : null}

      {!isHomepageEmbed && workspace && phase !== "result" ? (
        <TrustExecutionTrace stages={trustStages} />
      ) : null}

      <div className={styles.panel}>
        {serverSessionAuthenticated && (phase === "ready" || phase === "entering") && !workspace ? (
          needsManualSandboxEnter && phase === "ready" ? (
            <div className={styles.actions}>
              <p className={styles.muted}>We could not open your sandbox automatically. Try again when you are ready.</p>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => {
                  autoEnterAttemptedRef.current = false;
                  setNeedsManualSandboxEnter(false);
                  void enterWorkspace();
                }}
              >
                Open sandbox workspace
              </button>
            </div>
          ) : isHomepageEmbed ? (
            <HomeInlineWorkspaceProcessing
              label={phase === "entering" ? "Opening your sandbox workspace" : "Continuing your workspace"}
              detail="Using your authorized wallet session."
            />
          ) : (
            <div className={styles.statusRow} role="status">
              <span className={styles.spinner} aria-hidden />
              {phase === "entering" ? "Opening your sandbox workspace…" : "Continuing into your sandbox…"}
            </div>
          )
        ) : null}

        {workspace
        && phase !== "result"
        && phase !== "review"
        && phase !== "signing"
        && phase !== "submitting"
        && phase !== "disclosure" ? (
          <>
            <h2 className={styles.sectionTitle}>Choose a policy</h2>
            <p className={`${styles.meta} ${styles.muted}`}>
              Workspace {workspace.workspace_id.slice(0, 18)}… · expires{" "}
              {new Date(workspace.expires_at).toLocaleString()}
            </p>
            {publicKey ? null : (
              <p className={styles.note}>Connect your wallet to authorize test verification when you are ready.</p>
            )}
            <div className={styles.policyGrid} role="radiogroup" aria-label="Choose a policy">
              {policies.map((p) => {
                const selected = p.policy_id === selectedPolicy;
                const availability = pickSandboxPolicyAvailability(policyAvailability, p.policy_id);
                const ready = availability?.can_request_verification ?? false;
                return (
                  <button
                    key={p.policy_id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={busy}
                    className={selected ? styles.policyCardActive : styles.policyCard}
                    onClick={() => {
                      setSelectedPolicy(p.policy_id);
                      setPreparedEvidence(null);
                      setPresentationCommitId(null);
                      setPresentationDisclosure(null);
                      setPossessionChallenge(null);
                      setPresentationAuthorized(false);
                      sandboxPossessionSecretKeyRef.current = null;
                      setUserError(null);
                      setShowTechnicalDetails(false);
                    }}
                  >
                    <span className={styles.policyCardTitle}>{p.label}</span>
                    <span className={ready ? styles.policyBadgeReady : styles.policyBadgeUnavailable}>
                      {availability?.availability_label ?? "Unavailable"}
                    </span>
                    <span className={styles.policyCardDesc}>{p.description}</span>
                  </button>
                );
              })}
            </div>
            {selectedPolicy && policyExperienceBanner(selectedPolicy, selectedAvailability?.age_experience) ? (
              <p className={styles.note}>
                {policyExperienceBanner(selectedPolicy, selectedAvailability?.age_experience)}
              </p>
            ) : null}
            {selectedAvailability && !selectedAvailability.can_request_verification ? (
              <p className={styles.availabilityNote}>{selectedAvailability.availability_detail}</p>
            ) : null}
            <div className={styles.actions}>
              {selectedPolicy === "age_21_retail" && selectedAvailability?.can_request_verification ? (
                <button
                  type="button"
                  className={styles.verifyBtn}
                  disabled={busy || !selectedPolicy}
                  onClick={() => void prepareAgePresentation()}
                >
                  Prepare presentation
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.verifyBtn}
                  disabled={
                    busy || !selectedPolicy || !signMessage || !selectedAvailability?.can_request_verification
                  }
                  onClick={() => void beginVerificationReview()}
                >
                  Review request
                </button>
              )}
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </>
        ) : null}

        {(phase === "disclosure" || phase === "authorizing") && presentationDisclosure ? (
          <div className={styles.disclosureCard}>
            <h2 className={styles.sectionTitle}>
              {presentationDisclosure.headline ?? "Review disclosure"}
            </h2>
            <p className={styles.muted}>{presentationDisclosure.sandbox_notice}</p>
            <p className={styles.note}>
              <strong>{presentationDisclosure.requested_attribute}</strong>
            </p>
            <ul className={styles.disclosureList}>
              {presentationDisclosure.disclosed_to_partner.map((line) => (
                <li key={line}>Discloses: {line}</li>
              ))}
              {presentationDisclosure.withheld.map((line) => (
                <li key={line}>Withheld: {line}</li>
              ))}
            </ul>
            <div className={styles.actions}>
              {!presentationAuthorized ? (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={busy}
                  onClick={() => void authorizeCredentialPresentation()}
                >
                  Authorize presentation
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={busy || !signMessage}
                  onClick={() => void beginVerificationReview()}
                >
                  Continue to verification
                </button>
              )}
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy}
                onClick={() => {
                  setPhase("workspace");
                  setPreparedEvidence(null);
                  setPresentationCommitId(null);
                  setPresentationDisclosure(null);
                  setPossessionChallenge(null);
                  setPresentationAuthorized(false);
                  sandboxPossessionSecretKeyRef.current = null;
                }}
              >
                Back
              </button>
            </div>
            {busy && !presentationAuthorized ? (
              <div className={styles.statusRow} role="status">
                <span className={styles.spinner} aria-hidden />
                Confirming holder possession…
              </div>
            ) : presentationAuthorized ? (
              <p className={styles.note}>
                Demonstration credential presentation recorded. Continue when you are ready to sign the test verification request in Phantom.
              </p>
            ) : (
              <p className={styles.note}>
                Authorize presentation of this sandbox test credential using the session possession key generated on this device.
                This simulates the Passport presentation step. It is not wallet control proof and does not apply to independent issuer credentials.
                Phantom is required later for the scoped test verification signature.
              </p>
            )}
          </div>
        ) : null}

        {phase === "review" && pendingChallenge && display ? (
          <div className={styles.reviewCard}>
            <h2 className={styles.sectionTitle}>{reviewTitle}</h2>
            <WalletScopedAuthorizationReviewCard display={display} />
            {scopeNote ? <p className={styles.note}>{scopeNote}</p> : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => void openPhantomForReview()}
              >
                Verify with Phantom
              </button>
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={cancelVerificationRequest}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {phase === "signing" ? (
          <div className={styles.reviewCard}>
            <h2 className={styles.sectionTitle}>Confirm in your wallet</h2>
            <div className={styles.statusRow} role="status">
              <span className={styles.spinner} aria-hidden />
              Abraxas is waiting for your signature.
            </div>
            <p className={styles.note}>
              If you dismissed Phantom, finish or reject the request there, then use Try again here for a fresh prompt.
            </p>
            {walletFocusHint ? (
              <p className={styles.note}>Return to Phantom if a request is still pending there.</p>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={cancelVerificationRequest}>
                Cancel
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={() => void retryVerificationRequest()}>
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {phase === "submitting" ? (
          <div className={styles.statusRow} role="status">
            <span className={styles.spinner} aria-hidden />
            Evaluating evidence…
          </div>
        ) : null}

        {userError ? (
          <div className={styles.errorPanel} role="alert">
            <p className={styles.errorTitle}>{userError.title}</p>
            <p className={styles.errorMessage}>{userError.message}</p>
            {userError.recovery ? <p className={styles.errorRecovery}>{userError.recovery}</p> : null}
            {userError.title === "Sign-in required" || userError.technicalCode === "wallet_sign_in_required" ? (
              <div className={styles.actions}>
                <button type="button" className={styles.walletBtn} onClick={openWalletSignIn}>
                  {walletAdapterConnected && publicKey ? "Sign in" : "Connect wallet"}
                </button>
              </div>
            ) : null}
            {userError.technicalCode || userError.correlationId || correlationId ? (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => setShowTechnicalDetails((v) => !v)}
              >
                {showTechnicalDetails ? "Hide technical details" : "Technical details"}
              </button>
            ) : null}
            {showTechnicalDetails ? (
              <p className={styles.technicalDetails}>
                {userError.technicalCode ? `Code: ${userError.technicalCode}. ` : ""}
                {userError.correlationId ?? correlationId
                  ? `Reference: ${userError.correlationId ?? correlationId}.`
                  : ""}
              </p>
            ) : null}
            {userError.title === "Request expired" ? (
              <button type="button" className={styles.linkBtn} onClick={() => void retryVerificationRequest()}>
                Create a new request
              </button>
            ) : null}
            {userError.title === "Signature request cancelled"
            || userError.title === "Wallet did not respond"
            || userError.title === "Request superseded" ? (
              <button type="button" className={styles.linkBtn} onClick={() => void retryVerificationRequest()}>
                Try again
              </button>
            ) : null}
          </div>
        ) : null}

        {result ? (
          <div className={styles.resultBox}>
            {sandboxCompletionView ? (
              <EphemeralSandboxVerificationCompletion
                view={sandboxCompletionView}
                receiptValidation={receiptValidation}
                onCheckProof={() => void validateReceiptIndependent()}
                checkProofBusy={busy}
                receiptId={result.receipt_id ? String(result.receipt_id) : null}
                payloadHash={result.payload_hash ?? null}
                onRunAnotherTest={() => {
                  setResult(null);
                  setReceiptValidation({ status: "idle" });
                  setDecision(null);
                  setPreparedEvidence(null);
                  setPresentationCommitId(null);
                  setPresentationDisclosure(null);
                  setUserError(null);
                  setPhase("workspace");
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
