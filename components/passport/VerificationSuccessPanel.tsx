"use client";
// FILE: components/passport/VerificationSuccessPanel.tsx
// Post-approval success moment — shown once after Veriff completes.

import { Btn } from "@/components/redesign/ui";
import type { StoredCredential } from "@/lib/credentials/storage";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function VerificationSuccessPanel({
  credential,
  onDismiss,
  onBindWallet,
}: {
  credential: StoredCredential | null;
  onDismiss: () => void;
  onBindWallet: () => void;
}) {
  return (
    <div style={{
      marginBottom: "1.5rem", padding: "1.25rem 1.35rem", borderRadius: 16,
      background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.35)",
    }}>
      <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800, color: ACCENT, marginBottom: "0.35rem" }}>
        Identity verified
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 600, margin: "0 0 0.75rem" }}>
        Your Abraxas Passport credential is now active.
      </p>

      <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "0.85rem" }}>
        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>You can now:</div>
        {[
          "Submit an asset for verification",
          "Access partner-gated actions",
          "Bind a wallet for on-chain eligibility",
          "Start entity or investor verification if required",
        ].map(item => (
          <div key={item}>✓ {item}</div>
        ))}
      </div>

      {credential && (
        <div style={{
          padding: "0.55rem 0.65rem", borderRadius: 8, marginBottom: "0.85rem",
          background: "var(--surface-inset)", border: "1px solid var(--border)",
          fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.55,
        }}>
          <div><strong style={{ color: "var(--text-primary)" }}>Issuer:</strong> Veriff · Abraxas-approved</div>
          <div><strong style={{ color: "var(--text-primary)" }}>Status:</strong> Active · Assurance L3</div>
          {credential.expires_at && (
            <div><strong style={{ color: "var(--text-primary)" }}>Expires:</strong> {new Date(credential.expires_at).toLocaleDateString()}</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn size="sm" onClick={onBindWallet}>Bind wallet →</Btn>
        <Btn variant="ghost" size="sm" onClick={onDismiss}>Continue</Btn>
      </div>
    </div>
  );
}
