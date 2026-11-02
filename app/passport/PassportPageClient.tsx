"use client";

import { Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { PassportSolanaWalletConnection } from "@/components/passport/PassportSolanaWalletConnection";
import { PassportSolanaSignInButton } from "@/components/passport/PassportSolanaSignInButton";
import { PassportSolanaWorkspace } from "@/components/passport/PassportSolanaWorkspace";
import { PartnerVerificationResumeCta } from "@/components/passport/PartnerVerificationResumeCta";
import { AccountAccessFirstPaint } from "@/components/product/AccountAccessFirstPaint";
import { Btn } from "@/components/redesign/ui";
import { useSolanaPassportSession } from "@/lib/passport/useSolanaPassportSession";

export function PassportPageClient() {
  return (
    <Suspense fallback={<AccountAccessFirstPaint />}>
      <PassportSessionRouter />
    </Suspense>
  );
}

function PassportSessionRouter() {
  const { connected } = useWallet();
  const { state, refresh } = useSolanaPassportSession();

  if (state.kind === "loading") return <AccountAccessFirstPaint />;
  if (state.kind === "unavailable") return (
    <AbxPageShell accent="passport" maxWidth={640}>
      <h1>Passport is temporarily unavailable</h1>
      <p>Your wallet and records are unchanged. Try again when the session service is available.</p>
      <Btn onClick={() => void refresh()}>Try again</Btn>
    </AbxPageShell>
  );
  if (state.kind === "authenticated") return (
    <PassportSolanaWorkspace
      key={state.holderSubjectId}
      holderSubjectId={state.holderSubjectId}
      onSignOut={async () => {
        const response = await fetch("/api/auth/browser-session", { method: "DELETE", credentials: "include" });
        if (!response.ok) throw new Error("sign_out_failed");
        await refresh();
      }}
    />
  );

  return (
    <AbxPageShell accent="passport" maxWidth={640} visualAtmosphere="calm">
      <p style={{ color: "var(--accent)", fontSize: "0.72rem", fontWeight: 700 }}>ABRAXAS PASSPORT</p>
      <h1>Your wallet. Your Passport.</h1>
      <p>Connect your Solana wallet to open your Passport and control what you share.</p>
      {state.kind === "reconnect" ? (
        <p role="status">Connect the wallet that opened this Passport, or sign in with a different wallet to open its own Passport.</p>
      ) : null}
      <PassportSolanaWalletConnection />
      {connected ? <PassportSolanaSignInButton onSuccess={() => void refresh()} label="Open my Passport" /> : null}
      <PartnerVerificationResumeCta />
    </AbxPageShell>
  );
}

