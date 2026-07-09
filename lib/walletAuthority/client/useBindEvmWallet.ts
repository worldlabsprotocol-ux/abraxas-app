"use client";
// FILE: lib/walletAuthority/client/useBindEvmWallet.ts

import { useCallback, useState } from "react";
import {
  bindEvmWalletToPassport,
  type BindEvmWalletOptions,
  type BindEvmWalletResult,
} from "@/lib/walletAuthority/client/bindEvmWallet";

export function useBindEvmWallet(options: BindEvmWalletOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BindEvmWalletResult | null>(null);
  const expectedWalletAddress = options.expectedWalletAddress ?? null;
  const credentials = options.credentials ?? "include";

  const bind = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bound = await bindEvmWalletToPassport({
        expectedWalletAddress,
        credentials,
      });
      setResult(bound);
      return bound;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet bind failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [expectedWalletAddress, credentials]);

  return { bind, loading, error, result, bound: Boolean(result) };
}
