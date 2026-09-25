"use client";

import { useEffect, useState } from "react";

type Proof =
  | { ok: true; network_id: "solana_devnet"; signature: string; slot: number;
      gate_program_id: string; consumer_program_id: string; authorization_pda: string;
      entitlement_pda: string; authorization_consumed: true; valid_until: number;
      currently_valid: boolean; replay_broadcast_proven: false }
  | { ok: false; reason: string };

const reasonText: Record<string, string> = {
  invalid_signature: "Enter a Solana transaction signature.",
  transaction_not_proven: "No finalized, successful institutional access transaction was found for this signature.",
  instruction_mismatch: "The transaction does not contain the reviewed Abraxas instruction sequence.",
  transaction_time_mismatch: "The attestation was outside its validity window when the transaction ran.",
  proof_mismatch: "The signed attestation does not match the reviewed institutional devnet bindings.",
  authorization_missing_or_invalid: "The expected authorization account is missing or invalid.",
  entitlement_missing_or_invalid: "The expected protocol entitlement is missing or invalid.",
  proof_account_mismatch: "The current account contents do not match the signed attestation.",
  proof_state_mismatch: "The authorization has not been consumed into the expected entitlement state.",
  wrong_cluster: "The configured RPC is not Solana devnet.",
  rpc_unavailable: "Solana devnet could not be checked right now. Try again shortly.",
};

export function SolanaDevnetProofClient({ signature }: { signature: string }) {
  const [proof, setProof] = useState<Proof | null>(null);
  const [loading, setLoading] = useState(Boolean(signature));
  useEffect(() => {
    if (!signature) return;
    const controller = new AbortController();
    fetch(`/api/solana/devnet/proof?signature=${encodeURIComponent(signature)}`, {
      signal: controller.signal, cache: "no-store",
    })
      .then(async (response) => (await response.json()) as Proof)
      .then((result) => { setProof(result); setLoading(false); })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setProof({ ok: false, reason: "rpc_unavailable" });
        setLoading(false);
      });
    return () => controller.abort();
  }, [signature]);

  const mono: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)", overflowWrap: "anywhere" };
  const row: React.CSSProperties = { margin: "0.5rem 0", lineHeight: 1.55 };
  return (
    <>
      <form action="/proofs/solana-devnet" method="get" style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
        <label htmlFor="solana-proof-signature" style={{ width: "100%" }}>Finalized transaction signature</label>
        <input id="solana-proof-signature" name="signature" defaultValue={signature}
          autoComplete="off" spellCheck={false} required maxLength={88}
          placeholder="Paste a Solana devnet transaction signature"
          style={{ flex: "1 1 360px", padding: "0.75rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface, #141b2a)", color: "var(--text-primary, white)", ...mono }} />
        <button type="submit" style={{ padding: "0.75rem 1.2rem", borderRadius: 8, cursor: "pointer" }}>Verify transaction</button>
      </form>
      {loading && <p role="status" style={row}>Checking finalized Solana devnet transaction and current accounts…</p>}
      {!loading && proof?.ok === false && (
        <p role="status" style={row}>{reasonText[proof.reason] ?? "This signature could not be verified as the reviewed institutional devnet proof."}</p>
      )}
      {!loading && proof?.ok === true && (
        <div role="status" style={{ marginTop: "1.25rem" }}>
          <p style={row}><strong>Verified institutional devnet transaction</strong></p>
          <p style={row}>Authorization consumed: yes · Current access: {proof.currently_valid ? "valid" : "expired"}</p>
          <p style={row}>Finalized in slot {proof.slot} · Valid until {new Date(proof.valid_until * 1000).toLocaleString()}</p>
          <p style={row}>Signature: <a style={mono} href={`https://explorer.solana.com/tx/${proof.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">{proof.signature}</a></p>
          <p style={row}>Gate program: <span style={mono}>{proof.gate_program_id}</span></p>
          <p style={row}>Consumer program: <span style={mono}>{proof.consumer_program_id}</span></p>
          <p style={row}>Authorization: <span style={mono}>{proof.authorization_pda}</span></p>
          <p style={row}>Entitlement: <span style={mono}>{proof.entitlement_pda}</span></p>
          <p style={row}>A broadcast replay attempt has not been proven by this check.</p>
        </div>
      )}
    </>
  );
}
