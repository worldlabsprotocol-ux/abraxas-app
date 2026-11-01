"use client";

import { PassportSolanaWalletConnection } from "@/components/passport/PassportSolanaWalletConnection";
import { PassportSolanaSignInButton } from "@/components/passport/PassportSolanaSignInButton";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";

export function HostedSolanaHolderSignIn({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <PassportSolanaWalletConnection />
      <PassportSolanaSignInButton
        intendedAction={HOLDER_AUTH_ACTIONS.partnerVerify}
        onSuccess={onSuccess}
      />
    </div>
  );
}
