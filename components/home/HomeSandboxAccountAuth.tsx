"use client";
// FILE: components/home/HomeSandboxAccountAuth.tsx

import { NativeAccountPasskeyPanel } from "@/components/account/NativeAccountPasskeyPanel";
import { NativeAccountSolanaPanel } from "@/components/account/NativeAccountSolanaPanel";
import {
  SANDBOX_ACCOUNT_PASSKEY_CREATE,
  SANDBOX_ACCOUNT_PASSKEY_SIGN_IN,
  SANDBOX_ACCOUNT_STEP_LEAD,
  SANDBOX_WALLET_ONLY_HINT,
} from "@/lib/home/sandboxOnboardingCopy";

export function HomeSandboxAccountAuth({
  onAccountReady,
  walletOnlyHint,
}: {
  onAccountReady: () => void | Promise<void>;
  walletOnlyHint?: boolean;
}) {
  return (
    <div className="abx-sandbox-entry__auth">
      <p className="abx-sandbox-entry__auth-lead">{SANDBOX_ACCOUNT_STEP_LEAD}</p>
      {walletOnlyHint ? <p className="abx-sandbox-entry__auth-hint">{SANDBOX_WALLET_ONLY_HINT}</p> : null}
      <div className="abx-sandbox-entry__auth-actions">
        <NativeAccountPasskeyPanel
          mode="register"
          label={SANDBOX_ACCOUNT_PASSKEY_CREATE}
          onSuccess={() => void onAccountReady()}
        />
        <NativeAccountPasskeyPanel
          mode="authenticate"
          label={SANDBOX_ACCOUNT_PASSKEY_SIGN_IN}
          onSuccess={() => void onAccountReady()}
        />
      </div>
      <div className="abx-sandbox-entry__auth-wallet">
        <p className="abx-sandbox-entry__alt">Or sign in with Solana wallet account:</p>
        <NativeAccountSolanaPanel onSuccess={() => void onAccountReady()} />
      </div>
    </div>
  );
}
