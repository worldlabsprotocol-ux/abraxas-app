"use client";
// FILE: components/home/HomeSandboxAccountAuth.tsx

import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { NativeAccountPasskeyPanel } from "@/components/account/NativeAccountPasskeyPanel";
import { NativeAccountSolanaPanel } from "@/components/account/NativeAccountSolanaPanel";
import {
  SANDBOX_ACCOUNT_PASSKEY_CREATE,
  SANDBOX_ACCOUNT_PASSKEY_SIGN_IN,
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
    <BuilderActiveTask
      taskKey="authorize-workspace"
      title="Connect to continue"
      description={walletOnlyHint ? SANDBOX_WALLET_ONLY_HINT : "Use your Solana wallet to create a test workspace."}
      advanced={
        <details className="abx-builder-technical-panel">
          <summary className="abx-builder-technical-toggle">Use a passkey instead</summary>
          <div className="abx-sandbox-entry__auth-actions">
            <NativeAccountPasskeyPanel mode="register" label={SANDBOX_ACCOUNT_PASSKEY_CREATE} onSuccess={() => void onAccountReady()} />
            <NativeAccountPasskeyPanel mode="authenticate" label={SANDBOX_ACCOUNT_PASSKEY_SIGN_IN} onSuccess={() => void onAccountReady()} />
          </div>
        </details>
      }
    >
      <NativeAccountSolanaPanel hideIntro onSuccess={() => void onAccountReady()} />
    </BuilderActiveTask>
  );
}
