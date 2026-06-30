// FILE: app/api/credentials/issue/route.ts
// Issues a signed W3C Verifiable Credential after KYC is complete.
//
// REQUIRED ENV VARS (add to Vercel + .env.local):
//   ABRAXAS_SIGNING_KEY   — Ed25519 private key JWK (JSON string)
//                           Generate once: node scripts/generate-key.js
//   ABRAXAS_ISSUER_URL    — https://abraxas-app.vercel.app (your domain)
//
// POST /api/credentials/issue
// Body: IssueCredentialInput
// Returns: { credential_jwt, credential_jti, expires_at }

import { NextRequest, NextResponse }   from "next/server";
import { SignJWT, importJWK }          from "jose";
import { createClient }                from "@supabase/supabase-js";
import { randomUUID }                  from "crypto";
import type { IssueCredentialInput, AbraxasCredentialClaims } from "@/lib/credentials/types";
import { resolveHolderAddress } from "@/lib/credentials/types";
import { toSuiDid } from "@/lib/sui/identity";

const ISSUER  = process.env.ABRAXAS_ISSUER_URL      ?? "https://abraxas-app.vercel.app";
const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";  // service role — server only
const TTL_MS  = 365 * 24 * 60 * 60 * 1000;  // 1 year

// Determine permissions based on verification inputs
function buildPermissions(input: IssueCredentialInput) {
  const hasWorldId = !!input.world_id_nullifier;
  const hasDoc     = input.liveness_passed;
  return {
    fiat_offramp: hasDoc,
    defi_access:  hasDoc,
    rwa_tokenize: hasDoc && hasWorldId,
    cross_border: hasDoc && hasWorldId,
  };
}

// jurisdiction = country + state e.g. "US-CA"
function buildJurisdiction(country: string, state?: string): string {
  return state ? `${country.toUpperCase()}-${state.toUpperCase()}` : country.toUpperCase();
}

// verification_level based on what was completed
function buildLevel(input: IssueCredentialInput): "basic" | "standard" | "enhanced" {
  if (input.world_id_nullifier && input.liveness_passed) return "enhanced";
  if (input.liveness_passed)                             return "standard";
  return "basic";
}

export async function POST(req: NextRequest) {
  const body: IssueCredentialInput = await req.json().catch(() => null);

  const holderAddress = resolveHolderAddress(body);
  if (!holderAddress || !body?.document_type || !body?.document_country) {
    return NextResponse.json({ error: "sui_address (or wallet_address), document_type, document_country required" }, { status: 400 });
  }

  const signingKeyJson = process.env.ABRAXAS_SIGNING_KEY;
  if (!signingKeyJson) {
    return NextResponse.json({ error: "ABRAXAS_SIGNING_KEY not configured" }, { status: 500 });
  }

  // Load signing key
  let signingKey;
  try {
    signingKey = await importJWK(JSON.parse(signingKeyJson), "EdDSA");
  } catch {
    return NextResponse.json({ error: "Invalid signing key" }, { status: 500 });
  }

  const now        = new Date();
  const expiresAt  = new Date(now.getTime() + TTL_MS);
  const jti        = `urn:uuid:${randomUUID()}`;
  const level      = buildLevel(body);
  const juris      = buildJurisdiction(body.document_country, body.document_state);
  const perms      = buildPermissions(body);

  // Build W3C VC payload
  const claims: AbraxasCredentialClaims = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://abraxas-app.vercel.app/credentials/v1",
    ],
    type:           ["VerifiableCredential", "AbraxasIdentityCredential"],
    issuer:         ISSUER,
    issuanceDate:   now.toISOString(),
    expirationDate: expiresAt.toISOString(),
    id:             jti,
    credentialSubject: {
      id:                 toSuiDid(holderAddress),
      sui_address:        holderAddress,
      jurisdiction:       juris,
      document_type:      body.document_type,
      verification_level: level,
      world_id_verified:  !!body.world_id_nullifier,
      verified_at:        now.toISOString(),
      chain:              "sui",
      permissions:        perms,
    },
  };

  // Sign as JWT
  const jwt = await new SignJWT({ vc: claims })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setJti(jti)
    .setIssuer(ISSUER)
    .setSubject(toSuiDid(holderAddress))
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(signingKey);

  // Persist to Supabase (server-side, uses service role key)
  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

    // Upsert verification record
    await sb.from("identity_verifications").upsert({
      wallet_address:     holderAddress,
      sui_address:        holderAddress,
      world_id_nullifier: body.world_id_nullifier ?? null,
      world_id_verified:  !!body.world_id_nullifier,
      document_type:      body.document_type,
      document_country:   body.document_country.toUpperCase(),
      document_state:     body.document_state?.toUpperCase() ?? null,
      document_verified:  true,
      liveness_passed:    body.liveness_passed,
      liveness_provider:  "internal",
      status:             "approved",
      credential_jti:     jti,
      updated_at:         now.toISOString(),
    }, { onConflict: "wallet_address" });

    await sb.from("abraxas_credentials").insert({
      jti,
      holder_wallet:      holderAddress,
      sui_address:        holderAddress,
      jurisdiction:       juris,
      document_type:      body.document_type,
      verification_level: level,
      world_id_verified:  !!body.world_id_nullifier,
      issuance_date:      now.toISOString(),
      expiration_date:    expiresAt.toISOString(),
      credential_jwt:     jwt,
    });
  }

  return NextResponse.json({
    credential_jti: jti,
    credential_jwt: jwt,
    expires_at:     expiresAt.toISOString(),
    jurisdiction:   juris,
    level,
    permissions:    perms,
    message:        "Abraxas ID issued. Present credential_jwt to any integrated protocol.",
  });
}
