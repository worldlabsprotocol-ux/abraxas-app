"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { PassportPageTabs } from "@/components/passport/PassportPageTabs";
import { PassportReusableCredentialsPanel } from "@/components/passport/PassportReusableCredentialsPanel";
import { PassportRequestInbox } from "@/components/passport/PassportRequestInbox";
import { PassportActivityCenter } from "@/components/passport/PassportActivityCenter";
import { PassportPrivacyCenter } from "@/components/passport/PassportPrivacyCenter";
import { PassportSupportCenter } from "@/components/passport/PassportSupportCenter";
import { PassportSolanaWalletConnection } from "@/components/passport/PassportSolanaWalletConnection";
import { resolvePassportPageView } from "@/lib/passport/passportPrivacyNavigation";

export function PassportSolanaWorkspace({
  holderSubjectId,
  onSignOut,
}: {
  holderSubjectId: string;
  onSignOut: () => Promise<void>;
}) {
  const params = useSearchParams();
  const view = resolvePassportPageView(params.get("view"));
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    void onSignOut().catch(() => setSignOutError(true)).finally(() => setSigningOut(false));
  }

  return (
    <AbxPageShell accent="passport" maxWidth={900} visualAtmosphere="calm">
      <PassportPageTabs active={view} />
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: "0 0 0.4rem", color: "var(--accent)", fontSize: "0.72rem", fontWeight: 700 }}>ABRAXAS PASSPORT</p>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "clamp(1.6rem, 4vw, 2.3rem)" }}>Your Passport</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>You control what leaves.</p>
      </header>
      <section style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <PassportSolanaWalletConnection />
        <button
          type="button"
          disabled={signingOut}
          onClick={signOut}
          style={{ border: "1px solid var(--border)", borderRadius: 10, background: "transparent", color: "var(--text-secondary)", padding: "0.5rem 0.8rem" }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        {signOutError ? <p role="alert">Could not sign out. Try again before leaving this device.</p> : null}
      </section>
      {view === "passport" ? (
        <>
          <PassportRequestInbox />
          <PassportReusableCredentialsPanel sessionReady />
        </>
      ) : view === "requests" ? (
        <PassportRequestInbox showEmpty />
      ) : view === "activity" ? (
        <PassportActivityCenter />
      ) : view === "privacy" ? (
        <PassportPrivacyCenter holderKey={holderSubjectId} />
      ) : view === "support" ? (
        <PassportSupportCenter onSignOut={signOut} />
      ) : (
        <section><h2>My records</h2><p>Your records are tied to this Passport. Complete verification only when a service asks for it.</p><PassportReusableCredentialsPanel sessionReady /></section>
      )}
    </AbxPageShell>
  );
}

