// FILE: lib/auth/ephemeralWallet/clientSession.ts
// Browser session probe for ephemeral wallet auth (shared by nav and workspace).

export type EphemeralWalletClientSession = {
  authenticated: boolean;
  walletAddress: string | null;
  sessionId: string | null;
  expiresAt: string | null;
};

export const EPHEMERAL_WALLET_SESSION_EVENT = "abraxas:wallet-session" as const;
export const WALLET_SIGN_IN_DIALOG_EVENT = "abraxas:wallet-sign-in-dialog" as const;

export type WalletSignInDialogDetail = { open: boolean };

export function notifyWalletSignInDialogChanged(open: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WalletSignInDialogDetail>(WALLET_SIGN_IN_DIALOG_EVENT, { detail: { open } }),
  );
}

export function notifyEphemeralWalletSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EPHEMERAL_WALLET_SESSION_EVENT));
  window.dispatchEvent(new Event("abraxas:native-account-session"));
}

export async function fetchEphemeralWalletClientSession(): Promise<EphemeralWalletClientSession> {
  const res = await fetch("/api/auth/wallet/session", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    return { authenticated: false, walletAddress: null, sessionId: null, expiresAt: null };
  }
  const body = (await res.json()) as {
    authenticated?: boolean;
    wallet_address?: string;
    session_id?: string;
    expires_at?: string;
  };
  return {
    authenticated: Boolean(body.authenticated),
    walletAddress: body.wallet_address ?? null,
    sessionId: body.session_id ?? null,
    expiresAt: body.expires_at ?? null,
  };
}
