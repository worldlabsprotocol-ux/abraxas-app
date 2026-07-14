"use client";
// FILE: lib/walletAuthority/client/mapEvmBindError.ts
// Plain-language errors for wallet bind — never show minified stack traces.

export function mapEvmBindError(message: string): string {
  if (/isAddress.*is not a function/i.test(message) || /is not a function/i.test(message)) {
    return "Wallet connection hit a server error. Your Sui wallet still works — try again after the next deploy, or use WalletConnect.";
  }
  if (/sign in required|session/i.test(message)) {
    return message;
  }
  if (/No injected wallet/i.test(message)) {
    return "No MetaMask in this browser. Open this page in MetaMask's browser, or use WalletConnect.";
  }
  return message;
}
