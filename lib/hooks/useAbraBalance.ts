// FILE: lib/hooks/useAbraBalance.ts
// Real SPL token balance for $ABRA on Solana mainnet.
// Returns 0 when wallet not connected — NO fake demo balance ever shown.
import { useEffect, useState }     from "react";
import { useConnection }           from "@solana/wallet-adapter-react";
import { useWallet }               from "@solana/wallet-adapter-react";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey }               from "@solana/web3.js";

const ABRA_MINT    = new PublicKey("5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS");
export const ABRA_MIN_FEE = 110; // minimum fee in ABRA across all asset classes

export function useAbraBalance() {
  const { connection }          = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance]   = useState(0);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    // Not connected — always 0, never a fake number
    if (!connected || !publicKey) {
      setBalance(0);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      setLoading(true);
      try {
        const ata = getAssociatedTokenAddressSync(ABRA_MINT, publicKey!);
        const acct = await getAccount(connection, ata);
        if (!cancelled) {
          // Token-2022 uses raw amounts — divide by 10^6 for ABRA decimals
          setBalance(Number(acct.amount) / 1_000_000);
        }
      } catch {
        // No token account = 0 balance, not an error
        if (!cancelled) setBalance(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBalance();

    // Refresh every 30 seconds while connected
    const iv = setInterval(fetchBalance, 30_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [connected, publicKey, connection]);

  return { balance, loading };
}