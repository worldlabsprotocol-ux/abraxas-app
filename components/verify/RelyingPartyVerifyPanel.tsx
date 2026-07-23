"use client";
// FILE: components/verify/RelyingPartyVerifyPanel.tsx
// Live tester for POST /api/credentials/verify. partner integration demos.

import { useState, type CSSProperties } from "react";
import type { VerificationResult } from "@/lib/credentials/types";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const CLAIM_OPTIONS = [
  "identity_verified",
  "government_id_verified",
  "liveness_passed",
  "wallet_binding_confirmed",
] as const;

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.75rem 0.85rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: MONO,
  fontSize: "0.72rem",
  lineHeight: 1.5,
};

export function RelyingPartyVerifyPanel({ suiAddress }: { suiAddress?: string | null }) {
  const [jwt, setJwt] = useState("");
  const [verifierId, setVerifierId] = useState("demo_relying_party");
  const [requiredClaims, setRequiredClaims] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadBusy, setLoadBusy] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggleClaim(claim: string) {
    setRequiredClaims(prev =>
      prev.includes(claim) ? prev.filter(c => c !== claim) : [...prev, claim],
    );
  }

  async function loadMyCredential() {
    if (!suiAddress) {
      setErr("Sign in on /passport first to load your credential JWT.");
      return;
    }
    setLoadBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/credentials/me?sui=${encodeURIComponent(suiAddress)}`);
      const data = await res.json() as { credential_jwt?: string; verified?: boolean; error?: string };
      if (!res.ok || !data.credential_jwt) {
        throw new Error(data.error ?? "No active credential for this wallet yet.");
      }
      setJwt(data.credential_jwt);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load credential");
    } finally {
      setLoadBusy(false);
    }
  }

  async function runVerify() {
    const trimmed = jwt.trim();
    if (!trimmed) {
      setErr("Paste a credential JWT or load yours from Passport.");
      return;
    }
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/credentials/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential_jwt: trimmed,
          verifier_id: verifierId.trim() || "demo_relying_party",
          required_claims: requiredClaims,
        }),
      });
      const data = await res.json() as VerificationResult;
      setResult(data);
      if (!res.ok && !data.error) {
        setErr("Verification request failed");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <CapabilityStatusBadge status="live" size="xs" />
        <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
          POST /api/credentials/verify
        </span>
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 640,
      }}>
        Relying parties call this server-side with a user&apos;s Abraxas credential JWT.
        This public tester verifies the JWT cryptographically. no partner API key required.
      </p>

      <div style={{ display: "grid", gap: "0.85rem", marginBottom: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Credential JWT
          </span>
          <textarea
            value={jwt}
            onChange={e => setJwt(e.target.value)}
            rows={5}
            placeholder="Paste eyJ… credential JWT from Passport or your backend"
            aria-label="Credential JWT"
            style={{ ...fieldStyle, resize: "vertical", minHeight: 120 }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
              verifier_id
            </span>
            <input
              value={verifierId}
              onChange={e => setVerifierId(e.target.value)}
              placeholder="your_protocol_name"
              style={fieldStyle}
            />
          </label>
        </div>

        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
            required_claims (optional)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {CLAIM_OPTIONS.map(claim => {
              const on = requiredClaims.includes(claim);
              return (
                <button
                  key={claim}
                  type="button"
                  onClick={() => toggleClaim(claim)}
                  style={{
                    padding: "0.35rem 0.65rem", borderRadius: 999, cursor: "pointer",
                    border: `1px solid ${on ? ACCENT : "var(--border)"}`,
                    background: on ? "rgba(16,185,129,0.12)" : "var(--surface-inset)",
                    color: on ? ACCENT : "var(--text-secondary)",
                    fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
                  }}
                >
                  {claim}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <Btn onClick={() => void runVerify()} loading={loading} disabled={!jwt.trim()}>
          Verify credential →
        </Btn>
        {suiAddress && (
          <Btn variant="secondary" onClick={() => void loadMyCredential()} loading={loadBusy}>
            Load my Passport JWT
          </Btn>
        )}
        <Btn href="/api/credentials/public-key" variant="tertiary" size="sm" newTab>
          Public key →
        </Btn>
        <Btn href="/passport" variant="ghost" size="sm">
          Get a credential
        </Btn>
      </div>

      {err && (
        <div style={{ marginBottom: "1rem" }}>
          <StatusBanner tone="error" title="Could not verify">{err}</StatusBanner>
        </div>
      )}

      {result && (
        <div style={{
          borderRadius: 16, overflow: "hidden",
          border: `1px solid ${result.verified ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.35)"}`,
          background: "var(--surface-raised)",
        }}>
          <div style={{
            padding: "0.85rem 1.15rem",
            background: result.verified ? ACCENT : "#DC2626",
            color: result.verified ? "#04130C" : "#fff",
            fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.04em",
          }}>
            {result.verified ? "✓ VERIFIED. gate would open" : "✗ NOT VERIFIED. gate stays closed"}
          </div>

          <div style={{ padding: "1.15rem 1.25rem" }}>
            {result.error && (
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", margin: "0 0 0.85rem", lineHeight: 1.55 }}>
                {result.error}
              </p>
            )}

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.5rem",
              marginBottom: "0.85rem",
            }}>
              {[
                ["Holder", result.sui_address ?? result.holder_address ?? ", "],
                ["Jurisdiction", result.jurisdiction ?? ", "],
                ["Level", result.verification_level ?? ", "],
                ["Expires", result.expires_at ? new Date(result.expires_at).toLocaleDateString() : ", "],
                ["JTI", result.credential_jti ? `${result.credential_jti.slice(0, 28)}…` : ", "],
              ].map(([k, v]) => (
                <div key={k} style={{
                  padding: "0.55rem 0.65rem", borderRadius: 8,
                  background: "var(--surface-inset)", border: "1px solid var(--border)",
                }}>
                  <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-primary)", wordBreak: "break-all" }}>{v}</div>
                </div>
              ))}
            </div>

            {result.permissions && (
              <>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: ACCENT, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Permissions
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.85rem" }}>
                  {Object.entries(result.permissions).map(([k, v]) => (
                    <span key={k} style={{
                      padding: "0.25rem 0.5rem", borderRadius: 999, fontFamily: MONO, fontSize: "0.55rem",
                      background: v ? "rgba(16,185,129,0.12)" : "var(--surface-inset)",
                      color: v ? ACCENT : "var(--text-muted)",
                      border: `1px solid ${v ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                    }}>
                      {k}: {v ? "yes" : "no"}
                    </span>
                  ))}
                </div>
              </>
            )}

            <details style={{ marginTop: "0.5rem" }}>
              <summary style={{
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                color: "var(--text-muted)", cursor: "pointer", listStyle: "none",
              }}>
                Raw JSON response
              </summary>
              <pre style={{
                marginTop: "0.65rem", padding: "0.75rem", borderRadius: 10, overflow: "auto",
                background: "var(--surface-inset)", border: "1px solid var(--border)",
                fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-secondary)", lineHeight: 1.55,
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {!result && !err && (
        <div style={{
          padding: "1rem 1.15rem", borderRadius: 14,
          background: "var(--surface-inset)", border: "1px dashed var(--border-strong)",
          fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6,
        }}>
          <strong style={{ color: "var(--text-primary)" }}>Partner integration tip:</strong>{" "}
          Call this endpoint from your backend only. For registry/asset checks without a user JWT, use{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>GET /api/verify/registry</code>.
        </div>
      )}
    </div>
  );
}
