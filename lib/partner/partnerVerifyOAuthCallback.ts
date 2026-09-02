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

  let session = loadUserSession();
  if (!session?.suiAddress) {
    const idToken = parseIdTokenFromCallbackHash(callbackHash);
    if (!idToken) {
      clearLoginInFlight();
      throw new PartnerVerifyOAuthCallbackError(
        "Sign-in could not be completed in this browser. Try again.",
        correlationId,
      );
    }
    session = await completeGoogleZkLogin(idToken, { callbackHash });
    logPartnerVerifyAuthEvent("zklogin_complete", { correlationId });
  } else {
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
