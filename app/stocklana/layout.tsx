// FILE: app/stocklana/layout.tsx
// Solana wallet context for Stocklana demo routes only.

import "@solana/wallet-adapter-react-ui/styles.css";
import { SolanaProvider } from "@/components/SolanaProvider";

export default function StocklanaLayout({ children }: { children: React.ReactNode }) {
  return <SolanaProvider>{children}</SolanaProvider>;
}
