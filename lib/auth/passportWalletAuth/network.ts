// FILE: lib/auth/passportWalletAuth/network.ts

const ALLOWED_SUI_NETWORK_PREFIXES = ["sui:mainnet", "sui:testnet", "sui:devnet", "sui:localnet"] as const;

export function normalizeSuiNetworkLabel(chain: string): string {
  const trimmed = chain.trim();
  if (!trimmed.startsWith("sui:")) {
    throw new Error("invalid_sui_network");
  }
  return trimmed;
}

export function isSupportedSuiNetwork(chain: string): boolean {
  try {
    const normalized = normalizeSuiNetworkLabel(chain);
    return ALLOWED_SUI_NETWORK_PREFIXES.some((p) => normalized === p || normalized.startsWith(`${p}`));
  } catch {
    return false;
  }
}

export function resolveExpectedSuiNetworkFromEnv(): string {
  const raw = process.env.NEXT_PUBLIC_SUI_NETWORK?.trim() ?? "sui:devnet";
  return normalizeSuiNetworkLabel(raw.startsWith("sui:") ? raw : `sui:${raw}`);
}
