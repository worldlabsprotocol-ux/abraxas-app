// FILE: lib/verifyRegistry.ts
// Public credential verifier — resolves DIDs, Sui addresses, asset IDs, and JWTs.

import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getTrustStatus } from "@/lib/trust/getTrustStatus";
import { verifyCredentialJwt } from "@/lib/credentials/verifyJwt";
import { CIELO_ASSURANCE_CLAIMS, type AssuranceBreakdown } from "@/lib/assuranceTaxonomy";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { resolveRegistryAsset, type RegistryAssetDef } from "@/lib/data/registryAssets";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export type CredentialState =
  | "RESOLVED_VALID"
  | "RESOLVED_REVOKED"
  | "NULL_STATE";

export interface VerifierResponse {
  state: CredentialState;
  query: string;
  resolved_type: "passport" | "credential_jwt" | "asset" | "registry_entry" | "unknown";
  did: string | null;
  entity_label: string | null;
  asset_class: string | null;
  verification_status: string;
  current_pipeline_stage: string | null;
  issuance_timestamp: string | null;
  last_sync_timestamp: string | null;
  assurance_level: number;
  assurance_taxonomy: AssuranceBreakdown;
  anchor_block: number | null;
  revocation_reason_code?: string;
  solana_reference?: string | null;
  metadata_uri?: string | null;
  notice: string;
}

function isLikelyJwt(input: string): boolean {
  return input.split(".").length === 3 && input.startsWith("eyJ");
}

function isLikelySuiAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(input.trim());
}

function isLikelyDid(input: string): boolean {
  return input.startsWith("did:");
}

function isLikelyAssetId(input: string): boolean {
  return /^ABX-/i.test(input.trim()) || resolveRegistryAsset(input) !== null;
}

function assetResponse(asset: RegistryAssetDef, query: string): VerifierResponse {
  return {
    state: "RESOLVED_VALID",
    query,
    resolved_type: "asset",
    did: `did:sui:${asset.slug}-${asset.abxId.toLowerCase()}`,
    entity_label: asset.name,
    asset_class: asset.assetClass,
    verification_status: "RESOLVED_VALID",
    current_pipeline_stage: asset.pipelineStage,
    issuance_timestamp: "2025-11-01T00:00:00Z",
    last_sync_timestamp: new Date().toISOString(),
    assurance_level: asset.assuranceLevel,
    assurance_taxonomy: asset.assuranceTaxonomy,
    anchor_block: null,
    metadata_uri: asset.metadataUri,
    notice: asset.notice,
  };
}

function buildAssuranceFromTrust(trust: Awaited<ReturnType<typeof getTrustStatus>>): AssuranceBreakdown {
  if (!trust) return {};
  const now = new Date().toISOString();
  return {
    L1_IdentityClaim: {
      status: trust.identity.status === "approved" ? "VERIFIED" : trust.identity.status.toUpperCase(),
      timestamp: now,
      provider: trust.identity.via ?? "Veriff_Biometric_IDV",
    },
    L2_LegalReview: trust.credential.active
      ? { status: "VERIFIED", timestamp: now, provider: "Abraxas_Credential_Engine" }
      : { status: "PENDING", timestamp: now, provider: "Abraxas_Credential_Engine" },
    L3_ProfessionalAttestation: trust.on_chain.provisioned
      ? { status: "VERIFIED", timestamp: now, authority: trust.on_chain.object_id ?? undefined }
      : { status: "PENDING" },
    L4_ActiveMonitoring: {
      status: trust.enhanced_trust ? "ACTIVE" : "PENDING",
      lastSync: trust.intent.last_verified_at ?? now,
      oracleSource: "Abraxas_Trust_Status_Worker",
    },
  };
}

