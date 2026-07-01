"use client";
// FILE: components/passport/PassportCredentialBanner.tsx
// Active W3C credential — shown after Veriff approval.

import { useState } from "react";
import type { StoredCredential } from "@/lib/credentials/storage";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

export function PassportCredentialBanner({
  identityStatus,
  via,
  credential,
  isRefreshing,
  isPolling,
  onRefresh,
}: {
  identityStatus: IdentityStampStatus;
  via: string | null;
  credential: StoredCredential | null;
  isRefreshing: boolean;
  isPolling: boolean;
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState<"jwt" | "jti" | null>(null);
  const [verifyOk, setVerifyOk] = useState<boolean | null>(null);

  async function copyJwt() {
    if (!credential?.jwt) return;
    await navigator.clipboard.writeText(credential.jwt);
    setCopied("jwt");
    setTimeout(() => setCopied(null), 2000);
  }

  async function selfVerify() {
    if (!credential?.jwt) return;
    setVerifyOk(null);
    const res = await fetch("/api/credentials/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential_jwt: credential.jwt,
        verifier_id: "passport-self-check",
      }),
    });
    const data = await res.json() as { verified?: boolean };
    setVerifyOk(data.verified === true);
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
              Passport active · W3C credential issued
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Identity verified — portable proof ready
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.65rem", marginBottom: "1rem" }}>
          {[
            { k: "Level", v: credential.level.toUpperCase() },
            { k: "Jurisdiction", v: credential.jurisdiction || "—" },
            { k: "Document", v: credential.document_type?.replace(/_/g, " ") ?? "ID" },
            { k: "Expires", v: new Date(credential.expires_at).toLocaleDateString() },
          ].map(row => (
            <div key={row.k} style={{ background: "var(--surface)", borderRadius: 8, padding: "0.55rem 0.65rem", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{row.k}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>{row.v}</div>
            </div>
          ))}
        </div>

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
          Protocols verify this via <code style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>POST /api/credentials/verify</code> — you present the JWT, not your documents.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" onClick={copyJwt}
            style={{
              padding: "0.55rem 1rem", borderRadius: 999, border: "none",
              background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            }}>
            {copied === "jwt" ? "✓ Copied JWT" : "Copy credential JWT"}
          </button>
          <button type="button" onClick={selfVerify}
            style={{
              padding: "0.55rem 1rem", borderRadius: 999, border: "1px solid var(--border)",
              background: "var(--surface)", color: "var(--text-secondary)",
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
            }}>
            Test verify API
          </button>
          {verifyOk === true && (
            <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: ACCENT, alignSelf: "center", fontWeight: 600 }}>
              ✓ Signature valid
            </span>
          )}
          {verifyOk === false && (
            <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#EF4444", alignSelf: "center" }}>
              Verify failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
