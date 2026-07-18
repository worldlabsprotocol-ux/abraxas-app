"use client";
// FILE: components/home/HomeSignedInModule.tsx
// Signed-in product preview — reads canonical state, no tier jargon.

import Link from "next/link";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { usePassportCanonicalState } from "@/lib/hooks/usePassportCanonicalState";
import { buildTrustStatusLine } from "@/lib/passport/passportCanonicalState";
import { profileInitial, profileNavLabel, useUserProfile } from "@/lib/hooks/useUserProfile";
import { resolveIdentityUiState } from "@/lib/passport/identityUiState";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "var(--accent)";

export function HomeSignedInModule() {
  const { suiAddress, isAuthenticated, session } = useSuiAuth();
  const email = session?.email ?? null;
  const { data: profile } = useUserProfile();
  const { setup, identityStatus, credential, idvProvider, via } = usePassportVerification(suiAddress, email);

  const hasCredential = Boolean(credential) && identityStatus === "earned";
  const identityUi = resolveIdentityUiState({
    identityStatus,
    hasCredential,
    idvProvider,
    via,
  });

  const { state: canonical } = usePassportCanonicalState({
    suiAddress,
    identityUi,
    credentialExpiresAt: credential?.expires_at,
    idvProvider,
  });

  if (!isAuthenticated || !suiAddress) return null;

  const label = profileNavLabel(profile, email);
  const initial = profileInitial(profile, email);
  const avatarColor = profile?.avatar_color ?? ACCENT;
  const statusLine = canonical ? buildTrustStatusLine(canonical) : "Passport active";

  return (
    <section style={{
      marginBottom: "2rem",
      padding: "1.15rem 1.25rem",
      borderRadius: 18,
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: "1rem",
      alignItems: "center",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 999,
        background: `${avatarColor}33`, border: `2px solid ${avatarColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800, color: avatarColor,
      }} aria-hidden>
        {initial}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.15rem" }}>
          {label}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {statusLine}
        </div>
        <Link href="/passport?tab=wallets" style={{
          fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: ACCENT,
          textDecoration: "none", marginTop: "0.25rem", display: "inline-block",
        }}>
          {canonical?.wallets.hasActiveBinding ? "Manage wallets" : "Add wallet"} →
        </Link>
      </div>

      <Btn href="/passport" size="sm">Open Passport →</Btn>
    </section>
  );
}
