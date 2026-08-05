// FILE: lib/credentials/verifyJwt.ts
// Shared JWT verification for credential routes.

import { jwtVerify, importJWK } from "jose";
import { createClient } from "@supabase/supabase-js";
import type { VerificationResult } from "@/lib/credentials/types";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { trustedAbraxasCredentialIssuers } from "@/lib/credentials/abraxasIssuer";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function verifyCredentialJwt(
  credentialJwt: string,
  verifierId = "unknown",
  requiredClaims: string[] = [],
  logPresentation = true,
): Promise<VerificationResult> {
  if (!credentialJwt) {
    return { verified: false, error: "credential_jwt required" };
  }

  const pubKeyJson = process.env.ABRAXAS_PUBLIC_KEY;
  if (!pubKeyJson) {
    return { verified: false, error: "ABRAXAS_PUBLIC_KEY not configured" };
  }

  let publicKey;
  try {
    publicKey = await importJWK(JSON.parse(pubKeyJson), "EdDSA");
  } catch {
    return { verified: false, error: "Invalid public key configuration" };
  }

  let payload;
  try {
    const result = await jwtVerify(credentialJwt, publicKey, {
      issuer: trustedAbraxasCredentialIssuers(),
    });
    payload = result.payload;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "JWT verification failed";
    return { verified: false, error: msg };
  }

  const jti = payload.jti as string;
  const vc = (payload as Record<string, unknown>).vc as Record<string, unknown> | undefined;
  const sub = vc?.credentialSubject as Record<string, unknown> | undefined;

  if (!jti || !sub) {
    return { verified: false, error: "Malformed credential" };
  }

  const holderAddr = (sub.sui_address ?? sub.wallet) as string;

  if (requiredClaims.length > 0 && holderAddr) {
    const activeClaims = await getActiveClaims(normalizeSuiAddress(holderAddr));
    const activeTypes = new Set(activeClaims.map(c => c.claim_type));
    const missing = requiredClaims.filter(c => !activeTypes.has(c as typeof activeClaims[number]["claim_type"]));
    if (missing.length > 0) {
      if (logPresentation && SB_URL && SB_KEY) {
        const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
        await sb.from("credential_presentations").insert({
          credential_jti: jti,
          verifier_id: verifierId,
          claims_disclosed: requiredClaims,
          accepted: false,
          rejection_reason: `Missing claims: ${missing.join(", ")}`,
        });
      }
      return {
        verified: false,
        error: `Missing required claims: ${missing.join(", ")}`,
        credential_jti: jti,
        holder_address: holderAddr,
        sui_address: holderAddr,
      };
    }
  }

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { data } = await sb
      .from("abraxas_credentials")
      .select("jti, revoked_at, expiration_date")
      .eq("jti", jti)
      .single();

    if (!data) {
      return { verified: false, error: "Credential not found in registry" };
    }
    if (data.revoked_at) {
      return { verified: false, error: "Credential has been revoked" };
    }
    if (new Date(data.expiration_date) < new Date()) {
      return { verified: false, error: "Credential expired" };
    }

    if (logPresentation) {
      await sb.from("credential_presentations").insert({
        credential_jti: jti,
        verifier_id: verifierId,
        claims_disclosed: requiredClaims.length
          ? requiredClaims
          : ["jurisdiction", "verification_level", "world_id_verified"],
        accepted: true,
      });
    }
  }

  const permissions = sub.permissions as Record<string, boolean> | undefined;
  return {
    verified: true,
    credential_jti: jti,
    holder_address: (sub.sui_address ?? sub.wallet) as string,
    sui_address: (sub.sui_address ?? sub.wallet) as string,
    holder_wallet: (sub.sui_address ?? sub.wallet) as string,
    jurisdiction: sub.jurisdiction as string,
    verification_level: sub.verification_level as "basic" | "standard" | "enhanced",
    world_id_verified: sub.world_id_verified as boolean,
    permissions: {
      fiat_offramp: permissions?.fiat_offramp ?? false,
      defi_access: permissions?.defi_access ?? false,
      rwa_tokenize: permissions?.rwa_tokenize ?? false,
      cross_border: permissions?.cross_border ?? false,
    },
    expires_at: vc?.expirationDate as string | undefined,
  };
}