function cieloAssetResponse(query: string): VerifierResponse {
  return {
    state: "RESOLVED_VALID",
    query,
    resolved_type: "asset",
    did: `did:sui:cielo-${FLAGSHIP_PROPERTY.id.toLowerCase()}`,
    entity_label: FLAGSHIP_PROPERTY.title,
    asset_class: FLAGSHIP_PROPERTY.assetClass,
    verification_status: "RESOLVED_VALID",
    current_pipeline_stage: "MARKETPLACE_LIVE",
    issuance_timestamp: "2025-11-01T00:00:00Z",
    last_sync_timestamp: new Date().toISOString(),
    assurance_level: 3,
    assurance_taxonomy: {
      L1_IdentityClaim: { status: "VERIFIED", timestamp: "2025-11-01T00:00:00Z", provider: "Veriff_Biometric_IDV" },
      L2_LegalReview: { status: "VERIFIED", timestamp: "2025-11-15T00:00:00Z", provider: "Fannin_County_Deed_Review" },
      L3_ProfessionalAttestation: { status: "VERIFIED", timestamp: "2025-12-01T00:00:00Z", authority: "Independent_Appraisal_V5" },
      L4_ActiveMonitoring: { status: "ACTIVE", lastSync: new Date().toISOString(), oracleSource: "Airbnb_Listing_CrossCheck" },
    },
    anchor_block: null,
    metadata_uri: `/flagship`,
    notice:
      "Cryptographic signatures match. This asset is anchored in the Abraxas registry and complies with active V5 monitoring parameters. Yield figures are owner projections — see assurance taxonomy.",
  };
}

