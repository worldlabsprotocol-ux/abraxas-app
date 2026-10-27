"use client";
// FILE: components/partner/PartnerTrustExecutionHolderClient.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { SolanaWalletConnectButton } from "@/components/passport/SolanaWalletConnectButton";
import { PassportSolanaSignInButton } from "@/components/passport/PassportSolanaSignInButton";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { encodePassportSolanaMessage } from "@/lib/auth/passportSolanaAuth/message";
import bs58 from "bs58";

type ChallengeView = {
  challenge_id: string;
  message: string;
  expires_at: string;
  partner_id: string;
  application_id: string;
  policy_id: string;
  action: string;
  status: "pending" | "consumed" | "expired";
};

export function PartnerTrustExecutionHolderClient() {
  const params = useSearchParams();
  const challengeId = params.get("challenge_id")?.trim() ?? "";
  const { publicKey, signMessage, connected } = useWallet();
  const [challenge, setChallenge] = useState<ChallengeView | null>(null);
  const [walletSessionOk, setWalletSessionOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authorizationRef, setAuthorizationRef] = useState<string | null>(null);
  const [executionReceiptId, setExecutionReceiptId] = useState<string | null>(null);
  const [decisionResult, setDecisionResult] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58() ?? "";

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/auth/wallet/session", { credentials: "include" });
    const body = await res.json() as { authenticated?: boolean; wallet_address?: string };
    setWalletSessionOk(Boolean(body.authenticated && body.wallet_address === walletAddress));
  }, [walletAddress]);

  const loadChallenge = useCallback(async () => {
    if (!challengeId || !walletSessionOk) return;
    setError(null);
    const res = await fetch(`/api/v1/partner-flow/trust-execution/challenge/${encodeURIComponent(challengeId)}`, {
      credentials: "include",
    });
    const body = await res.json() as { ok?: boolean; challenge?: ChallengeView; code?: string };
    if (!res.ok || !body.challenge) {
      setError(body.code ?? "Could not load authorization request");
      setChallenge(null);
      return;
    }
    setChallenge(body.challenge);
    if (body.challenge.status === "consumed") {
      setAuthorized(true);
    }
  }, [challengeId, walletSessionOk]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    void loadChallenge();
  }, [loadChallenge]);

  const disclosure = useMemo(() => {
    if (!challenge) return null;
    return {
      application: challenge.application_id,
      policy: challenge.policy_id,
      action: challenge.action,
    };
  }, [challenge]);

  const signAuthorization = useCallback(async () => {
    if (!challenge || !signMessage || !walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const encoded = encodePassportSolanaMessage(challenge.message);
      const signatureBytes = await signMessage(encoded);
      const signature = bs58.encode(signatureBytes);
      const res = await fetch("/api/v1/partner-flow/trust-execution/authorize", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.challenge_id,
          signature,
          solana_network: "devnet",
        }),
      });
      const body = await res.json() as {
        ok?: boolean;
        authorization_ref?: string;
        code?: string;
        evaluation_continued?: boolean;
        execution?: {
          ok?: boolean;
          receipt_id?: string | null;
          decision_result?: string | null;
          code?: string;
        } | null;
      };
      if (!res.ok || !body.ok) {
        setError(body.code ?? "Authorization failed");
        return;
      }
      setAuthorized(true);
      setAuthorizationRef(body.authorization_ref ?? null);
      if (body.execution?.ok && body.execution.receipt_id) {
        setExecutionReceiptId(body.execution.receipt_id);
        setDecisionResult(body.execution.decision_result ?? null);
      } else if (body.execution && !body.execution.ok) {
        setError(body.execution.code ?? "Evaluation did not complete");
      }
      await loadChallenge();
    } catch {
      setError("Wallet signature was not completed.");
    } finally {
      setBusy(false);
    }
  }, [challenge, signMessage, walletAddress, loadChallenge]);

  if (!challengeId) {
    return (
      <ContentCard title="Trust authorization">
        <p>Missing authorization link. Return to the partner application and request verification again.</p>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Authorize trust decision">
      <p style={{ marginTop: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Review what the application is requesting, connect the wallet that was invited, and sign once to authorize execution.
      </p>

      {!connected && (
        <div style={{ marginBottom: "1rem" }}>
          <SolanaWalletConnectButton />
        </div>
      )}

      {connected && !walletSessionOk && (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Confirm wallet control before signing the partner authorization.
          </p>
          <PassportSolanaSignInButton
            intendedAction={HOLDER_AUTH_ACTIONS.partnerVerify}
            onSuccess={() => void loadSession()}
            label="Verify wallet control"
          />
        </div>
      )}

      {disclosure && (
        <dl style={{ display: "grid", gap: "0.35rem", fontSize: "0.875rem", marginBottom: "1rem" }}>
          <div>
            <dt style={{ opacity: 0.7 }}>Application</dt>
            <dd style={{ margin: 0 }}>{disclosure.application}</dd>
          </div>
          <div>
            <dt style={{ opacity: 0.7 }}>Policy</dt>
            <dd style={{ margin: 0 }}>{disclosure.policy}</dd>
          </div>
          <div>
            <dt style={{ opacity: 0.7 }}>Action</dt>
            <dd style={{ margin: 0 }}>{disclosure.action}</dd>
          </div>
          <div>
            <dt style={{ opacity: 0.7 }}>Disclosure</dt>
            <dd style={{ margin: 0 }}>Wallet signature only — no document upload for this step.</dd>
          </div>
        </dl>
      )}

      {error && <p style={{ color: "var(--danger, #f87171)" }}>{error}</p>}

      {authorized ? (
        <div style={{ color: "var(--text-primary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 0.5rem" }}>
            Wallet authorization recorded
            {authorizationRef ? ` (${authorizationRef.slice(0, 12)}…)` : ""}.
            Evaluation continued on the same scoped request when evidence permits.
          </p>
          {executionReceiptId ? (
            <p style={{ margin: 0 }}>
              Durable outcome: {decisionResult ?? "approved"} · receipt {executionReceiptId.slice(0, 16)}…
            </p>
          ) : null}
        </div>
      ) : (
        walletSessionOk && challenge?.status === "pending" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void signAuthorization()}
            style={{
              padding: "0.65rem 1.1rem",
              borderRadius: 10,
              border: "none",
              background: "#14F195",
              color: "#04110c",
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Waiting for wallet…" : "Sign authorization"}
          </button>
        )
      )}

      {challenge?.status === "expired" && (
        <p style={{ color: "var(--text-secondary)" }}>This authorization request expired. Ask the partner to start again.</p>
      )}
    </ContentCard>
  );
}
