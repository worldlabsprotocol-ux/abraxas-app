"use client";
// FILE: components/passport/PassportCredentialBanner.tsx
// Active W3C credential — auto-verified after Veriff approval (no manual JWT paste).

import { useState } from "react";
import type { StoredCredential } from "@/lib/credentials/storage";
import type {
  CredentialVerifyState,
  IdentityStampStatus,
  OnChainPassportStatus,
} from "@/lib/hooks/usePassportVerification";
import type { VerificationResult } from "@/lib/credentials/types";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

const PERMISSION_LABELS: Record<string, string> = {
  fiat_offramp: "Fiat off-ramp",
  defi_access: "DeFi access",
  rwa_tokenize: "RWA tokenize",
  cross_border: "Cross-border",
};

export function PassportCredentialBanner({
  identityStatus,
  via,
  credential,
  verifyState,
  verifyResult,
  onChain,
  isRefreshing,
  isPolling,
  onRefresh,
}: {
  identityStatus: IdentityStampStatus;
  via: string | null;
  credential: StoredCredential | null;
  verifyState: CredentialVerifyState;
  verifyResult: VerificationResult | null;
  onChain: OnChainPassportStatus | null;
  isRefreshing: boolean;
  isPolling: boolean;
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function copyJwt() {
    if (!credential?.jwt) return;
    await navigator.clipboard.writeText(credential.jwt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (identityStatus === "pending" || isPolling) {
    return (
      <div style={{
        borderRadius: 14, padding: "1.1rem 1.25rem", marginBottom: "1.5rem",
        border: `1px solid ${AMBER}44`, background: `${AMBER}10`,
      }}>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: AMBER, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
          Veriff Precheck in review
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
          Your documents are being reviewed{via ? ` (${via})` : ""}. This page updates automatically — usually under 5 minutes.
        </p>
        <button type="button" onClick={onRefresh} disabled={isRefreshing}
          style={{
            padding: "0.45rem 0.9rem", borderRadius: 999, border: `1px solid ${AMBER}55`,
            background: "transparent", color: AMBER, fontFamily: FONT, fontSize: "0.75rem",
            fontWeight: 600, cursor: "pointer", opacity: isRefreshing ? 0.6 : 1,
          }}>
          {isRefreshing ? "Checking…" : "Check status now"}
        </button>
      </div>
    );
  }

  if (identityStatus === "declined") {
    return (
      <div style={{
        borderRadius: 14, padding: "1.1rem 1.25rem", marginBottom: "1.5rem",
        border: "1px solid #EF444444", background: "#EF444410",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "#EF4444", marginBottom: "0.35rem" }}>
          Verification not approved
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Precheck did not pass. Try again or upload your ID for manual review below.
        </p>
      </div>
    );
  }

  if (!credential || identityStatus !== "earned") return null;

  const permissions = verifyResult?.permissions;
  const activePermissions = permissions
    ? Object.entries(permissions).filter(([, v]) => v).map(([k]) => PERMISSION_LABELS[k] ?? k)
    : [];

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden", marginBottom: "1.5rem",
      border: `1px solid ${ACCENT}44`, background: `linear-gradient(145deg, ${ACCENT}12 0%, var(--surface-raised) 60%)`,
    }}>
      <div style={{ padding: "1.25rem 1.35rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{
            width: 28, height: 28, borderRadius: "50%", background: ACCENT, color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
          }}>✓</span>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Passport active · credential issued
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {verifyState === "checking" && "Confirming cryptographic proof…"}
              {verifyState === "valid" && "Identity verified — ready to transact"}
              {verifyState === "invalid" && "Credential issued — verification pending"}
              {verifyState === "idle" && "Identity verified — portable proof ready"}
            </div>
          </div>
        </div>

        {verifyState === "valid" && (
          <div style={{
            background: `${ACCENT}14`, border: `1px solid ${ACCENT}33`, borderRadius: 10,
            padding: "0.75rem 0.9rem", marginBottom: "1rem",
          }}>
            <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
              Auto-verified · signature valid · not revoked
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
              Protocols can trust this wallet without seeing your documents. You don&apos;t need to paste anything — Abraxas verified your credential automatically.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.65rem", marginBottom: "1rem" }}>
          {[
            { k: "Level", v: credential.level.toUpperCase() },
            { k: "Jurisdiction", v: credential.jurisdiction || verifyResult?.jurisdiction || "—" },
            { k: "Document", v: credential.document_type?.replace(/_/g, " ") ?? "ID" },
            { k: "Expires", v: new Date(credential.expires_at).toLocaleDateString() },
          ].map(row => (
            <div key={row.k} style={{ background: "var(--surface)", borderRadius: 8, padding: "0.55rem 0.65rem", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{row.k}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>{row.v}</div>
            </div>
          ))}
        </div>

        {activePermissions.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              Permissions granted
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {activePermissions.map(label => (
                <span key={label} style={{
                  fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600,
                  padding: "0.25rem 0.55rem", borderRadius: 999,
                  color: ACCENT, background: `${ACCENT}14`, border: `1px solid ${ACCENT}44`,
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {onChain?.provisioned && onChain.object_id && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "0.75rem 0.9rem", marginBottom: "0.85rem",
          }}>
            <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              On-chain passport · Sui devnet
            </div>
            <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-secondary)", wordBreak: "break-all", marginBottom: "0.5rem" }}>
              {onChain.object_id}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
              {(onChain.stamp_ids ?? []).map(id => (
                <span key={id} style={{
                  fontFamily: FONT, fontSize: "0.65rem", fontWeight: 600,
                  padding: "0.2rem 0.5rem", borderRadius: 999,
                  color: ACCENT, border: `1px solid ${ACCENT}44`,
                }}>
                  {id}
                </span>
              ))}
            </div>
            {onChain.explorer_object && (
              <a href={onChain.explorer_object} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, textDecoration: "none" }}>
                View on Suiscan ↗
              </a>
            )}
          </div>
        )}

        {onChain && !onChain.provisioned && identityStatus === "earned" && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "0.75rem 0.9rem", marginBottom: "0.85rem",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              {onChain.issuer_configured
                ? "On-chain passport is being provisioned — refresh in a moment."
                : "Off-chain credential is active. On-chain stamps will appear once the sponsor wallet is configured."}
            </div>
          </div>
        )}

        <button type="button" onClick={() => setShowAdvanced(v => !v)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: showAdvanced ? "0.65rem" : 0,
          }}>
          {showAdvanced ? "Hide developer details ▲" : "Developer details ▼"}
        </button>

        {showAdvanced && (
          <>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
              padding: "0.75rem 0.9rem", marginBottom: "0.85rem",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                Credential ID (jti)
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                {credential.jti}
              </div>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.85rem" }}>
              Integrators call <code style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>POST /api/credentials/verify</code> with your presentation JWT.
            </p>
            <button type="button" onClick={copyJwt}
              style={{
                padding: "0.55rem 1rem", borderRadius: 999, border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text-secondary)",
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              }}>
              {copied ? "✓ Copied JWT" : "Copy credential JWT"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
