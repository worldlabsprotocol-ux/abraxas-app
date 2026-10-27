"use client";
// FILE: components/partner/launchpad/PartnerSovereignTrustExecutionPanel.tsx

import { useCallback, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

type IndependentVerificationView =
  | { currently_acceptable?: string; cryptographically_authentic?: boolean }
  | {
      scope?: string;
      disclaimer?: string;
      result?: { currently_acceptable?: string; cryptographically_authentic?: boolean };
    };

function resolveIndependentVerification(iv: IndependentVerificationView): {
  disclaimer: string | null;
  result: { currently_acceptable?: string; cryptographically_authentic?: boolean };
} {
  if ("result" in iv && iv.result) {
    return { disclaimer: iv.disclaimer ?? null, result: iv.result };
  }
  const flat = iv as { currently_acceptable?: string; cryptographically_authentic?: boolean };
  return { disclaimer: null, result: flat };
}

type Journey = {
  phase: string;
  challenge_id: string;
  correlation_id: string;
  holder_url: string;
  holder_wallet_address: string;
  authorization_ref: string | null;
  receipt_id: string | null;
  decision_result: string | null;
  evidence_mode: string | null;
  independent_verification_material?: unknown;
  independent_verification?: IndependentVerificationView;
};

export function PartnerSovereignTrustExecutionPanel({ applicationId }: { applicationId: string }) {
  const [wallet, setWallet] = useState("");
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const poll = useCallback(async (challengeId: string) => {
    const res = await fetch(
      `/api/launchpad/applications/${applicationId}/sovereign-trust-execution?challenge_id=${encodeURIComponent(challengeId)}`,
      { credentials: "include" },
    );
    const data = await res.json() as { ok?: boolean; journey?: Journey; error?: string };
    if (data.journey) setJourney(data.journey);
    if (!res.ok) setError(data.error ?? "Could not load journey status");
  }, [applicationId]);

  const start = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ holder_wallet_address: wallet.trim(), solana_network: "devnet" }),
      });
      const data = await res.json() as { ok?: boolean; journey?: Journey; code?: string; error?: string };
      if (!res.ok || !data.journey) {
        setError(data.error ?? data.code ?? "Could not start trust execution");
        return;
      }
      setJourney(data.journey);
    } finally {
      setBusy(false);
    }
  }, [applicationId, wallet]);

  const execute = useCallback(async () => {
    if (!journey?.challenge_id) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ execute: true, challenge_id: journey.challenge_id }),
      });
      const data = await res.json() as {
        ok?: boolean;
        journey?: Journey;
        independent_verification?: Journey["independent_verification"];
        code?: string;
        error?: string;
      };
      if (!res.ok || !data.journey) {
        setError(data.error ?? data.code ?? "Execution did not complete");
        return;
      }
      setJourney({
        ...data.journey,
        independent_verification: data.independent_verification ?? data.journey.independent_verification,
      });
    } finally {
      setBusy(false);
    }
  }, [applicationId, journey?.challenge_id]);

  return (
    <ContentCard title="Sovereign trust execution (sandbox)">
      <p style={{ marginTop: 0, color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "0.875rem" }}>
        One connected journey: partner request → hosted holder authorization → automatic evaluation on the same scoped challenge → durable receipt.
        Holder signing continues evaluation (authorization is not eligibility). Partner execute remains an idempotent retry.
      </p>

      <label style={{ display: "grid", gap: "0.35rem", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <span>Sandbox holder wallet (Solana devnet)</span>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Holder wallet address"
          style={{
            padding: "0.55rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
            color: "var(--text-primary)",
          }}
        />
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <Btn disabled={busy || !wallet.trim()} onClick={() => void start()}>
          Request trust decision
        </Btn>
        {journey?.challenge_id && (
          <Btn variant="secondary" disabled={busy} onClick={() => void poll(journey.challenge_id)}>
            Refresh status
          </Btn>
        )}
        {journey?.authorization_ref && journey.phase !== "executed" && (
          <Btn disabled={busy} onClick={() => void execute()}>
            Execute signed decision
          </Btn>
        )}
      </div>

      {error && <p style={{ color: "var(--danger, #f87171)", fontSize: "0.875rem" }}>{error}</p>}

      {journey && (
        <dl style={{ fontSize: "0.8125rem", display: "grid", gap: "0.35rem" }}>
          <div><dt>Phase</dt><dd>{journey.phase}</dd></div>
          <div><dt>Correlation</dt><dd>{journey.correlation_id}</dd></div>
          <div>
            <dt>Holder link</dt>
            <dd>
              <Link href={journey.holder_url} target="_blank" rel="noreferrer">
                Open holder authorization
              </Link>
            </dd>
          </div>
          {journey.receipt_id && (
            <div><dt>Receipt</dt><dd>{journey.receipt_id}</dd></div>
          )}
          {journey.independent_verification && (
            <div>
              <dt>Illustrative verifier (Launchpad)</dt>
              <dd>
                {(() => {
                  const { disclaimer, result } = resolveIndependentVerification(
                    journey.independent_verification!,
                  );
                  return (
                    <>
                      {disclaimer && (
                        <p style={{ margin: "0 0 0.35rem", color: "var(--text-secondary)" }}>{disclaimer}</p>
                      )}
                      authentic={String(result.cryptographically_authentic)} · acceptable=
                      {result.currently_acceptable}
                    </>
                  );
                })()}
              </dd>
            </div>
          )}
        </dl>
      )}
    </ContentCard>
  );
}
