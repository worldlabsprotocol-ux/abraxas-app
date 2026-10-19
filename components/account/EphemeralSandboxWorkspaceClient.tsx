"use client";
// FILE: components/account/EphemeralSandboxWorkspaceClient.tsx

import { useCallback, useEffect, useRef, useState } from "react";
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
  mapWorkspaceUserFacingError,
  type WorkspaceUserFacingError,
} from "@/lib/developers/ephemeralWorkspaceUserErrors";
import type { SandboxPolicyAvailability } from "@/lib/auth/ephemeralWallet/sandboxPolicyAvailability";
import { resolveSandboxPolicyAvailability } from "@/lib/auth/ephemeralWallet/sandboxPolicyAvailability";
import {
  EPHEMERAL_WALLET_SESSION_EVENT,
  fetchEphemeralWalletClientSession,
  notifyEphemeralWalletSessionChanged,
} from "@/lib/auth/ephemeralWallet/clientSession";
import { EphemeralWorkspaceSessionRail } from "./EphemeralWorkspaceSessionRail";
import { TrustExecutionTrace, deriveTrustExecutionStages } from "./TrustExecutionTrace";
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
};

type WorkspacePhase =
  | "loading"
  | "signed_out"
  | "ready"
  | "entering"
  | "workspace"
  | "disclosure"
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
  if (code === "expired") {
    return {
      title: "Request expired",
      message: "For your security, this request is no longer valid.",
      recovery: "Create a new request.",
      technicalCode: code,
    };
  }
  return mapWorkspaceUserFacingError({ code });
}

