"use client";
// FILE: components/home/HomeSignedInModule.tsx
// Signed-in homepage — compact launchpad, not full Passport dashboard.

import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { resolvePassportTier, TIER_LABELS, tierCapabilities } from "@/lib/passport/passportTiers";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeSignedInModule() {
  const { suiAddress, isAuthenticated } = useSuiAuth();
  const { walletBindingL3, setup } = usePassportVerification(suiAddress, null);

  if (!isAuthenticated || !suiAddress) return null;

  const tierInput = {
    accountActive: true,
    profileComplete: setup?.profileComplete ?? false,
    walletBound: setup?.walletBound ?? walletBindingL3,
    walletBindingFresh: setup?.walletBound ?? walletBindingL3,
    identityCredentialActive: setup?.identityComplete ?? false,
  };
  const tier = resolvePassportTier(tierInput);
  const availableNow = tier >= 1
    ? [
        "Browse verified assets",
        "Use the Cielo verified-rate pilot",
        "Share wallet-binding proof with approved partner policies",
      ]
    : tierCapabilities(tierInput).filter(c => c.unlocked).map(c => c.label);

  return (
    <section style={{
      marginBottom: "2rem",
      padding: "1.25rem 1.35rem",
      borderRadius: 18,
      background: "rgba(16,185,129,0.06)",
      border: "1px solid rgba(16,185,129,0.28)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.45rem",
      }}>
        Your Passport
      </div>
      <div style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
        {TIER_LABELS[tier]} · {tier >= 1 ? "Active" : "Setup in progress"}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.85rem", maxWidth: 520 }}>
        {tier >= 1
          ? "Your wallet is bound and your Passport is ready for eligible Abraxas applications."
          : "Finish wallet binding to unlock Cielo and other Tier 1 pilots."}
      </p>
      {suiAddress && (
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
          {truncateSuiAddress(suiAddress, 8, 6)}
        </div>
      )}
      {availableNow.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--text-muted)", marginBottom: "0.35rem",
          }}>
            Available now
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {availableNow.map(label => (
              <li key={label} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 4 }}>
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!tierInput.identityCredentialActive && tier >= 1 && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.85rem", lineHeight: 1.55 }}>
          Next unlock: add identity only when a transaction or partner policy requires it.
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport" size="sm">Open Passport →</Btn>
        {tier >= 1 && <Btn href="/cielo/verified-rate" variant="secondary" size="sm">Check Cielo verified rate →</Btn>}
      </div>
    </section>
  );
}
