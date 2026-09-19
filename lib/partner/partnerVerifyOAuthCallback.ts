// FILE: lib/partner/partnerVerifyOAuthCallback.ts
// OAuth callback completion — activate server continuation after browser session.

import { ensureBrowserSessionReady } from "@/lib/auth/ensureBrowserSession";
import { completeGoogleZkLogin } from "@/lib/sui/zklogin/completeLogin";
import { clearLoginInFlight, clearStaleLoginInFlight } from "@/lib/sui/zklogin/loginInFlight";
import { parseIdTokenFromCallbackHash, loadUserSession } from "@/lib/sui/zklogin/session";
import { clearPartnerVerifyResume } from "@/lib/partner/partnerVerifyResume";
import { isRestorablePartnerContinuePath } from "@/lib/partner/partnerFlowContinuation";
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

  const idToken = parseIdTokenFromCallbackHash(callbackHash);
  let session;

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
  clearPartnerVerifyResume();

  const activated = await activatePartnerFlowContinuationFromServer();
  if (activated) {
    logPartnerVerifyAuthEvent("partner_resume_restored", { correlationId });
    return { redirectPath: activated, correlationId };
  }

  return { redirectPath: "/passport?signed_in=1", correlationId };
}

async function activatePartnerFlowContinuationFromServer(): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/partner-verify/resume/activate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = await res.json() as { ok?: boolean; continuePath?: string; issuedReceipt?: boolean };
    if (data.issuedReceipt) return null;
    if (data.ok && typeof data.continuePath === "string" && isRestorablePartnerContinuePath(data.continuePath)) {
      return data.continuePath;
    }
  } catch {
    // Passport shows a single server-backed return action when auto-resume cannot happen.
  }
  return null;
}
