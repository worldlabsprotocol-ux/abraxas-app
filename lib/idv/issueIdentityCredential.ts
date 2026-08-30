// FILE: lib/idv/issueIdentityCredential.ts
// Canonical, idempotent identity credential issuance after Veriff approval.

import { randomUUID } from "crypto";
import { SignJWT, importJWK } from "jose";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  abraxasCaptureApprovedClaims,
  manualApprovedClaims,
  veriffApprovedClaims,
  walletBindingClaim,
} from "@/lib/credentials/claimSchema";
import { upsertClaims, upsertWalletBinding } from "@/lib/credentials/claimsService";
import { buildProductEligibilityClaimsForIssuance } from "@/lib/idv/buildProductEligibilityClaims";
import { idvSupabase, transitionIdentityVerification } from "./identityVerificationDb";
import { getSuiNetwork } from "@/lib/sui/network";
import type { VeriffDecisionInput } from "./types";
import { resolveAbraxasCredentialIssuer } from "@/lib/credentials/abraxasIssuer";

const TTL_MS = 365 * 24 * 60 * 60 * 1000;

export interface IssueIdentityCredentialResult {
  ok: boolean;
  jti?: string;
  jwt?: string;
  alreadyIssued?: boolean;
  message?: string;
  on_chain?: { ok: boolean; object_id?: string | null; error?: string };
}

export type IdentityIssuanceProvider = "veriff" | "manual" | "abraxas_capture";