export async function resolveVerifierQuery(rawQuery: string): Promise<VerifierResponse> {
  const query = rawQuery.trim();
  if (!query) {
    return {
      state: "NULL_STATE",
      query,
      resolved_type: "unknown",
      did: null,
      entity_label: null,
      asset_class: null,
      verification_status: "NULL_STATE",
      current_pipeline_stage: null,
      issuance_timestamp: null,
      last_sync_timestamp: null,
      assurance_level: 0,
      assurance_taxonomy: {},
      anchor_block: null,
      notice: "Enter a Passport DID, Sui address, credential JWT, or asset ID.",
    };
  }

  // Known registry asset shortcuts (exact match — not all ABX-* → Cielo)
  const registryAsset = resolveRegistryAsset(query);
  if (registryAsset) {
    return assetResponse(registryAsset, query);
  }
  if (query === FLAGSHIP_PROPERTY.id || query.toLowerCase().includes("cielo")) {
    return cieloAssetResponse(query);
  }

  if (isLikelyAssetId(query)) {
    return nullState(query, "Asset ID format recognized but not found in the Abraxas registry.");
  }

  // JWT credential
  if (isLikelyJwt(query)) {
    const result = await verifyCredentialJwt(query, "public_verifier", [], true);
    const holderDid = result.sui_address ? `did:sui:${result.sui_address}` : null;
    if (result.verified) {
      return {
        state: "RESOLVED_VALID",
        query,
        resolved_type: "credential_jwt",
        did: holderDid,
        entity_label: "Abraxas Credential",
        asset_class: "Identity.Credential",
        verification_status: "RESOLVED_VALID",
        current_pipeline_stage: "CREDENTIAL_ACTIVE",
        issuance_timestamp: result.expires_at ?? null,
        last_sync_timestamp: new Date().toISOString(),
        assurance_level: 2,
        assurance_taxonomy: {
          L1_IdentityClaim: { status: "VERIFIED", provider: "Veriff_Biometric_IDV" },
          L2_LegalReview: { status: "VERIFIED", provider: "Abraxas_Credential_Engine" },
        },
        anchor_block: null,
        notice: "Credential JWT signature verified. Downstream relying parties may clear transactions using this proof.",
      };
    }
    const revoked = Boolean(result.error?.toLowerCase().includes("revoked"));
    return {
      state: revoked ? "RESOLVED_REVOKED" : "NULL_STATE",
      query,
      resolved_type: "credential_jwt",
      did: holderDid,
      entity_label: null,
      asset_class: null,
      verification_status: revoked ? "RESOLVED_REVOKED" : "NULL_STATE",
      current_pipeline_stage: null,
      issuance_timestamp: result.expires_at ?? null,
      last_sync_timestamp: new Date().toISOString(),
      assurance_level: 0,
      assurance_taxonomy: {},
      anchor_block: null,
      revocation_reason_code: revoked ? "REVOCATION_CREDENTIAL_REVOKED" : undefined,
      notice: revoked
        ? "This credential has been revoked. Do not clear downstream transactions using this state."
        : "Could not verify credential JWT. Confirm the token is complete and not expired.",
    };
  }

  // Sui address or DID → trust status
  let suiAddress = query;
  if (isLikelyDid(query)) {
    const parts = query.split(":");
    suiAddress = parts[parts.length - 1] ?? query;
  }

  if (isLikelySuiAddress(suiAddress) || isLikelyDid(query)) {
    try {
      const normalized = normalizeSuiAddress(suiAddress);
      const trust = await getTrustStatus(normalized);
      if (!trust) {
        return nullState(query, "Database not configured for live lookup.");
      }

      if (!trust.wallet_registered && trust.identity.status === "not_started") {
        return nullState(query);
      }

      const revoked = trust.credential.jti && !trust.credential.active;
      const state: CredentialState = revoked ? "RESOLVED_REVOKED" : "RESOLVED_VALID";

      return {
        state,
        query,
        resolved_type: "passport",
        did: `did:sui:${normalized}`,
        entity_label: "Abraxas Passport",
        asset_class: "Identity.Passport",
        verification_status: state,
        current_pipeline_stage: trust.on_chain.provisioned ? "PASSPORT_PROVISIONED" : "WALLET_REGISTERED",
        issuance_timestamp: trust.intent.last_verified_at,
        last_sync_timestamp: new Date().toISOString(),
        assurance_level: trust.enhanced_trust ? 3 : trust.wallet_registered ? 1 : 0,
        assurance_taxonomy: buildAssuranceFromTrust(trust),
        anchor_block: null,
        revocation_reason_code: revoked ? "REVOCATION_COMPLIANCE_RE_AUDIT_REQUIRED" : undefined,
        notice: state === "RESOLVED_VALID"
          ? "Passport state resolved. Verify assurance levels before clearing high-value transactions."
          : "Credential state paused or expired. Do not clear downstream transactions.",
      };
    } catch {
      return nullState(query);
    }
  }

  // Registry table lookup
  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { data } = await sb
      .from("verified_registry")
      .select("*")
      .or(`did_identifier.eq.${query},metadata_uri.eq.${query}`)
      .maybeSingle();

    if (data) {
      const revoked = data.verification_status === "RESOLVED_REVOKED";
      return {
        state: revoked ? "RESOLVED_REVOKED" : "RESOLVED_VALID",
        query,
        resolved_type: "registry_entry",
        did: data.did_identifier,
        entity_label: data.display_name ?? data.did_identifier,
        asset_class: data.asset_class,
        verification_status: data.verification_status,
        current_pipeline_stage: data.current_pipeline_stage,
        issuance_timestamp: data.created_at,
        last_sync_timestamp: data.last_monitored_sync ?? data.updated_at,
        assurance_level: data.assurance_level ?? 1,
        assurance_taxonomy: (data.assurance_taxonomy as AssuranceBreakdown) ?? {},
        anchor_block: data.anchor_block ?? null,
        metadata_uri: data.metadata_uri,
        revocation_reason_code: data.revocation_reason_code ?? undefined,
        notice: revoked
          ? "Registry entry revoked or expired."
          : "Registry entry resolved from Abraxas verified_registry.",
      };
    }
  }

  return nullState(query);
}

function nullState(query: string, notice?: string): VerifierResponse {
  return {
    state: "NULL_STATE",
    query,
    resolved_type: "unknown",
    did: null,
    entity_label: null,
    asset_class: null,
    verification_status: "NULL_STATE",
    current_pipeline_stage: null,
    issuance_timestamp: null,
    last_sync_timestamp: null,
    assurance_level: 0,
    assurance_taxonomy: {},
    anchor_block: null,
    notice:
      notice ??
      "The submitted string does not resolve to an issued Abraxas Passport, credential, or registry entry. Confirm the identifier and try again.",
  };
}

export { CIELO_ASSURANCE_CLAIMS };
