// FILE: lib/providers.tsx
// Provider stack — minimal and intentional.
// Every provider here has a documented reason.
//
// REMOVED: SessionProvider (next-auth) — OAuth login not in use.
//           If you re-enable Google/GitHub login, add it back.
//
// Stack (outer → inner):
//   ToastProvider  — UI notifications, no external deps
//   EvmProvider    — wagmi + RainbowKit, Ethereum mainnet only
//   SolanaProvider — Solana wallet adapter, Phantom + Solflare
//   AuthProvider   — bridges Solana wallet state into useAuth()
//
// ETH and Solana stacks are fully isolated — neither imports the other.
// Jupiter (Solana swaps) is an isolated optional module, not wired here.

"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/authState";
import { ToastProvider } from "@/lib/toastState";
import { SolanaProvider } from "@/components/SolanaProvider";
import { EvmProvider } from "@/components/EvmProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <EvmProvider>
        <SolanaProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SolanaProvider>
      </EvmProvider>
    </ToastProvider>
  );
}