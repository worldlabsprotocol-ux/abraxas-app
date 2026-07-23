"use client";
// FILE: components/verify/PolicyCheckPanel.tsx
// Public demo of Abraxas Verified Participant v1. reference policy gate.

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { REFERENCE_POLICIES } from "@/lib/verification/referencePolicies";
import type { CheckLevelResponse } from "@/lib/api/passport";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.75rem 0.85rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: MONO,
  fontSize: "0.72rem",
};

const POLICY = REFERENCE_POLICIES.verifiedParticipant;

export function PolicyCheckPanel({ suiAddress }: { suiAddress?: string | null }) {
  const [wallet, setWallet] = useState(suiAddress ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckLevelResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function runCheck(address: string) {
    const trimmed = address.trim();
    if (!trimmed) {
      setErr("Enter a Sui wallet address or sign in on Passport.");
      return;
    }
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/verification/check-level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sui_address: trimmed,
          action: POLICY.action,
        }),
      });
      const data = await res.json() as CheckLevelResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Policy check failed");
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Policy check failed");
    } finally {
      setLoading(false);
    }
  }

  const decisionTone =
    result?.decision === "approved" ? "success"
    : result?.decision === "manual_review" ? "pending"
    : "error";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <CapabilityStatusBadge status="live" size="xs" />
        <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
          POST /api/verification/check-level
        </span>
      </div>

      <div style={{
        padding: "1rem 1.15rem", borderRadius: 14, marginBottom: "1rem",
        background: "var(--surface-inset)", border: "1px solid var(--border-strong)",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
          {POLICY.name}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.65rem" }}>
          {POLICY.description} Partners receive <strong>approved / denied / manual review</strong>. not document folders.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {POLICY.required.map(r => (
            <li key={r} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: 4 }}>{r}</li>
          ))}
        </ul>
        <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: "0.65rem 0 0", lineHeight: 1.5 }}>
          Policy ID: <code style={{ fontFamily: MONO }}>{POLICY.id}</code>
        </p>
      </div>

      <label style={{ display: "grid", gap: "0.35rem", marginBottom: "0.85rem" }}>
        <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Sui wallet (Passport holder)
        </span>
        <input
          value={wallet}
          onChange={e => setWallet(e.target.value)}
          placeholder="0x…"
          style={fieldStyle}
        />
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <Btn onClick={() => void runCheck(wallet)} loading={loading} disabled={!wallet.trim()}>
          Run policy check →
        </Btn>
        {suiAddress && (
          <Btn variant="secondary" onClick={() => { setWallet(suiAddress); void runCheck(suiAddress); }}>
            Check my Passport
          </Btn>
        )}
        <Btn href="/passport" variant="ghost" size="sm">Complete Passport setup</Btn>
      </div>

      {err && (
        <div style={{ marginBottom: "1rem" }}>
          <StatusBanner tone="error" title="Check failed">{err}</StatusBanner>
        </div>
      )}

      {result && (
        <div style={{ marginBottom: "1rem" }}>
          <StatusBanner
            tone={decisionTone}
            title={
              result.decision === "approved" ? "Approved. eligible for gated action"
              : result.decision === "manual_review" ? "Manual review. partial eligibility"
              : "Denied. missing requirements"
            }
          >
            Policy {result.policy_id ?? POLICY.id} · Level {result.currentLevel}
          </StatusBanner>

          <div style={{
            marginTop: "0.85rem", padding: "1rem", borderRadius: 12,
            background: "var(--surface-inset)", border: "1px solid var(--border)",
            fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.65,
          }}>
            {result.missing_claims.length > 0 && (
              <div style={{ marginBottom: "0.65rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Missing claims:</strong>{" "}
                {result.missing_claims.join(", ")}
              </div>
            )}
            {result.reason_codes.length > 0 && (
              <div style={{ marginBottom: "0.65rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Reason codes:</strong>{" "}
                {result.reason_codes.join(", ")}
              </div>
            )}
            {result.decision === "approved" && (
              <div style={{ marginTop: "0.5rem" }}>
                Next:{" "}
                <Link href="/build" style={{ color: ACCENT, fontWeight: 700 }}>Submit a verified asset →</Link>
                {" · "}
                <Link href="/verify?mode=credential" style={{ color: ACCENT, fontWeight: 700 }}>Verify credential publicly →</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !err && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          This is the reference closed loop: Passport issues claims → policy engine evaluates → partner gets a decision.
          Complete setup on <Link href="/passport" style={{ color: ACCENT }}>Passport</Link>, then re-run the check here.
        </p>
      )}
    </div>
  );
}