export async function issueIdentityCredential(
  holder: string,
  decision: VeriffDecisionInput,
  options?: {
    provider?: IdentityIssuanceProvider;
    reviewId?: string;
    captureSessionId?: string;
    assuranceLevel?: "L2" | "L3";
    reviewMethod?: "automated_biometric" | "human_biometric_match";
    biometricScores?: { face_match: number; liveness: number };
    /** Authoritative document DOB (YYYY-MM-DD) — used only to derive product_eligibility, never stored in claim. */
    documentDateOfBirth?: string;
    /** When >= 21, issuance may attach product_eligibility=out_21 when DOB evidence qualifies. */
    minimumAgeGate?: number;
  },
): Promise<IssueIdentityCredentialResult> {
  const provider = options?.provider ?? "veriff";
  const reviewRef = options?.reviewId ?? decision.id;
  const sb = idvSupabase();
  const normalized = normalizeSuiAddress(holder);
  const now = new Date();

  if (sb) {
    const { data: existing } = await sb
      .from("identity_verifications")
      .select("credential_jti, status, identity_verification_status, credential_status")
      .or(`wallet_address.eq.${normalized},sui_address.eq.${normalized}`)
      .maybeSingle();

    if (
      existing?.credential_jti &&
      (existing.status === "approved" ||
        existing.identity_verification_status === "approved" ||
        existing.credential_status === "active")
    ) {
      const { data: cred } = await sb
        .from("abraxas_credentials")
        .select("credential_jwt, jti")
        .eq("jti", existing.credential_jti)
        .maybeSingle();

      return {
        ok: true,
        jti: existing.credential_jti,
        jwt: cred?.credential_jwt,
        alreadyIssued: true,
        message: "Credential already active",
      };
    }
  }

  const signingKeyJson = process.env.ABRAXAS_SIGNING_KEY;
  if (!signingKeyJson) {
    return { ok: false, message: "ABRAXAS_SIGNING_KEY not configured" };
  }

  const signingKey = await importJWK(JSON.parse(signingKeyJson), "EdDSA");
  const issuer = resolveAbraxasCredentialIssuer();
  const expiresAt = new Date(now.getTime() + TTL_MS);
  const jti = `urn:uuid:${randomUUID()}`;

  const country = decision.document?.country ?? "US";
  const state = decision.document?.state ?? "";
  const juris = state ? `${country.toUpperCase()}-${state.toUpperCase()}` : country.toUpperCase();
  const docType = (decision.document?.type ?? "passport").toLowerCase()
    .replace(" ", "_") as "passport" | "drivers_license" | "mobile_dl" | "national_id";

  const claims = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "AbraxasIdentityCredential"],
    issuer,
    issuanceDate: now.toISOString(),
    expirationDate: expiresAt.toISOString(),
    id: jti,
    credentialSubject: {
      id: `did:sui:${normalized}`,
      sui_address: normalized,
      jurisdiction: juris,
      document_type: docType,
      verification_level: "standard" as const,
      world_id_verified: false,
      verified_at: now.toISOString(),
      chain: "sui" as const,
      veriff_session_id: provider === "veriff" ? decision.id : undefined,
      assurance_level: options?.assuranceLevel
        ?? (provider === "veriff" ? ("L3" as const) : provider === "abraxas_capture" && options?.reviewMethod === "automated_biometric" ? ("L3" as const) : ("L2" as const)),
      idv_provider: provider === "abraxas_capture" ? "abraxas_independent" : provider,
      review_id: provider === "manual" ? reviewRef : undefined,
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
    .setIssuer(issuer)
    .setSubject(`did:sui:${normalized}`)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(signingKey);

  if (sb) {
    let userEmail: string | null = null;
    const { data: zkRow } = await sb
      .from("sui_zklogin_identities")
      .select("email")
      .eq("sui_address", normalized)
      .maybeSingle();
    if (zkRow?.email) userEmail = zkRow.email;

    await transitionIdentityVerification(
      normalized,
      {
        user_email: userEmail,
        document_type: docType,
        document_country: country.toUpperCase(),
        document_state: state.toUpperCase() || null,
        document_verified: true,
        liveness_passed: true,
        liveness_provider: provider === "veriff"
          ? "veriff"
          : provider === "abraxas_capture"
            ? "abraxas_capture"
            : "manual_review",
        status: "approved",
        identity_verification_status: "approved",
        credential_status: "active",
        credential_jti: jti,
        veriff_session_id: provider === "veriff" ? decision.id : null,
        veriff_decision_id: provider === "veriff" ? decision.id : reviewRef,
        last_verified_at: now.toISOString(),
        credential_issued_at: now.toISOString(),
        error_message: null,
      },
      "issueIdentityCredential",
    );

    await sb.from("abraxas_credentials").upsert({
      jti,
      holder_wallet: normalized,
      sui_address: normalized,
      issuer,
      jurisdiction: juris,
      document_type: docType,
      verification_level: "standard",
      world_id_verified: false,
      issuance_date: now.toISOString(),
      expiration_date: expiresAt.toISOString(),
      credential_jwt: jwt,
    }, { onConflict: "jti" });

    await upsertWalletBinding(normalized, normalized, "zklogin");

    const documentDateOfBirth =
      options?.documentDateOfBirth?.trim()
      || decision.person?.dateOfBirth?.trim()
      || undefined;
    const minimumAgeGate = options?.minimumAgeGate;
    const eligibilityEvidenceRef = provider === "veriff"
      ? `veriff:${decision.id}`
      : provider === "abraxas_capture" && options?.captureSessionId
        ? `abraxas_capture:${options.captureSessionId}`
        : `manual_review:${reviewRef}`;

    const identityClaims = provider === "veriff"
      ? veriffApprovedClaims({
          subjectId: normalized,
          jti,
          jurisdiction: juris,
          documentType: docType,
          veriffSessionId: decision.id,
          expiresAt,
        })
      : provider === "abraxas_capture" && options?.captureSessionId
        ? abraxasCaptureApprovedClaims({
            subjectId: normalized,
            jti,
            jurisdiction: juris,
            documentType: docType,
            captureSessionId: options.captureSessionId,
            expiresAt,
            assuranceLevel: options.assuranceLevel,
            reviewMethod: options.reviewMethod,
            biometricScores: options.biometricScores,
          })
        : manualApprovedClaims({
            subjectId: normalized,
            jti,
            jurisdiction: juris,
            documentType: docType,
            reviewId: reviewRef,
            expiresAt,
          });

    await upsertClaims([
      ...identityClaims,
      ...buildProductEligibilityClaimsForIssuance({
        subjectId: normalized,
        jti,
        documentDateOfBirth,
        minimumAgeGate,
        expiresAt,
        evidenceReference: eligibilityEvidenceRef,
      }),
      walletBindingClaim({
        subjectId: normalized,
        walletAddress: normalized,
        bindingMethod: "zklogin",
      }),
    ]);
  }

  let onChainResult: IssueIdentityCredentialResult["on_chain"];

  try {
    const { isPassportIssuerConfigured, provisionOnChainPassport } = await import("@/lib/sui/passportIssuer");
    if (isPassportIssuerConfigured() && sb) {
      const onChain = await provisionOnChainPassport(normalized);
      onChainResult = { ok: true, object_id: onChain.objectId };
      await sb.from("sui_passport_objects").upsert({
        sui_address: normalized,
        object_id: onChain.objectId,
        network: getSuiNetwork(),
        stamp_bitmask: onChain.stampBitmask,
        create_tx_digest: onChain.createTxDigest ?? null,
        stamps_tx_digest: onChain.stampsTxDigest ?? null,
        provisioned_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "sui_address" });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "On-chain provision failed";
    console.error("[issueIdentityCredential] On-chain provision failed:", e);
    onChainResult = { ok: false, error: message };
  }

  return { ok: true, jti, jwt, alreadyIssued: false, on_chain: onChainResult };
}

export interface ManualReviewApproval {
  reviewId: string;
  jurisdiction?: string;
  documentType?: string;
  reviewer?: string;
  captureSessionId?: string;
  assuranceLevel?: "L2" | "L3";
  reviewMethod?: "automated_biometric" | "human_biometric_match";
  biometricScores?: { face_match: number; liveness: number };
  /** Authoritative document DOB (YYYY-MM-DD) — internal only. */
  documentDateOfBirth?: string;
  minimumAgeGate?: number;
}

/** Issue credential after admin manual review (Veriff unavailable). Assurance L2. */
export async function issueManualIdentityCredential(
  holder: string,
  approval: ManualReviewApproval,
): Promise<IssueIdentityCredentialResult> {
  const provider: IdentityIssuanceProvider = approval.captureSessionId
    ? "abraxas_capture"
    : "manual";

  return issueIdentityCredential(
    holder,
    {
      id: approval.reviewId,
      status: "approved",
      document: {
        type: approval.documentType ?? "passport",
        country: (approval.jurisdiction ?? "US").split("-")[0],
        state: approval.jurisdiction?.includes("-")
          ? approval.jurisdiction.split("-")[1]
          : undefined,
      },
    },
    {
      provider,
      reviewId: approval.reviewId,
      captureSessionId: approval.captureSessionId,
      assuranceLevel: approval.assuranceLevel,
      reviewMethod: approval.reviewMethod,
      biometricScores: approval.biometricScores,
      documentDateOfBirth: approval.documentDateOfBirth,
      minimumAgeGate: approval.minimumAgeGate,
    },
  );
}
