// FILE: lib/idv/processVeriffDecision.ts
// Shared Veriff decision handling (webhook + polling fallback).

import { createClient } from "@supabase/supabase-js";
import { SignJWT, importJWK } from "jose";
import { randomUUID } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  veriffApprovedClaims,
  walletBindingClaim,
} from "@/lib/credentials/claimSchema";
import { upsertClaims, revokeSubjectClaims, upsertWalletBinding } from "@/lib/credentials/claimsService";

const ISSUER = process.env.ABRAXAS_ISSUER_URL ?? "https://abraxas-app.vercel.app";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const TTL_MS = 365 * 24 * 60 * 60 * 1000;

export interface VeriffDecisionInput {
  id: string;
  status: string;
  vendorData?: string;
  person?: {
    firstName?: string;
    lastName?: string;
    nationality?: string;
  };
  document?: {
    type?: string;
    country?: string;
    state?: string;
  };
}

export interface ProcessDecisionResult {
  ok: boolean;
  status: "approved" | "pending" | "declined" | "ignored";
  holder?: string;
  jti?: string;
  message?: string;
}

function parseHolder(vendorData?: string): string | null {
  const suiMatch = vendorData?.match(/^sui:(.+)$/);
  const legacyMatch = vendorData?.match(/^wallet:(.+)$/);
  return suiMatch?.[1] ?? legacyMatch?.[1] ?? null;
}

export async function processVeriffDecision(
  v: VeriffDecisionInput,
  holderOverride?: string,
): Promise<ProcessDecisionResult> {
  const holder = parseHolder(v.vendorData) ?? holderOverride ?? null;
  if (!holder) {
    return { ok: true, status: "ignored", message: "No holder in vendorData" };
  }

  const sb = SB_URL && SB_SERVICE
    ? createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })
    : null;

  if (v.status === "declined" || v.status === "resubmission_requested") {
    if (sb) {
      await sb.from("identity_verifications")
        .update({
          status: v.status === "declined" ? "revoked" : "pending",
          veriff_session_id: v.id,
          updated_at: new Date().toISOString(),
        })
        .or(`wallet_address.eq.${holder},sui_address.eq.${holder}`);

      if (v.status === "declined") {
        const normalized = normalizeSuiAddress(holder);
        const { data: existing } = await sb
          .from("abraxas_credentials")
          .select("jti")
          .or(`sui_address.eq.${normalized},holder_wallet.eq.${normalized}`)
          .is("revoked_at", null)
          .maybeSingle();
        await revokeSubjectClaims(normalized, `veriff_declined:${v.id}`, existing?.jti);
      }
    }
    return { ok: true, status: v.status === "declined" ? "declined" : "pending", holder };
  }

  if (v.status !== "approved") {
    return { ok: true, status: "ignored", holder };
  }

  const signingKeyJson = process.env.ABRAXAS_SIGNING_KEY;
  if (!signingKeyJson) {
    return { ok: false, status: "ignored", message: "ABRAXAS_SIGNING_KEY not configured" };
  }

  const signingKey = await importJWK(JSON.parse(signingKeyJson), "EdDSA");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS);
  const jti = `urn:uuid:${randomUUID()}`;

  const country = v.document?.country ?? "US";
  const state = v.document?.state ?? "";
  const juris = state ? `${country.toUpperCase()}-${state.toUpperCase()}` : country.toUpperCase();
  const docType = (v.document?.type ?? "passport").toLowerCase()
    .replace(" ", "_") as "passport" | "drivers_license" | "mobile_dl" | "national_id";

  const claims = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "AbraxasIdentityCredential"],
    issuer: ISSUER,
    issuanceDate: now.toISOString(),
    expirationDate: expiresAt.toISOString(),
    id: jti,
    credentialSubject: {
      id: `did:sui:${holder}`,
      sui_address: holder,
      jurisdiction: juris,
      document_type: docType,
      verification_level: "standard" as const,
      world_id_verified: false,
      verified_at: now.toISOString(),
      chain: "sui" as const,
      veriff_session_id: v.id,
      permissions: {
        fiat_offramp: true,
        defi_access: true,
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
    let userEmail: string | null = null;
    const { data: zkRow } = await sb
      .from("sui_zklogin_identities")
      .select("email")
      .eq("sui_address", holder)
      .maybeSingle();
    if (zkRow?.email) userEmail = zkRow.email;

    await sb.from("identity_verifications").upsert({
      wallet_address: holder,
      sui_address: holder,
      user_email: userEmail,
      document_type: docType,
      document_country: country.toUpperCase(),
      document_state: state.toUpperCase() || null,
      document_verified: true,
      liveness_passed: true,
      liveness_provider: "veriff",
      status: "approved",
      credential_jti: jti,
      veriff_session_id: v.id,
      updated_at: now.toISOString(),
    }, { onConflict: "wallet_address" });

    await sb.from("abraxas_credentials").upsert({
      jti,
      holder_wallet: holder,
      sui_address: holder,
      issuer: ISSUER,
      jurisdiction: juris,
      document_type: docType,
      verification_level: "standard",
      world_id_verified: false,
      issuance_date: now.toISOString(),
      expiration_date: expiresAt.toISOString(),
      credential_jwt: jwt,
    }, { onConflict: "jti" });

    const normalized = normalizeSuiAddress(holder);
    await upsertWalletBinding(normalized, normalized, "zklogin");
    await upsertClaims([
      ...veriffApprovedClaims({
        subjectId: normalized,
        jti,
        jurisdiction: juris,
        documentType: docType,
        veriffSessionId: v.id,
        expiresAt,
      }),
      walletBindingClaim({
        subjectId: normalized,
        walletAddress: normalized,
        bindingMethod: "zklogin",
      }),
    ]);
  }

  try {
    const { isPassportIssuerConfigured, provisionOnChainPassport } = await import("@/lib/sui/passportIssuer");
    if (isPassportIssuerConfigured() && sb) {
      const onChain = await provisionOnChainPassport(holder);
      await sb.from("sui_passport_objects").upsert({
        sui_address: holder,
        object_id: onChain.objectId,
        network: "devnet",
        stamp_bitmask: onChain.stampBitmask,
        create_tx_digest: onChain.createTxDigest ?? null,
        stamps_tx_digest: onChain.stampsTxDigest ?? null,
        provisioned_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "sui_address" });
    }
  } catch (e: unknown) {
    console.error("[veriff] On-chain provision failed:", e);
  }

  return { ok: true, status: "approved", holder, jti };
}
