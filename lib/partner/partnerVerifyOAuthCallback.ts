// FILE: lib/partner/partnerVerifyOAuthCallback.ts
// OAuth callback completion for partner verify — browser session before resume consumption.

import { ensureBrowserSessionReady } from "@/lib/auth/ensureBrowserSession";
import { completeGoogleZkLogin } from "@/lib/sui/zklogin/completeLogin";
import { clearLoginInFlight, clearStaleLoginInFlight } from "@/lib/sui/zklogin/loginInFlight";
import { parseIdTokenFromCallbackHash, loadUserSession } from "@/lib/sui/zklogin/session";
import {
  appendPartnerAuthReadyQuery,
  consumePartnerVerifyResumePath,
  peekPartnerVerifyResumePath,
} from "@/lib/partner/partnerVerifyResume";
import {
  createPartnerVerifyCorrelationId,
  logPartnerVerifyAuthEvent,
} from "@/lib/partner/partnerVerifyAuthDebug";

export class PartnerVerifyOAuthCallbackError extends Error {
  readonly correlationId: string;

  constructor(message: string, correlationId: string) {
    super(message);
    this.name = "PartnerVerifyOAuthCallbackError";
    this.correlationId = correlationId;
  }
}

export async function completePartnerVerifyOAuthCallback(
  callbackHash: string,
): Promise<{ redirectPath: string; correlationId: string }> {
  const correlationId = createPartnerVerifyCorrelationId();
  logPartnerVerifyAuthEvent("oauth_callback_received", { correlationId });
  clearStaleLoginInFlight();

  const hasResume = Boolean(peekPartnerVerifyResumePath());

  const idToken = parseIdTokenFromCallbackHash(callbackHash);
  let session;

  // A callback token represents a fresh sign-in attempt and must take
  // precedence over stale local identity state. Completing it also restores
  // the signing material needed to mint the httpOnly browser-session cookie.
  if (idToken) {
    session = await completeGoogleZkLogin(idToken, { callbackHash });
    logPartnerVerifyAuthEvent("zklogin_complete", { correlationId });
  } else {
    session = loadUserSession();
    if (!session?.suiAddress) {
      clearLoginInFlight();
      throw new PartnerVerifyOAuthCallbackError(
        "Sign-in could not be completed in this browser. Try again.",
        correlationId,
      );
    }
    clearLoginInFlight();
  }

  const browserReady = await ensureBrowserSessionReady(session.suiAddress);
  if (!browserReady.ok) {
    clearLoginInFlight();
    throw new PartnerVerifyOAuthCallbackError(
      "We could not establish a secure browser session. Try again.",
      correlationId,
    );
  }
  logPartnerVerifyAuthEvent("browser_session_ready", { correlationId });
  clearLoginInFlight();

  if (hasResume) {
    const resumePath = consumePartnerVerifyResumePath();
    if (resumePath) {
      logPartnerVerifyAuthEvent("partner_resume_restored", { correlationId });
      return {
        redirectPath: appendPartnerAuthReadyQuery(resumePath),
        correlationId,
      };
    }
  }

  return { redirectPath: "/passport?signed_in=1", correlationId };
}
