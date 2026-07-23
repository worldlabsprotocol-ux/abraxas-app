"use client";
// FILE: components/case-studies/AssetInquirePanel.tsx
// Closed-loop acquisition interest. stays on Abraxas, routes to partner via protocol.

import { useState } from "react";
import { useSuiAuth, truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const PACKAGES = [
  { id: "full_project", label: "Full project (~270 ac · 11 lots)" },
  { id: "remaining_9", label: "Remaining 9 lots package" },
  { id: "lots_234", label: "Lots 2-4 contiguous bundle" },
  { id: "single_lot", label: "Single lot / custom structure" },
  { id: "usdc_settle", label: "USDC settlement · deal-ready" },
] as const;

export function AssetInquirePanel({
  assetId,
  assetName,
  partnerName,
}: {
  assetId: string;
  assetName: string;
  partnerName: string;
}) {
  const { isAuthenticated, session, suiAddress, signInWithGoogle } = useSuiAuth();
  const [pkg, setPkg] = useState<string>(PACKAGES[0].id);
  const [email, setEmail] = useState(session?.email ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [proofId, setProofId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.85rem", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-primary)", fontFamily: FONT, fontSize: "16px",
    boxSizing: "border-box", marginBottom: "0.55rem",
  };

  async function submit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Valid email required. Abraxas routes your inquiry to the partner.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/assets/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: assetId,
          asset_name: assetName,
          package_interest: pkg,
          email: trimmedEmail,
          wallet: suiAddress,
          message: message.trim() || null,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; proof?: { proof_id: string; verify_url: string; explorer_url?: string | null } };
      if (data.ok) {
        setSent(true);
        if (data.proof?.proof_id) setProofId(data.proof.proof_id);
      } else {
        setError(data.error ?? "Could not submit. try again.");
      }
    } catch {
      setError("Network error. try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div style={{
        padding: "1.25rem", borderRadius: 14,
        border: `1px solid ${ACCENT}44`, background: `${ACCENT}10`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: ACCENT, marginBottom: "0.35rem" }}>
          Inquiry received on Abraxas
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.5rem" }}>
          {partnerName} gets your package interest through the protocol. Partner status updates sync here automatically , 
          no third-party funnel. USDC settlement opens when the deal is ready.
        </p>
        {proofId && (
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--accent)", margin: 0 }}>
            On-chain proof · <a href={`/api/proof/${proofId}`} style={{ color: "var(--accent)" }}>{proofId}</a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{
      padding: "1.25rem", borderRadius: 14,
      border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.4rem",
      }}>
        Acquire through Abraxas
      </div>
      <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
        Inquire · {assetName}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 1rem" }}>
        Abraxas spearheads the flow. {partnerName} provides updates, diligence stays on-registry,
        and settlement can close in USDC on Sui. No routing buyers off-platform.
      </p>

      {!isAuthenticated && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            style={{
              padding: "0.55rem 1rem", borderRadius: 999,
              border: `1px solid ${ACCENT}`, background: "transparent",
              color: ACCENT, fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
              cursor: "pointer", marginBottom: "0.5rem",
            }}
          >
            Sign in with Passport (recommended) →
          </button>
        </div>
      )}

      {isAuthenticated && suiAddress && (
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>
          Passport · {truncateSuiAddress(suiAddress)}
        </p>
      )}

      <label style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
        Package interest
      </label>
      <select value={pkg} onChange={e => setPkg(e.target.value)} style={inputStyle}>
        {PACKAGES.map(p => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>

      <label style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
        Email *
      </label>
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@firm.com" style={inputStyle} />

      <label style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
        Message (optional)
      </label>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Timeline, financing, bulk structure…"
        rows={3}
        style={{ ...inputStyle, resize: "vertical" }}
      />

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#F87171", margin: "0 0 0.65rem" }}>{error}</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={submit}
          disabled={sending}
          style={{
            padding: "0.65rem 1.25rem", borderRadius: 999,
            border: "none", background: ACCENT, color: "#04130C",
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800,
            cursor: sending ? "wait" : "pointer", opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? "Submitting…" : "Submit inquiry on Abraxas →"}
        </button>
        <Btn href={`/verify/${encodeURIComponent(assetId)}`} variant="secondary" size="sm">Verify record</Btn>
      </div>
    </div>
  );
}
