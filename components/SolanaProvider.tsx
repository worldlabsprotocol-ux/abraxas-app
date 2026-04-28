"use client";

import { type ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { getSolanaRpcUrl } from "@/lib/solanaRpc";

import "@solana/wallet-adapter-react-ui/styles.css";

// Workaround for React 18/19 type conflict with Solana wallet adapter.
// Cast providers to any to bypass the FC<> JSX incompatibility.
const Connection = ConnectionProvider as any;
const Wallet = WalletProvider as any;
const WalletModal = WalletModalProvider as any;

interface Props {
  children: ReactNode;
}

export function SolanaProvider({ children }: Props) {
  const endpoint = useMemo(() => getSolanaRpcUrl(), []);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <Connection endpoint={endpoint}>
      <Wallet wallets={wallets} autoConnect>
        <WalletModal>{children}</WalletModal>
      </Wallet>
    </Connection>
  );
}