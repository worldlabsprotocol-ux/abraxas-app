// FILE: lib/auth/holderAuthErrorCopy.ts
// Human-readable holder auth errors (preserve internal codes in logs).

export function describeWalletVerifyRecoveryCode(
  code: string | null | undefined,
  phase?: string,
): string {
  const normalized = (code ?? "").trim().toLowerCase();
  switch (normalized) {
    case "cancelled":
    case "evm_connect_cancelled":
      return "Wallet request cancelled. Choose a wallet or try signing again.";
    case "aborted":
      return "Verification cancelled. You can start again without refreshing this page.";
    case "timeout":
      return "Your wallet did not respond in time. Unlock the extension and try signing again.";
    case "stale":
      return "That attempt expired. Try signing again.";
    case "session_context_mismatch":
      return "This signature no longer matches the active verification attempt. Try signing again without refreshing.";
    case "wrong_origin":
      return "This verification must be completed on the same site that opened the request.";
    case "connect_succeeded_without_public_key":
      return "Phantom connected, but Abraxas did not receive your wallet address in time. Try signing again without refreshing.";
    case "invalid_signature":
    case "verify_failed":
      return "Abraxas could not verify your wallet signature. Try signing again with a fresh approval.";
    case "expired":
    case "replay":
      return "That verification attempt expired. Try signing again to receive a fresh challenge.";
    case "wrong_network":
      return "Your wallet network does not match this verification request. Switch Phantom to Devnet and try again.";
    case "wallet_adapter_not_ready":
    case "wallet_not_listed":
    case "wallet_connect_failed":
    case "wallet_selection_not_committed":
      return "Could not connect your wallet. Unlock the extension and choose Phantom again.";
    case "no_evm_provider":
      return "No EVM wallet extension detected. Install MetaMask or choose Phantom for Solana.";
    default:
      if (phase === "sign") {
        return "Wallet signature was not completed. Approve the message in Phantom or try signing again.";
      }
      if (phase === "verify") {
        return describeHolderAuthErrorCode(code);
      }
      if (phase === "connect") {
        return "Could not connect your wallet. Confirm the extension is unlocked, then try again.";
      }
      if (phase === "challenge") {
        return "Could not start wallet verification. Try signing again.";
      }
      return describeHolderAuthErrorCode(code);
  }
}

export function describeHolderAuthErrorCode(code: string | null | undefined): string {
  const normalized = (code ?? "").trim().toLowerCase();
  switch (normalized) {
    case "session_context_mismatch":
      return "This sign-in attempt expired. Try signing again without refreshing the page.";
    case "cancelled":
    case "aborted":
    case "timeout":
      return "Wallet signing was interrupted. Try again when your wallet extension is unlocked.";
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
