// FILE: app/api/idv/webhook/route.ts
// Receives Veriff's decision after a user completes their ID verification.
// When approved → issues the Abraxas credential automatically.
// This is the bridge between "real IDV" and "trusted credential".
//
// Veriff calls this URL after every decision (approved/declined/resubmission_requested).
// Must be registered in Veriff dashboard → Webhooks.

import { NextRequest, NextResponse } from "next/server";
import { createHmac }               from "crypto";
import { createClient }             from "@supabase/supabase-js";
import { SignJWT, importJWK }       from "jose";
import { randomUUID }               from "crypto";

const VERIFF_SECRET = process.env.VERIFF_SECRET         ?? "";
const ISSUER        = process.env.ABRAXAS_ISSUER_URL    ?? "https://abraxas-app.vercel.app";
const SB_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_SERVICE    = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const TTL_MS        = 365 * 24 * 60 * 60 * 1000;

// Veriff signs webhooks with HMAC-SHA256 — verify to prevent spoofing
function verifySignature(payload: string, sig: string): boolean {
  if (!VERIFF_SECRET) return true; // skip in dev
  const expected = createHmac("sha256", VERIFF_SECRET)
    .update(payload)
    .digest("hex");
  return expected === sig;
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const sig      = req.headers.get("x-hmac-signature") ?? "";

  if (!verifySignature(rawBody, sig)) {
    console.error("[webhook] Invalid Veriff signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    action?:       string;  // "decision"
    verification?: {
      id:          string;
      status:      string;  // "approved" | "declined" | "resubmission_requested"
      vendorData?: string;  // "wallet:<address>" — we set this on session creation
      person?: {
        firstName?: string;
        lastName?:  string;
        nationality?: string;
      };
      document?: {
        type?:    string;
        country?: string;
        state?:   string;
      };
    };
  };

  const v = event.verification;
  if (!v) return NextResponse.json({ ok: true }); // ignore non-verification events

  // Extract Sui holder from vendorData (sui:0x... or legacy wallet:...)
  const suiMatch = v.vendorData?.match(/^sui:(.+)$/);
  const legacyMatch = v.vendorData?.match(/^wallet:(.+)$/);
  const holder = suiMatch?.[1] ?? legacyMatch?.[1];

  if (!holder) {
    console.error("[webhook] No holder in vendorData:", v.vendorData);
    return NextResponse.json({ ok: true });
  }

  const sb = SB_URL && SB_SERVICE
    ? createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })
    : null;

  if (v.status === "declined" || v.status === "resubmission_requested") {
    // Update verification record
    if (sb) {
      await sb.from("identity_verifications")
        .update({ status: v.status === "declined" ? "revoked" : "pending", updated_at: new Date().toISOString() })
        .eq("wallet_address", holder);
    }
    return NextResponse.json({ ok: true });
  }

  if (v.status !== "approved") {
    return NextResponse.json({ ok: true }); // ignore other statuses
  }

  // ── APPROVED ── Issue the Abraxas credential ─────────────────────
  const signingKeyJson = process.env.ABRAXAS_SIGNING_KEY;
  if (!signingKeyJson) {
    console.error("[webhook] ABRAXAS_SIGNING_KEY not configured");
    return NextResponse.json({ error: "Signing key not configured" }, { status: 500 });
  }

  const signingKey = await importJWK(JSON.parse(signingKeyJson), "EdDSA");
  const now        = new Date();
  const expiresAt  = new Date(now.getTime() + TTL_MS);
  const jti        = `urn:uuid:${randomUUID()}`;

  const country = v.document?.country ?? "US";
  const state   = v.document?.state   ?? "";
  const juris   = state ? `${country.toUpperCase()}-${state.toUpperCase()}` : country.toUpperCase();
  const docType = (v.document?.type ?? "passport").toLowerCase()
    .replace(" ", "_") as "passport" | "drivers_license" | "mobile_dl" | "national_id";

  const claims = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type:           ["VerifiableCredential", "AbraxasIdentityCredential"],
    issuer:         ISSUER,
    issuanceDate:   now.toISOString(),
    expirationDate: expiresAt.toISOString(),
    id:             jti,
    credentialSubject: {
      id:                 `did:sui:${holder}`,
      sui_address:        holder,
      jurisdiction:       juris,
      document_type:      docType,
      verification_level: "standard" as const,
      world_id_verified:  false,
      verified_at:        now.toISOString(),
      chain:              "sui" as const,
      veriff_session_id:  v.id,
      permissions: {
        fiat_offramp: true,
        defi_access:  true,
        rwa_tokenize: true,
        cross_border: true,
      },
    },
  };

  const jwt = await new SignJWT({ vc: claims })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setJti(jti)
    .setIssuer(ISSUER)
    .setSubject(`did:sui:${holder}`)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(signingKey);

  if (sb) {
    // Update identity_verification to approved
    await sb.from("identity_verifications").upsert({
      wallet_address:    holder,
      sui_address:       holder,
      document_type:     docType,
      document_country:  country.toUpperCase(),
      document_state:    state.toUpperCase() || null,
      document_verified: true,
      liveness_passed:   true,
      liveness_provider: "veriff",
      status:            "approved",
      credential_jti:    jti,
      updated_at:        now.toISOString(),
    }, { onConflict: "wallet_address" });

    // Store credential
    await sb.from("abraxas_credentials").insert({
      jti,
      holder_wallet:      holder,
      sui_address:        holder,
      jurisdiction:       juris,
      document_type:      docType,
      verification_level: "standard",
      world_id_verified:  false,
      issuance_date:      now.toISOString(),
      expiration_date:    expiresAt.toISOString(),
      credential_jwt:     jwt,
    });
  }

  console.log(`[webhook] ✓ Credential issued for ${holder} → ${jti}`);
  return NextResponse.json({ ok: true, jti });
}
