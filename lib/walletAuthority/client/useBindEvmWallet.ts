"use client";
// FILE: lib/walletAuthority/client/useBindEvmWallet.ts

import { useCallback, useEffect, useState } from "react";
import {
  bindEvmWalletToPassport,
  type BindEvmWalletOptions,
  type BindEvmWalletResult,
} from "@/lib/walletAuthority/client/bindEvmWallet";
import type { EvmConnectionMethod } from "@/lib/walletAuthority/client/ethereumProvider";
import {
  resolveEvmConnectionUiStateFromWindow,
  type EvmConnectionUiState,
} from "@/lib/walletAuthority/client/evmConnectionUi";

export function useBindEvmWallet(options: BindEvmWalletOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BindEvmWalletResult | null>(null);
  const [uiState, setUiState] = useState<EvmConnectionUiState>(() =>
    resolveEvmConnectionUiStateFromWindow(),
  );

  const expectedWalletAddress = options.expectedWalletAddress ?? null;
  const credentials = options.credentials ?? "include";
  const chainId = options.chainId;

  useEffect(() => {
    setUiState(resolveEvmConnectionUiStateFromWindow());
  }, []);

  const bindWithMethod = useCallback(async (connectionMethod: EvmConnectionMethod) => {
    setLoading(true);
    setError(null);
    try {
      const bound = await bindEvmWalletToPassport({
        expectedWalletAddress,
        credentials,
        connectionMethod,
        chainId,
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
  }, [expectedWalletAddress, credentials, chainId]);

  const bindInjected = useCallback(
    () => bindWithMethod("injected"),
    [bindWithMethod],
  );

  const bindWalletConnect = useCallback(
    () => bindWithMethod("walletconnect"),
    [bindWithMethod],
  );

  const bind = useCallback(async () => {
    const state = resolveEvmConnectionUiStateFromWindow();
    if (state.showInjected) return bindInjected();
    if (state.showWalletConnect) return bindWalletConnect();
    throw new Error(state.blockedHint ?? "No wallet connection method available in this browser.");
  }, [bindInjected, bindWalletConnect]);

  return {
    bind,
    bindInjected,
    bindWalletConnect,
    loading,
    error,
    result,
    bound: Boolean(result),
    uiState,
  };
}
