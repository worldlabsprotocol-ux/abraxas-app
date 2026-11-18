"use client";

import { useEffect, useRef, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  LAUNCHPAD_TEST_SCENARIOS,
  type LaunchpadTestScenarioId,
} from "@/lib/partner/launchpad/testScenarios";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { BeginnerPartnerAccessGate } from "@/components/developers/BeginnerPartnerAccessGate";
import { useIntegrationStudioOperational } from "@/components/developers/integrationStudioOperationalContext";
import { formatHarnessResultForBuilder } from "@/lib/partner/launchpad/formatHarnessResultForBuilder";
import { buildLaunchpadTestScenarioRequestBody } from "@/lib/partner/launchpad/testScenarioClientRequest";
import type { LaunchpadTestRunResult } from "@/lib/partner/launchpad/runTestScenario";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import {
  presentIntegrationTestFailure,
  type IntegrationTestFailurePresentation,
} from "@/lib/partner/launchpad/integrationTestFailure";
import {
  ApplicationConnectionAfterTestPanel,
  persistHarnessSuccess,
  readPersistedHarnessSuccess,
} from "@/components/developers/ApplicationConnectionAfterTestPanel";
import {
  appendSafeReturnPath,
  buildIntegrationStudioResumeUrl,
  classifyPortableDecision,
  independentlyAccepted,
  resolveIntegrationStudioExecutionMode,
  BLOCKCHAIN_NATIVE_STUDIO_PENDING_MESSAGE,
  SOLANA_EXECUTION_PENDING_MESSAGE,
  type IllustrativeIndependentVerification,
  type UnifiedTrustExecutionJourney,
} from "@/lib/partner/integrationStudio/unifiedTrustExecution";
import { signAndSendPreparedSolanaTransaction } from "@/lib/partner/launchpad/blockchainNative/clientWalletExecution";
import { fetchWalletActionChallenge, signWalletActionChallenge } from "@/lib/auth/ephemeralWallet/clientActionAuth";
import { BuilderPortableReceiptExportPanel } from "@/components/developers/BuilderPortableReceiptExportPanel";
import { useWallet, type WalletContextState } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const pendingReceiptKey = (applicationId: string) => `abraxas:harness-pending:${applicationId}`;
const blockchainNativePrepareKey = (applicationId: string) => `abraxas:blockchain-native-prepare:${applicationId}`;

type BlockchainNativePrepareView = {
  prepare_token: string;
  receipt_id: string;
  payload_hash_hex: string;
  execution_nonce: string;
  holder_wallet: string;
  registry_pda: string;
  commitment_pda: string;
  rpc_url: string;
};

function readBlockchainNativePrepare(applicationId: string): BlockchainNativePrepareView | null {
  try {
    const raw = sessionStorage.getItem(blockchainNativePrepareKey(applicationId));
    return raw ? JSON.parse(raw) as BlockchainNativePrepareView : null;
  } catch {
    return null;
  }
}

function saveBlockchainNativePrepare(applicationId: string, value: BlockchainNativePrepareView) {
  try {
    sessionStorage.setItem(blockchainNativePrepareKey(applicationId), JSON.stringify(value));
  } catch { /* refresh-safe resume when possible */ }
}

function clearBlockchainNativePrepare(applicationId: string) {
  try {
    sessionStorage.removeItem(blockchainNativePrepareKey(applicationId));
  } catch { /* no chain state stored here */ }
}

function readPendingReceipt(applicationId: string): ReturnType<typeof formatHarnessResultForBuilder> | null {
  try {
    const raw = sessionStorage.getItem(pendingReceiptKey(applicationId));
    const value = raw ? JSON.parse(raw) as ReturnType<typeof formatHarnessResultForBuilder> : null;
    return value?.tone === "success" && typeof value.receiptId === "string" ? value : null;
  } catch { return null; }
}

function savePendingReceipt(applicationId: string, result: ReturnType<typeof formatHarnessResultForBuilder>) {
  try { sessionStorage.setItem(pendingReceiptKey(applicationId), JSON.stringify(result)); } catch { /* recheck remains available in this view */ }
}

