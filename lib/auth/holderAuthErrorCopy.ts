// FILE: lib/auth/holderAuthErrorCopy.ts
// Human-readable holder auth errors (preserve internal codes in logs).

export function describeHolderAuthErrorCode(code: string | null | undefined): string {
  const normalized = (code ?? "").trim().toLowerCase();
  switch (normalized) {
    case "chain_neutral_schema_unavailable":
      return "Chain-neutral account storage is not available in this environment. Use Continue securely or try again later.";
    case "no_evm_provider":
      return "No EVM wallet extension detected. Install a wallet extension or use Continue securely.";
    case "challenge_failed":
    case "verify_failed":
      return "Wallet sign-in could not be verified. Try again or use Continue securely.";
    case "evm_sign_in_failed":
      return "EVM wallet sign-in failed. Try again or use Continue securely.";
    default:
      if (!normalized) return "Sign-in failed. Try again or use Continue securely.";
      if (normalized.includes("solana")) return "Solana wallet sign-in failed. Connect a wallet extension first.";
      return "Sign-in failed. Try again or use Continue securely.";
  }
}
