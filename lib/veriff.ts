// FILE: lib/veriff.ts
// Server-side Veriff client. Veriff is a biometric identity verification
// SaaS, REST API, completely chain-agnostic. No blockchain dependency of
// any kind, this was never the source of the earlier EVM dependency
// conflict (that was Privy, a different system, already removed).
//
// HONESTY NOTE: this is built against Veriff's documented v1 session API
// conventions (X-AUTH-CLIENT key header, X-HMAC-SIGNATURE request signing,
// POST /v1/sessions to start, webhook decision callback to finish). Veriff
// does occasionally revise field names between API versions, and this has
// not been tested against a live key since none exists yet. Once you have
// real sandbox credentials, plan for one short adjustment pass if any
// field name has shifted, this is a normal part of any first integration
// with a third-party verification provider, not a sign anything here is
// wrong.
//
// REQUIRED ENV VARS (set in Vercel once you have a Veriff account):
//   VERIFF_API_KEY        public API key, from Veriff dashboard
//   VERIFF_SECRET_KEY     private signing key, never exposed to the client
//   VERIFF_BASE_URL        e.g. https://stationapi.veriff.com (confirm
//                           sandbox vs production URL in your Veriff dashboard)

import crypto from "crypto";

function sign(payload: string): string {
  const secret = process.env.VERIFF_SECRET_KEY;
  if (!secret) throw new Error("VERIFF_SECRET_KEY not set");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export interface VeriffSessionRequest {
  vendorData: string;  // our internal reference, e.g. user email or wallet
  firstName?: string;
  lastName?: string;
  callbackUrl: string; // where Veriff redirects the user after they finish
}

export interface VeriffSessionResult {
  sessionId: string;
  verificationUrl: string;
}

export async function createVeriffSession(
  req: VeriffSessionRequest
): Promise<VeriffSessionResult> {
  const apiKey  = process.env.VERIFF_API_KEY;
  const baseUrl = process.env.VERIFF_BASE_URL ?? "https://stationapi.veriff.com";
  if (!apiKey) throw new Error("VERIFF_API_KEY not set");

  const body = JSON.stringify({
    verification: {
      callback: req.callbackUrl,
      person: {
        firstName: req.firstName ?? "",
        lastName:  req.lastName ?? "",
      },
      vendorData: req.vendorData,
    },
  });

  const signature = sign(body);

  const res = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AUTH-CLIENT": apiKey,
      "X-HMAC-SIGNATURE": signature,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Veriff session creation failed: ${res.status} ${text}`);
  }

  const data = await res.json() as {
    verification: { id: string; url: string };
  };

  return {
    sessionId: data.verification.id,
    verificationUrl: data.verification.url,
  };
}

// Verifies the HMAC signature on an incoming webhook so we know the
// decision payload actually came from Veriff and was not forged.
export function verifyVeriffWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;
  const expected = sign(rawBody);
  // Timing-safe comparison
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface VeriffDecisionPayload {
  vendorData: string;
  status: "approved" | "declined" | "resubmission_requested" | "expired" | "abandoned";
  sessionId: string;
}

// Parses the parts of a Veriff decision webhook we actually use.
// Veriff's full payload includes much more (document data, person data);
// we deliberately read only the verdict and our own reference, per the
// privacy-first design already described on the identity page, we store
// proof of the outcome, not the underlying documents.
export function parseVeriffDecision(payload: unknown): VeriffDecisionPayload | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const verification = p.verification as Record<string, unknown> | undefined;
  if (!verification) return null;
  const decision = verification.decision as Record<string, unknown> | undefined;
  const status = (decision?.status ?? verification.status) as string | undefined;
  const vendorData = verification.vendorData as string | undefined;
  const sessionId = verification.id as string | undefined;
  if (!status || !vendorData || !sessionId) return null;
  return { status: status as VeriffDecisionPayload["status"], vendorData, sessionId };
}