function clearPendingReceipt(applicationId: string) {
  try { sessionStorage.removeItem(pendingReceiptKey(applicationId)); } catch { /* no security state stored here */ }
}

export function IntegrationStudioRequestWorkbench({
  packId,
  pathId,
  policyId,
  applicationName,
  beginnerSurface = false,
  autoRunOnReady = false,
  startWithExample = false,
  onAutoRunConsumed,
  onRefreshSession,
}: {
  packId: PolicyPackId | null;
  pathId: IntegrationStudioPathId;
  policyId: string | null;
  applicationName?: string;
  beginnerSurface?: boolean;
  autoRunOnReady?: boolean;
  startWithExample?: boolean;
  onAutoRunConsumed?: () => void;
  onRefreshSession?: () => void | Promise<void>;
}) {
  const { applicationId, signedIn, returnUrl, recordHttpTrace } = useIntegrationStudioOperational();
  const [scenarioId, setScenarioId] = useState<LaunchpadTestScenarioId>(
    LAUNCHPAD_TEST_SCENARIOS[0]?.id ?? "approved",
  );
  const [busy, setBusy] = useState(false);
  const autoRunStartedFor = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<IntegrationTestFailurePresentation | null>(null);
  const [outcome, setOutcome] = useState<ReturnType<typeof formatHarnessResultForBuilder> | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<ReturnType<typeof formatHarnessResultForBuilder> | null>(null);
  const [trustJourney, setTrustJourney] = useState<UnifiedTrustExecutionJourney | null>(null);
  const [blockchainPrepare, setBlockchainPrepare] = useState<BlockchainNativePrepareView | null>(null);
  const [blockchainPhase, setBlockchainPhase] = useState<"idle" | "prepared" | "submitting" | "confirming">("idle");
  const { publicKey, signTransaction, signMessage, connected, connect, wallet } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const continueInFlight = useRef(false);
  const [browserOrigin, setBrowserOrigin] = useState<string | null>(null);

  useEffect(() => {
    setBrowserOrigin(getPublicAppOrigin());
  }, []);

  useEffect(() => {
    if (!applicationId) return;
    const restored = readBlockchainNativePrepare(applicationId);
    if (restored?.receipt_id) setBlockchainPrepare(restored);
  }, [applicationId]);

  useEffect(() => {
    const challengeId = new URLSearchParams(window.location.search).get("trust_execution_challenge")?.trim();
    if (!challengeId || trustJourney) return;
    setTrustJourney({
      phase: "authorized_pending_execution",
      challenge_id: challengeId,
      holder_url: "",
      receipt_id: null,
      decision_result: null,
      evidence_mode: null,
    });
  }, [trustJourney]);

  async function ensureWalletSessionForStudio():
    Promise<{ ok: true; wallet_address: string } | { ok: false }> {
    const sessionRes = await fetch("/api/auth/wallet/session", {
      credentials: "include",
      cache: "no-store",
    });
    const session = await sessionRes.json().catch(() => ({})) as {
      authenticated?: boolean;
      wallet_address?: string;
    };
    if (!sessionRes.ok || !session.authenticated || !session.wallet_address) {
      recordHttpTrace({ method: "GET", path: "/api/auth/wallet/session" }, {
        ok: false,
        code: "wallet_authorization_required",
      });
      setFailure({
        kind: "action_required",
        headline: "Wallet authorization required",
        detail: "Sign in with the wallet that will authorize this sandbox action, then run the test again.",
        actionLabel: "Resume sign-in",
        refreshSession: true,
      });
      return { ok: false };
    }
    return { ok: true, wallet_address: session.wallet_address };
  }

  async function ensureSolanaWalletReady(holderAddress: string): Promise<boolean> {
    if (!connected || !publicKey) {
      if (wallet) {
        await connect().catch(() => undefined);
      } else {
        setWalletModalVisible(true);
      }
    }
    if (!publicKey) {
      setFailure({
        kind: "action_required",
        headline: "Connect your Solana wallet",
        detail: "Connect the wallet that will authorize this sandbox action on Solana.",
        actionLabel: "Connect wallet",
        refreshSession: false,
      });
      return false;
    }
    if (publicKey.toBase58() !== holderAddress) {
      setError("The connected wallet must match your signed-in holder wallet.");
      return false;
    }
    if (!signTransaction) {
      setError("This wallet cannot sign Solana transactions. Try Phantom or another compatible wallet.");
      return false;
    }
    return true;
  }

  async function submitPreparedChainTransaction(
    prepare: BlockchainNativePrepareView,
    signTx: NonNullable<WalletContextState["signTransaction"]>,
  ): Promise<string | null> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const buildRes = await fetch(`/api/launchpad/applications/${applicationId}/blockchain-native-execution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phase: "build_transaction",
          prepare_token: prepare.prepare_token,
          holder_wallet_address: prepare.holder_wallet,
        }),
      });
      const built = await buildRes.json().catch(() => ({})) as {
        code?: string;
        transaction_base64?: string;
        recent_blockhash?: string;
        last_valid_block_height?: number;
        kind?: "register_sandbox" | "execute_harness_run";
      };
      if (!buildRes.ok || !built.transaction_base64 || !built.recent_blockhash || !built.last_valid_block_height) {
        setFailure(presentIntegrationTestFailure(buildRes.status, built));
        return null;
      }
      const signature = await signAndSendPreparedSolanaTransaction({
        rpcUrl: prepare.rpc_url,
        transactionBase64: built.transaction_base64,
        recentBlockhash: built.recent_blockhash,
        lastValidBlockHeight: built.last_valid_block_height,
        signTransaction: signTx,
      });
      recordHttpTrace(
        { method: "POST", path: `/api/launchpad/applications/${applicationId}/blockchain-native-execution`, phase: built.kind },
        { ok: true, signature },
      );
      if (built.kind === "execute_harness_run") return signature;
    }
    setError("The on-chain sandbox binding could not be registered. Try again.");
    return null;
  }

  async function runBlockchainNativeStudioJourney() {
    if (!applicationId) return;
    const sessionWallet = await ensureWalletSessionForStudio();
    if (!sessionWallet.ok) return;
    if (!(await ensureSolanaWalletReady(sessionWallet.wallet_address))) return;
    if (!signTransaction) return;

    if (!signMessage) {
      setError("This wallet cannot sign authorization messages. Try Phantom or another compatible wallet.");
      return;
    }
    if (!policyId) {
      setError("Policy context is required before preparing a blockchain-native test.");
      return;
    }
    const actionResource = `abraxas:launchpad:${applicationId}:blockchain-native`;
    const challenged = await fetchWalletActionChallenge({
      operation: "sandbox:verification:test",
      resource: actionResource,
      policyId,
    });
    if (!challenged.ok) {
      setFailure(presentIntegrationTestFailure(403, { code: challenged.code ?? "action_authorization_required" }));
      return;
    }
    const signedAction = await signWalletActionChallenge({
      challenge: challenged.challenge,
      signMessage: (message) => signMessage(message),
    });
    if (!signedAction.ok) {
      setError("Wallet authorization was not completed. Review the request in your wallet and try again.");
      return;
    }

    setBlockchainPhase("prepared");
    const prepareRes = await fetch(`/api/launchpad/applications/${applicationId}/blockchain-native-execution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        phase: "prepare",
        scenario_id: scenarioId,
        holder_wallet_address: sessionWallet.wallet_address,
        action_challenge_id: signedAction.action_challenge_id,
        action_signature: signedAction.signature,
      }),
    });
    const prepared = await prepareRes.json().catch(() => ({})) as BlockchainNativePrepareView & {
      code?: string;
      prepare_token?: string;
    };
    if (!prepareRes.ok || !prepared.prepare_token || !prepared.receipt_id) {
      setFailure(presentIntegrationTestFailure(prepareRes.status, prepared));
      setBlockchainPhase("idle");
      return;
    }
    const prepareView: BlockchainNativePrepareView = {
      prepare_token: prepared.prepare_token,
      receipt_id: prepared.receipt_id,
      payload_hash_hex: prepared.payload_hash_hex,
      execution_nonce: prepared.execution_nonce,
      holder_wallet: prepared.holder_wallet,
      registry_pda: prepared.registry_pda,
      commitment_pda: prepared.commitment_pda,
      rpc_url: prepared.rpc_url,
    };
    setBlockchainPrepare(prepareView);
    saveBlockchainNativePrepare(applicationId, prepareView);

    setBlockchainPhase("submitting");
    let signature: string | null = null;
    try {
      signature = await submitPreparedChainTransaction(prepareView, signTransaction);
    } catch {
      setFailure({
        kind: "test_failed",
        headline: "Solana transaction did not complete",
        detail: "The wallet rejected the request, the network could not be reached, or fees were insufficient.",
        actionLabel: "Try test again",
        refreshSession: false,
      });
      setBlockchainPhase("prepared");
      return;
    }
    if (!signature) {
      setBlockchainPhase("prepared");
      return;
    }

    setBlockchainPhase("confirming");
    const confirmRes = await fetch(`/api/launchpad/applications/${applicationId}/blockchain-native-execution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        phase: "confirm",
        prepare_token: prepareView.prepare_token,
        holder_wallet_address: prepareView.holder_wallet,
        transaction_signature: signature,
      }),
    });
    const confirmed = await confirmRes.json().catch(() => ({})) as {
      code?: string;
      independent_verification?: IllustrativeIndependentVerification;
      receipt_id?: string;
    };
    if (!confirmRes.ok || !confirmed.receipt_id) {
      setFailure(presentIntegrationTestFailure(confirmRes.status, confirmed));
      setBlockchainPhase("prepared");
      return;
    }
    if (!independentlyAccepted(confirmed.independent_verification)) {
      setError("Independent verification did not fully accept the signed receipt. No successful test was recorded.");
      setBlockchainPhase("prepared");
      return;
    }
    clearBlockchainNativePrepare(applicationId);
    setBlockchainPrepare(null);
    setBlockchainPhase("idle");
    setOutcome({
      headline: "Blockchain-native test verified.",
      summary: "Your wallet executed the sandbox action on Solana. Abraxas independently verified the portable receipt against finalized on-chain state.",
      tone: "success",
      observedAccess: "allow",
      passed: true,
      nextActionLabel: "Connect my application",
      receiptId: confirmed.receipt_id,
    });
    persistHarnessSuccess(applicationId, {
      headline: "Blockchain-native test verified.",
      summary: "",
      tone: "success",
      observedAccess: "allow",
      passed: true,
      nextActionLabel: "Connect my application",
      receiptId: confirmed.receipt_id,
    });
  }

  async function startUnifiedTrustExecution() {
    if (!applicationId) return;
    const wallet = await ensureWalletSessionForStudio();
    if (!wallet.ok) return;

    const res = await fetch(`/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        holder_wallet_address: wallet.wallet_address,
        solana_network: "devnet",
        defer_execution: true,
      }),
    });
    const data = await res.json().catch(() => ({})) as {
      code?: string;
      error?: string;
      journey?: UnifiedTrustExecutionJourney;
    };
    recordHttpTrace(
      { method: "POST", path: `/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, mode: "offchain_portable" },
      res.ok ? data : { ok: false, status: res.status, ...data },
    );
    if (!res.ok || !data.journey) {
      setFailure(presentIntegrationTestFailure(res.status, data));
      return;
    }
    setTrustJourney(data.journey);
  }

  async function continueUnifiedTrustExecution() {
    if (!applicationId || !trustJourney?.challenge_id || continueInFlight.current) return;
    continueInFlight.current = true;
    setBusy(true);
    try {
    const statusRes = await fetch(
      `/api/launchpad/applications/${applicationId}/sovereign-trust-execution?challenge_id=${encodeURIComponent(trustJourney.challenge_id)}`,
      { credentials: "include", cache: "no-store" },
    );
    const statusData = await statusRes.json().catch(() => ({})) as {
      code?: string;
      journey?: UnifiedTrustExecutionJourney;
    };
    if (!statusRes.ok || !statusData.journey) {
      setError(statusData.code ?? "Abraxas could not load the authorization status.");
      return;
    }
    setTrustJourney(statusData.journey);
    if (statusData.journey.phase === "awaiting_holder_authorization") {
      setError("The wallet authorization is still waiting for a signature.");
      return;
    }
    if (statusData.journey.phase === "expired") {
      setError("The wallet authorization expired. Start a new sandbox test.");
      return;
    }

    const executeRes = await fetch(`/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ execute: true, challenge_id: trustJourney.challenge_id }),
    });
    const executed = await executeRes.json().catch(() => ({})) as {
      code?: string;
      journey?: UnifiedTrustExecutionJourney;
      independent_verification?: IllustrativeIndependentVerification;
    };
    recordHttpTrace(
      { method: "POST", path: `/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, phase: "execute" },
      executeRes.ok ? executed : { ok: false, status: executeRes.status, ...executed },
    );
    if (!executeRes.ok || !executed.journey) {
      setError(executed.code ?? "The authorized action could not be executed.");
      return;
    }
    if (!executed.journey.receipt_id || !independentlyAccepted(executed.independent_verification)) {
      setError("A portable receipt was produced, but independent verification did not accept it. No successful test was recorded.");
      return;
    }
    const classification = classifyPortableDecision(
      executed.journey.decision_result,
      executed.independent_verification,
    );
    setTrustJourney(executed.journey);
    setError("");
    if (classification === "deny") {
      setError("This test did not authorize access. The current signed receipt was independently verified and denied this action.");
      setOutcome({
        headline: "This test did not authorize access.",
        summary: "Abraxas independently verified a current signed receipt whose policy decision denied this action.",
        tone: "denied",
        observedAccess: "deny",
        passed: false,
        nextActionLabel: "Review response details",
        receiptId: executed.journey.receipt_id,
      });
      return;
    }
    if (classification !== "allow") {
      setError("The signed receipt did not contain a clear, currently valid allow or deny decision. No authorization result was recorded.");
      return;
    }
    setOutcome({
      headline: "Your test worked.",
      summary: "The wallet authorized one policy-bound action. Abraxas issued a portable signed receipt and the existing independent verifier accepted its cryptographic authority and current status.",
      tone: "success",
      observedAccess: "allow",
      passed: true,
      nextActionLabel: "Connect my application",
      receiptId: executed.journey.receipt_id,
    });
    } finally {
      continueInFlight.current = false;
      setBusy(false);
    }
  }

  async function verifyHarnessReceipt(receiptId: string): Promise<"confirmed" | "invalid" | "unavailable"> {
    if (!applicationId || !signedIn) return "unavailable";
    const res = await fetch(`/api/launchpad/applications/${applicationId}/receipts/validate?receipt_id=${encodeURIComponent(receiptId)}`, {
      credentials: "include", cache: "no-store",
    });
    if (!res.ok) return res.status === 404 ? "invalid" : "unavailable";
    const data = await res.json();
    if (data.ok !== true || data.receipt_id !== receiptId) return "unavailable";
    return data.harness_verification_ok === true ? "confirmed" : "invalid";
  }

  useEffect(() => {
    setOutcome(null);
    setError("");
    setFailure(null);
    if (!applicationId || !signedIn || autoRunStartedFor.current === applicationId) return;
    const pending = readPendingReceipt(applicationId);
    if (pending?.receiptId) {
      autoRunStartedFor.current = applicationId;
      onAutoRunConsumed?.();
      let active = true;
      setPendingReceipt(pending);
      void verifyHarnessReceipt(pending.receiptId).then((status) => {
        if (!active) return;
        if (status === "confirmed") {
          persistHarnessSuccess(applicationId, pending);
          clearPendingReceipt(applicationId);
          setPendingReceipt(null);
          setOutcome(pending);
        } else if (status === "invalid") {
          clearPendingReceipt(applicationId);
          setPendingReceipt(null);
          setError("That receipt is no longer valid. Run a new test.");
        } else setError("We could not recheck the receipt. Try again shortly.");
      }).catch(() => { if (active) setError("We could not recheck the receipt. Try again shortly."); });
      return () => { active = false; };
    }
    if (autoRunOnReady) return;
    const restored = readPersistedHarnessSuccess(applicationId);
    if (!restored?.receiptId) return;
    let active = true;
    void verifyHarnessReceipt(restored.receiptId).then((status) => {
      if (active && status === "confirmed") setOutcome(restored);
      if (active && status === "invalid") setError("The previous receipt is no longer valid. Run a new test.");
      if (active && status === "unavailable") setError("We could not recheck the receipt. Try again shortly.");
    }).catch(() => {
      if (active) setError("Could not confirm the previous test. Run it again.");
    });
    return () => { active = false; };
  // A browser hint never establishes a current verified result.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, signedIn, autoRunOnReady]);

  async function runHarness() {
    if (!applicationId || !signedIn) return;
    const pending = pendingReceipt ?? readPendingReceipt(applicationId);
    if (pending?.receiptId) {
      setBusy(true);
      try {
        const status = await verifyHarnessReceipt(pending.receiptId);
        if (status === "confirmed") {
          persistHarnessSuccess(applicationId, pending);
          clearPendingReceipt(applicationId);
          setPendingReceipt(null);
          setError("");
          setOutcome(pending);
        } else if (status === "invalid") {
          clearPendingReceipt(applicationId);
          setPendingReceipt(null);
          setError("That receipt is no longer valid. Run a new test.");
        } else setError("We could not recheck the receipt. Try again shortly.");
      } catch { setError("We could not recheck the receipt. Try again shortly."); }
      finally { setBusy(false); }
      return;
    }
    setBusy(true);
    setError("");
    setFailure(null);
    setOutcome(null);
    setTrustJourney(null);
    const executionMode = resolveIntegrationStudioExecutionMode(pathId);
    if (executionMode === "solana_finalized") {
      setError(SOLANA_EXECUTION_PENDING_MESSAGE);
      setBusy(false);
      return;
    }
    if (executionMode === "blockchain_native_continuity") {
      try {
        if (scenarioId === "approved") {
          await runBlockchainNativeStudioJourney();
        } else {
          const requestBody = buildLaunchpadTestScenarioRequestBody({ scenarioId, returnUrl });
          const res = await fetch(`/api/launchpad/applications/${applicationId}/test`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(requestBody),
          });
          const data = await res.json().catch(() => ({})) as { result?: LaunchpadTestRunResult };
          if (res.ok && data.result) setOutcome(formatHarnessResultForBuilder(data.result));
          else setFailure(presentIntegrationTestFailure(res.status, data as { code?: string }));
        }
      } catch {
        setFailure({
          kind: "test_failed",
          headline: "Blockchain-native test did not complete",
          detail: "Check pinned RPC configuration and try again.",
          actionLabel: "Try test again",
          refreshSession: false,
        });
      } finally {
        setBusy(false);
      }
      return;
    }
    if (scenarioId === "approved") {
      try {
        await startUnifiedTrustExecution();
      } catch {
        setFailure({
          kind: "test_failed",
          headline: "Trust execution did not start",
          detail: "The request did not reach the unified trust-execution service. Check the connection and try again.",
          actionLabel: "Try test again",
          refreshSession: false,
        });
      } finally {
        setBusy(false);
      }
      return;
    }
    const requestBody = buildLaunchpadTestScenarioRequestBody({
      scenarioId,
      returnUrl,
    });
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });
      const data = await res.json().catch(() => ({})) as {
        code?: string;
        error?: string;
        retry_after_sec?: number;
        result?: LaunchpadTestRunResult;
      };
      recordHttpTrace(
        { method: "POST", path: `/api/launchpad/applications/${applicationId}/test`, body: requestBody },
        res.ok ? data : { ok: false, status: res.status, ...data },
      );
      if (!res.ok) {
        setFailure(presentIntegrationTestFailure(res.status, data));
        return;
      }
      if (data.result && typeof data.result === "object") {
        const formatted = formatHarnessResultForBuilder(data.result as LaunchpadTestRunResult);
        if (formatted.tone === "success") {
          const verification = formatted.receiptId
            ? await verifyHarnessReceipt(formatted.receiptId) : "invalid";
          if (verification !== "confirmed") {
            if (formatted.receiptId && verification === "unavailable") {
              savePendingReceipt(applicationId, formatted);
              setPendingReceipt(formatted);
              setError("Your test ran. Recheck its receipt before running another test.");
            } else setError("The test receipt is invalid. Run a new test.");
            return;
          }
          persistHarnessSuccess(applicationId, formatted);
        }
        setOutcome(formatted);
      }
    } catch {
      setFailure({
        kind: "test_failed",
        headline: "Test request did not reach Abraxas",
        detail: "Check your connection, then try the test again.",
        actionLabel: "Try test again",
        refreshSession: false,
      });
      recordHttpTrace(requestBody, { ok: false, error: "network_error" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!autoRunOnReady || !applicationId || autoRunStartedFor.current === applicationId || !signedIn || !packId || !policyId || readPendingReceipt(applicationId)) return;
    autoRunStartedFor.current = applicationId;
    onAutoRunConsumed?.();
    void runHarness();
  // One user-authorized create action starts one sandbox test; never replay on refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunOnReady, applicationId, signedIn, packId, policyId]);

  const showConnectJourney =
    Boolean(applicationId && signedIn && packId && policyId && outcome?.tone === "success");

  const holderAuthorizationUrl = trustJourney?.phase === "awaiting_holder_authorization" && browserOrigin
    ? appendSafeReturnPath(
        trustJourney.holder_url,
        buildIntegrationStudioResumeUrl(window.location.href, trustJourney.challenge_id),
        browserOrigin,
      )
    : null;

  const trustAuthorizationAction = trustJourney?.phase === "awaiting_holder_authorization" && holderAuthorizationUrl ? (
    <div className="abx-builder-journey-actions">
      <Btn
        href={holderAuthorizationUrl}
        size="sm"
      >
        Authorize with wallet
      </Btn>
      <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void continueUnifiedTrustExecution()}>
        Check authorization
      </Btn>
    </div>
  ) : trustJourney?.phase === "awaiting_holder_authorization" && browserOrigin ? (
    <p role="alert">Abraxas could not open a safe same-origin wallet authorization link.</p>
  ) : trustJourney?.phase === "awaiting_holder_authorization" ? null : trustJourney && trustJourney.phase !== "executed" ? (
    <Btn size="sm" disabled={busy} loading={busy} onClick={() => void continueUnifiedTrustExecution()}>
      Check authorization
    </Btn>
  ) : null;

  if (beginnerSurface && showConnectJourney) {
    return (
      <ApplicationConnectionAfterTestPanel
        applicationId={applicationId!}
        applicationName={applicationName ?? "Your application"}
        signedIn={signedIn}
        packId={packId!}
        pathId={pathId}
        policyId={policyId!}
        returnUrl={returnUrl}
        outcome={outcome!}
        testSucceeded
        startWithExample={startWithExample}
      />
    );
  }

  if (beginnerSurface && applicationId && !signedIn) {
    return <BeginnerPartnerAccessGate applicationId={applicationId} onReady={onRefreshSession ?? (() => {})} />;
  }

  if (beginnerSurface) {
    const failed = Boolean(failure || error || (outcome && outcome.tone !== "success"));
    return (
      <BuilderActiveTask
        taskKey="run-sandbox-test"
        testId="builder-run-test-minimal"
        title={busy ? "Running your test" : failed ? "Your test needs attention" : blockchainPhase === "submitting" ? "Sign in your wallet" : trustJourney ? "Authorize the sandbox action" : "Run a sandbox test"}
        description={failed ? "Check the result, then try again." : blockchainPhase === "submitting" ? BLOCKCHAIN_NATIVE_STUDIO_PENDING_MESSAGE : trustJourney ? "Sign the action-specific request, then verify the resulting receipt." : "See how your app receives a verified result."}
        state={busy ? "pending" : failed ? "failure" : "ready"}
        status={busy ? "Running against your sandbox app" : failure?.headline ?? (failed ? outcome?.headline : undefined)}
        error={failure?.detail ?? error}
        action={trustAuthorizationAction ?? (applicationId && signedIn && (!failure || failure.actionLabel) ? (
          <Btn
            size="sm"
            disabled={busy}
            loading={busy}
            onClick={() => failure?.refreshSession ? void onRefreshSession?.() : void runHarness()}
          >
            {pendingReceipt ? "Recheck receipt" : failure?.actionLabel ?? (failed ? "Try test again" : "Run test")}
          </Btn>
        ) : null)}
      >
        {!applicationId ? <p className="abx-builder-journey-support">Create your test app first.</p> : null}
        {trustJourney?.phase === "awaiting_holder_authorization" ? (
          <p className="abx-builder-journey-support">Review and sign the action-specific request, then return here and check authorization.</p>
        ) : null}
        {blockchainPrepare?.receipt_id && blockchainPhase !== "idle" ? (
          <p className="abx-builder-journey-support">Preparing receipt <code>{blockchainPrepare.receipt_id}</code> for your wallet.</p>
        ) : null}
      </BuilderActiveTask>
    );
  }

  return (
    <ContentCard title="Run a test" id="request">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
        Run a real sandbox verification. When it succeeds, connect your application backend on the next step.
      </p>
      {busy ? <AbraxasJourneyEmblemStatus state="running_test" detail="Executing harness request against your sandbox application." /> : null}
      {outcome && !busy ? (
        <AbraxasJourneyEmblemStatus
          state={outcome.tone === "success" ? "verified" : "needs_attention"}
          detail={outcome.headline}
        />
      ) : null}
      {!applicationId && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Create your test app above to enable live requests.
        </p>
      )}
      {applicationId && !signedIn && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--warning, #f59e0b)" }}>
          Sign in with your sandbox API key (Launchpad session) to execute harness scenarios.
        </p>
      )}
      {applicationId && signedIn && (
        <>
          <label style={{ display: "grid", gap: "0.35rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.65rem" }}>
            Scenario
            <select
              value={scenarioId}
              onChange={(event) => setScenarioId(event.target.value as LaunchpadTestScenarioId)}
              style={{
                fontFamily: MONO,
                fontSize: "0.72rem",
                padding: "0.5rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-inset)",
                color: "var(--text-primary)",
              }}
            >
              {LAUNCHPAD_TEST_SCENARIOS.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
          </label>
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>
            return_url: {returnUrl}
          </p>
          {blockchainPhase === "submitting" ? (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.75rem" }}>{BLOCKCHAIN_NATIVE_STUDIO_PENDING_MESSAGE}</p>
          ) : null}
          {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)" }}>{error}</p>}
          {outcome && !busy ? (
            <div
              style={{
                fontFamily: FONT,
                fontSize: "0.78rem",
                lineHeight: 1.55,
                margin: "0 0 0.75rem",
                padding: "0.75rem 0.85rem",
                borderRadius: 10,
                border:
                  outcome.tone === "success"
                    ? "1px solid rgba(76,187,146,0.45)"
                    : "1px solid rgba(248,113,113,0.35)",
                background: "var(--surface-inset)",
              }}
            >
              <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>{outcome.headline}</p>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>{outcome.summary}</p>
              {outcome.receiptId ? (
                <p style={{ margin: "0.55rem 0 0", fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  receipt_id: {outcome.receiptId}
                </p>
              ) : null}
              {outcome.receiptId && outcome.tone === "success" ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <BuilderPortableReceiptExportPanel receiptId={outcome.receiptId} />
                </div>
              ) : null}
            </div>
          ) : null}
          <Btn size="sm" disabled={busy} onClick={() => void runHarness()}>
            {busy ? "Running…" : "Run test"}
          </Btn>
        </>
      )}
      {showConnectJourney ? (
        <div style={{ marginTop: "1rem" }}>
          <ApplicationConnectionAfterTestPanel
            applicationId={applicationId!}
            signedIn={signedIn}
            packId={packId!}
            pathId={pathId}
            policyId={policyId!}
            returnUrl={returnUrl}
            outcome={outcome!}
          />
        </div>
      ) : null}
    </ContentCard>
  );
}