export function EphemeralSandboxWorkspaceClient() {
  const { signMessage, publicKey } = useWallet();
  const [phase, setPhase] = useState<WorkspacePhase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyAvailability, setPolicyAvailability] = useState<SandboxPolicyAvailability[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [serverSessionAuthenticated, setServerSessionAuthenticated] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState<WalletActionChallengePayload | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [validation, setValidation] = useState<{
    ok?: boolean;
    signature_valid?: boolean;
    signature_authentic?: boolean;
    currently_valid?: boolean;
    currently_acceptable?: boolean;
  } | null>(null);
  const [preparedEvidence, setPreparedEvidence] = useState<PreparedEvidence | null>(null);
  const [presentationCommitId, setPresentationCommitId] = useState<string | null>(null);
  const [presentationDisclosure, setPresentationDisclosure] = useState<PresentationDisclosure | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userError, setUserError] = useState<WorkspaceUserFacingError | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [walletFocusHint, setWalletFocusHint] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);

  const requestGenerationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const phaseRef = useRef<WorkspacePhase>("loading");
  phaseRef.current = phase;

  const bumpRequestGeneration = useCallback(() => {
    requestGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const hydrate = useCallback(async (options?: { silent?: boolean }) => {
    const protectedPhases: WorkspacePhase[] = ["review", "signing", "submitting"];
    const silent = Boolean(options?.silent);
    if (!silent) {
      setPhase("loading");
      setUserError(null);
    }
    try {
      const session = await fetchEphemeralWalletClientSession();
      setServerSessionAuthenticated(session.authenticated);
      if (!session.authenticated) {
        setPhase("signed_out");
        setSessionId(null);
        setWalletAddress(null);
        setSessionExpiresAt(null);
        setWorkspace(null);
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
      const workspaceBody = (await workspaceRes.json()) as { workspace?: Workspace | null; code?: string };
      if (workspaceBody.workspace) {
        setWorkspace(workspaceBody.workspace);
        if (!protectedPhases.includes(phaseRef.current)) {
          setPhase("workspace");
        }
        return;
      }
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
    void hydrate();
    void fetch("/api/auth/wallet/sandbox/policies", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((json: { policies?: Policy[]; availability?: SandboxPolicyAvailability[] }) => {
        const list = json.policies ?? [];
        setPolicies(list);
        setPolicyAvailability(json.availability ?? []);
        const defaultPolicy =
          list.find((p) => resolveSandboxPolicyAvailability(p.policy_id)?.can_request_verification)?.policy_id
          ?? list[0]?.policy_id
          ?? "";
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
        setPhase("signed_out");
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
            setPhase("signed_out");
            notifyEphemeralWalletSessionChanged();
          } else {
            setPhase("ready");
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
      setUserError(null);
    } catch {
      setPhase("failure");
      setUserError(mapWorkspaceUserFacingError({ code: "network_error" }));
    } finally {
      setBusy(false);
    }
  }, []);

  const cancelVerificationRequest = useCallback(() => {
    bumpRequestGeneration();
    setPendingChallenge(null);
    setWalletFocusHint(false);
    setUserError(null);
    setPhase("workspace");
  }, [bumpRequestGeneration]);

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
      const res = await fetch("/api/auth/wallet/sandbox/presentation/prepare", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          policy_id: selectedPolicy,
          presentation_method_id: "authorized_test_issuer_credential",
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        code?: string;
        disclosure?: PresentationDisclosure;
        evidence?: PreparedEvidence;
        presentation_commit_id?: string;
      };
      if (!res.ok || !json.evidence || !json.disclosure || !json.presentation_commit_id) {
        setUserError(mapWorkspaceUserFacingError({ code: json.code ?? "unsupported_evidence" }));
        return;
      }
      setPreparedEvidence(json.evidence);
      setPresentationCommitId(json.presentation_commit_id);
      setPresentationDisclosure(json.disclosure);
      setPhase("disclosure");
    } catch {
      setUserError(mapWorkspaceUserFacingError({ code: "network_error" }));
    } finally {
      setBusy(false);
    }
  }, [selectedPolicy, workspace]);

  const beginVerificationReview = useCallback(async () => {
    const availability =
      policyAvailability.find((a) => a.policy_id === selectedPolicy)
      ?? resolveSandboxPolicyAvailability(selectedPolicy);
    if (selectedPolicy === "age_21_retail" && !preparedEvidence) {
      setUserError({
        title: "Evidence required",
        message: "Prepare an issuer credential presentation before authorizing this age policy test.",
        recovery: "Use Prepare presentation on the policy card.",
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
    setValidation(null);
    setDecision(null);
    try {
      await loadVerificationChallenge();
    } finally {
      setBusy(false);
    }
  }, [loadVerificationChallenge, signMessage, selectedPolicy, policyAvailability, preparedEvidence]);

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
        setPendingChallenge(null);
        setPhase("result");
        const validateRes = await fetch(
          `/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(json.result.receipt_id))}`,
          { credentials: "same-origin" },
        );
        const validateJson = (await validateRes.json()) as {
          ok?: boolean;
          signature_valid?: boolean;
          signature_authentic?: boolean;
          currently_valid?: boolean;
          currently_acceptable?: boolean;
        };
        if (input.generation === requestGenerationRef.current) {
          setValidation(validateJson);
        }
      } catch {
        if (input.generation === requestGenerationRef.current) {
          setPhase("workspace");
          setUserError(mapWorkspaceUserFacingError({ code: "network_error" }));
        }
      }
    },
    [selectedPolicy, preparedEvidence, presentationCommitId],
  );

  const openPhantomForReview = useCallback(async () => {
    if (!pendingChallenge || !signMessage) return;
    const generation = requestGenerationRef.current;
    setBusy(true);
    setUserError(null);
    setWalletFocusHint(false);
    setPhase("signing");
    try {
      const signed = await signWalletActionChallenge({
        challenge: pendingChallenge,
        signMessage: (msg) => signMessage(msg),
        isStale: () => generation !== requestGenerationRef.current,
      });
      if (generation !== requestGenerationRef.current) return;
      if (!signed.ok) {
        setPhase(pendingChallenge ? "review" : "workspace");
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
      if (generation === requestGenerationRef.current) {
        setBusy(false);
      }
    }
  }, [pendingChallenge, signMessage, submitSignedVerification]);

  const retryVerificationRequest = useCallback(async () => {
    bumpRequestGeneration();
    setPendingChallenge(null);
    setWalletFocusHint(false);
    setUserError(null);
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

  const sessionRailState =
    phase === "signed_out" || (!serverSessionAuthenticated && phase !== "loading")
      ? "session_expired"
      : phase === "review" || phase === "signing"
        ? "authorization_required"
        : workspace
          ? "workspace_ready"
          : phase === "ready" || phase === "entering"
            ? "authenticated"
            : phase === "loading"
              ? "loading"
              : publicKey
                ? "authenticated"
                : "disconnected";

  const selectedAvailability =
    policyAvailability.find((a) => a.policy_id === selectedPolicy)
    ?? resolveSandboxPolicyAvailability(selectedPolicy);

  const evidenceRequired = selectedPolicy === "age_21_retail";
  const trustStages = deriveTrustExecutionStages({
    phase,
    policySelected: Boolean(selectedPolicy && workspace),
    presentationPrepared: Boolean(preparedEvidence),
    evidenceRequired,
    decision,
    validation,
    errorActive: Boolean(userError),
  });

  if (phase === "loading") {
    return (
      <div className={styles.shell}>
        <div className={styles.statusRow} role="status">
          <span className={styles.spinner} aria-hidden />
          Loading workspace…
        </div>
      </div>
    );
  }

  if (phase === "signed_out") {
    return (
      <div className={styles.shell}>
        <EphemeralWorkspaceSessionRail
          state="session_expired"
          walletAddress={null}
          sessionExpiresAt={null}
          workspaceExpiresAt={null}
        />
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>Session expired</h2>
          <p className={styles.muted}>Connect your wallet to continue in the Developer Workspace.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.walletBtn} onClick={openWalletSignIn}>
              Connect wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <EphemeralWorkspaceSessionRail
        state={sessionRailState}
        walletAddress={walletAddress}
        sessionExpiresAt={sessionExpiresAt}
        workspaceExpiresAt={workspace?.expires_at ?? null}
      />
      <div className={styles.workspaceHeader}>
        <span className={styles.sandboxBadge}>{EPHEMERAL_WORKSPACE_SANDBOX_BADGE}</span>
        <p className={styles.muted}>{EPHEMERAL_WORKSPACE_SANDBOX_EXPIRY_NOTE}</p>
      </div>

      {workspace ? <TrustExecutionTrace stages={trustStages} /> : null}

      <div className={styles.panel}>
        {(phase === "ready" || phase === "entering" || phase === "failure") && !workspace ? (
          <>
            <h2 className={styles.sectionTitle}>Start building</h2>
            <p className={styles.muted}>
              Your wallet session is active
              {walletAddress ? ` (${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)})` : ""}. Open an
              isolated sandbox to configure policies and run test verification.
            </p>
            {phase === "entering" ? (
              <div className={styles.statusRow} role="status">
                <span className={styles.spinner} aria-hidden />
                Preparing workspace…
              </div>
            ) : (
              <div className={styles.actions}>
                <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void enterWorkspace()}>
                  Start building
                </button>
              </div>
            )}
          </>
        ) : null}

        {workspace
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
                const availability =
                  policyAvailability.find((a) => a.policy_id === p.policy_id)
                  ?? resolveSandboxPolicyAvailability(p.policy_id);
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

        {phase === "disclosure" && presentationDisclosure ? (
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
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy || !signMessage}
                onClick={() => void beginVerificationReview()}
              >
                Approve and authorize
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy}
                onClick={() => {
                  setPhase("workspace");
                  setPreparedEvidence(null);
                  setPresentationCommitId(null);
                  setPresentationDisclosure(null);
                }}
              >
                Back
              </button>
            </div>
          </div>
        ) : null}

        {phase === "review" && pendingChallenge ? (
          <div className={styles.reviewCard}>
            <h2 className={styles.sectionTitle}>{reviewTitle}</h2>
            <dl className={styles.reviewList}>
              <div>
                <dt>Policy</dt>
                <dd>{display?.policy_label ?? selectedPolicyMeta?.label ?? selectedPolicy}</dd>
              </div>
              <div>
                <dt>Environment</dt>
                <dd>{display?.environment ?? "Sandbox"}</dd>
              </div>
              <div>
                <dt>Requested by</dt>
                <dd>{display?.requested_by ?? "Abraxas Developer Workspace"}</dd>
              </div>
              {display?.wallet_address ? (
                <div>
                  <dt>Wallet</dt>
                  <dd className={styles.mono}>{display.wallet_address}</dd>
                </div>
              ) : null}
            </dl>
            <p className={styles.reviewLead}>You will sign a message confirming this test request.</p>
            <p className={styles.securityNote}>
              <strong>No funds move.</strong> No spending access is granted.
            </p>
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
            <h2 className={styles.sectionTitle}>Waiting for Phantom</h2>
            <div className={styles.statusRow} role="status">
              <span className={styles.spinner} aria-hidden />
              Review the request in Phantom.
            </div>
            {walletFocusHint ? (
              <p className={styles.note}>
                If the Phantom window closed, use Try again to create a fresh request. Abraxas cannot reopen your
                wallet popup.
              </p>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={cancelVerificationRequest}>
                Cancel request
              </button>
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={() => void retryVerificationRequest()}>
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
            {userError.title === "Session expired" ? (
              <div className={styles.actions}>
                <button type="button" className={styles.walletBtn} onClick={openWalletSignIn}>
                  Connect wallet
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
          </div>
        ) : null}

        {result ? (
          <div className={styles.resultBox}>
            <h3 className={styles.resultTitle}>
              {selectedPolicy === "age_21_retail" ? "Age 21 test complete" : "Verification complete"}
            </h3>
            {selectedPolicy === "age_21_retail" ? (
              <p className={styles.note}>
                Sandbox test result only. This does not prove real world age eligibility.
              </p>
            ) : null}
            <p className={styles.resultLine}>
              <strong>Policy:</strong> {selectedPolicyMeta?.label ?? selectedPolicy}
            </p>
            <p className={styles.resultLine}>
              <strong>Decision:</strong> {decision ?? "unknown"} (Sandbox test only)
            </p>
            <p className={styles.resultLine}>
              <strong>Signature authentic:</strong>{" "}
              {validation?.signature_authentic ?? validation?.signature_valid ? "Yes" : validation ? "No" : "Pending"}
            </p>
            <p className={styles.resultLine}>
              <strong>Currently acceptable:</strong>{" "}
              {validation?.currently_acceptable ?? validation?.currently_valid ? "Yes" : validation ? "No" : "Pending"}
            </p>
            <details className={styles.receiptDetails}>
              <summary>Receipt details</summary>
              <p className={styles.mono}>
                {String(result.receipt_id)}
                <br />
                {result.payload_hash}
              </p>
            </details>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy || !result.receipt_id}
                onClick={() => {
                  void fetch(
                    `/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(result.receipt_id))}`,
                    { credentials: "same-origin", cache: "no-store" },
                  )
                    .then((r) => r.json())
                    .then((json: { signature_valid?: boolean }) => setValidation(json));
                }}
              >
                Validate receipt
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy}
                onClick={() => {
                  setResult(null);
                  setValidation(null);
                  setDecision(null);
                  setPreparedEvidence(null);
                  setPresentationCommitId(null);
                  setPresentationDisclosure(null);
                  setUserError(null);
                  setPhase("workspace");
                }}
              >
                Run another test
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
