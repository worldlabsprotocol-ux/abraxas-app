"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authState";
import { Button } from "@/components/Button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

interface WalletGateProps {
  children: React.ReactNode;
  /** When true, requires a real Solana wallet (default).
   *  When false, OAuth login alone is enough to see the page. */
  requireWallet?: boolean;
}

/**
 * Gates pages by login status.
 *
 * - Always requires `loggedIn` (NextAuth session OR connected wallet).
 * - When `requireWallet` is true (the default), additionally requires a
 *   connected Solana wallet — used for asset actions.
 * - When `requireWallet={false}`, OAuth-only access is allowed — used for
 *   the dashboard so users can see balances/positions without forcing a
 *   wallet connect just to look around.
 */
export function WalletGate({ children, requireWallet = true }: WalletGateProps) {
  const { loggedIn, walletConnected } = useAuth();
  const router = useRouter();

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="font-display font-bold text-xl mb-2">
          Sign in to continue
        </h2>
        <p className="text-sm text-abraxas-muted mb-6 max-w-xs">
          You need an account to access this page.
        </p>
        <Button onClick={() => router.push("/login")}>Sign In</Button>
      </div>
    );
  }

  if (requireWallet && !walletConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="text-4xl mb-4">⬡</div>
        <h2 className="font-display font-bold text-xl mb-2">
          Connect your wallet
        </h2>
        <p className="text-sm text-abraxas-muted mb-6 max-w-xs">
          A Solana wallet is required for asset actions, vault deposits, and
          using capital.
        </p>
        <ConnectWalletButton size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
