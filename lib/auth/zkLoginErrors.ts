// FILE: lib/auth/zkLoginErrors.ts
// Actionable zkLogin / Passport sign-in errors for end users.

import { decodeJwt } from "@mysten/sui/zklogin";
import { loadUserSession } from "@/lib/sui/zklogin/session";

export function emailFromIdToken(idToken: string): string | null {
  try {
    const decoded = decodeJwt(idToken) as Record<string, unknown>;
    return typeof decoded.email === "string" ? decoded.email : null;
  } catch {
    return null;
  }
}

/** Before completing OAuth — detect account mismatch vs existing Abraxas session. */
export function assertZkLoginAccountAllowed(idToken: string): void {
  const incomingEmail = emailFromIdToken(idToken);
  const existing = loadUserSession();
  if (!existing?.email || !incomingEmail) return;
  if (existing.email.toLowerCase() === incomingEmail.toLowerCase()) return;

  throw new Error(
    `This browser is already signed into Abraxas as ${existing.email}, but Google returned ${incomingEmail}. ` +
    "Use Sign out in the top right, then sign in with the Google account you want.",
  );
}

export function mapZkLoginCompletionError(err: unknown, idToken?: string | null): string {
  const raw = err instanceof Error ? err.message : "Sign-in failed";
  const googleEmail = idToken ? emailFromIdToken(idToken) : null;
  const existing = loadUserSession();

  if (/login session expired/i.test(raw) || /pending/i.test(raw)) {
    if (existing?.email) {
      return (
        `Sign-in did not finish in this tab. This browser may still be connected as ${existing.email}. ` +
        "Open Passport, use Sign out in the top right if you need a different Google account, then try again in the same tab."
      );
    }
    if (googleEmail) {
      return (
        `Sign-in timed out before Abraxas could link ${googleEmail}. ` +
        "Start again from Passport and complete Google sign-in without switching tabs."
      );
    }
    return "Sign-in timed out. Start again from Passport and finish Google in the same browser tab.";
  }

  if (/address derivation mismatch/i.test(raw)) {
    return "We could not verify your wallet address. Contact support if this persists.";
  }

  if (/missing subject/i.test(raw)) {
    return "Google did not return a valid account. Try a different Google account or browser.";
  }

  return raw;
}
