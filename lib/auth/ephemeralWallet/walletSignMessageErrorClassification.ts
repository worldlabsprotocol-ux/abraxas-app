// FILE: lib/auth/ephemeralWallet/walletSignMessageErrorClassification.ts
// Maps wallet adapter / extension errors to Abraxas sign-in outcomes (no secret logging).

import type { WalletMessageSignFailureCode } from "./walletMessageSignAttempt";

type WalletErrorLike = {
  name?: string;
  message?: string;
  error?: unknown;
};

function readWalletError(error: unknown): { name: string; message: string; nested: unknown } {
  if (error instanceof Error) {
    const walletLike = error as WalletErrorLike;
    return {
      name: walletLike.name ?? "",
      message: walletLike.message ?? "",
      nested: walletLike.error,
    };
  }
  if (error && typeof error === "object") {
    const obj = error as WalletErrorLike;
    return {
      name: typeof obj.name === "string" ? obj.name : "",
      message: typeof obj.message === "string" ? obj.message : String(error),
      nested: obj.error,
    };
  }
  return { name: "", message: String(error ?? ""), nested: undefined };
}

function nestedErrorCode(nested: unknown): number | string | undefined {
  if (!nested || typeof nested !== "object") return undefined;
  const code = (nested as { code?: unknown }).code;
  if (typeof code === "number" || typeof code === "string") return code;
  return undefined;
}

/** True only when the wallet explicitly reports holder rejection / popup dismissal. */
export function isExplicitWalletSignCancellation(error: unknown): boolean {
  const { name, message, nested } = readWalletError(error);
  const code = nestedErrorCode(nested);
  if (code === 4001 || code === "4001") return true;

  if (name === "WalletWindowClosedError") {
    return true;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("user rejected")
    || lower.includes("user denied")
    || lower.includes("request rejected")
    || lower.includes("approval denied")
    || lower.includes("rejected the request")
    || lower.includes("signing was cancelled")
    || lower.includes("signing was canceled")
    || (lower.includes("cancel") && lower.includes("sign"))
  ) {
    return true;
  }

  if (name === "WalletSignMessageError") {
    if (
      lower.includes("reject")
      || lower.includes("cancel")
      || lower.includes("denied")
      || lower.includes("dismiss")
    ) {
      return true;
    }
  }

  return false;
}

export function classifyWalletSignMessageError(error: unknown): WalletMessageSignFailureCode {
  const { name, message } = readWalletError(error);

  if (isExplicitWalletSignCancellation(error)) {
    return "cancelled";
  }

  if (name === "WalletNotReadyError" || message.toLowerCase().includes("not ready")) {
    return "wallet_error";
  }
  if (
    name === "WalletNotConnectedError"
    || name === "WalletDisconnectedError"
    || name === "WalletDisconnectionError"
  ) {
    return "wallet_error";
  }
  if (name === "WalletWindowBlockedError" || message.toLowerCase().includes("popup")) {
    return "wallet_error";
  }
  if (name === "WalletTimeoutError") {
    return "timeout";
  }

  return "wallet_error";
}

export function walletSignFailureDetail(error: unknown): string | undefined {
  const { name, message } = readWalletError(error);
  const trimmed = message.trim();
  if (!trimmed) {
    if (name === "WalletNotConnectedError" || name === "WalletDisconnectedError") {
      return "Wallet disconnected before signing finished. Reconnect and try again.";
    }
    if (name === "WalletNotReadyError") {
      return "Wallet is not ready. Unlock the extension and try again.";
    }
    return undefined;
  }
  if (trimmed.length > 240) return `${trimmed.slice(0, 237)}…`;
  return trimmed;
}
