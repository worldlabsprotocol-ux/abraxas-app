"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/authState";
import { ToastProvider } from "@/lib/toastState";
import { SolanaProvider } from "@/components/SolanaProvider";
import { EvmProvider } from "@/components/EvmProvider";
import { SessionProvider } from "@/components/SessionProvider";

/**
 * Provider stack (outer → inner):
 *   1. SessionProvider — NextAuth (Google / GitHub)
 *   2. ToastProvider   — UI notifications
 *   3. EvmProvider     — wagmi + RainbowKit (Ethereum)
 *   4. SolanaProvider  — Solana wallet adapter
 *   5. AuthProvider    — bridges wallet state into useAuth()
 *
 * Solana + EVM live in parallel — neither knows about the other.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <EvmProvider>
          <SolanaProvider>
            <AuthProvider>{children}</AuthProvider>
          </SolanaProvider>
        </EvmProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
