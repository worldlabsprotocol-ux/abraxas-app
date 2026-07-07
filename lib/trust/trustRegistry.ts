// FILE: lib/trust/trustRegistry.ts
// Trust Registry — which issuers are trusted for which claims.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export interface TrustedIssuer {
  id: string;
  legal_name: string;
  issuer_type: string;
  trust_status: string;
  supported_claims: string[];
  jurisdictions: string[];
  assurance_levels: string[];
  credential_ttl_days: number | null;
  audit_status: string;
  metadata: Record<string, unknown>;
}

export interface CredentialSchemaRecord {
  id: string;
  name: string;
  version: number;
  claim_types: string[];
  w3c_type: string | null;
  status: string;
}

/** In-code fallback when DB migration 019 not yet applied */
export const TRUST_REGISTRY_FALLBACK: TrustedIssuer[] = [
  {
    id: "issuer:veriff",
    legal_name: "Veriff (licensed IDV)",
    issuer_type: "identity_provider",
    trust_status: "active",
    supported_claims: ["identity_verified", "liveness_passed", "government_id_verified", "residency_country"],
    jurisdictions: ["global"],
    assurance_levels: ["L2", "L3"],
    credential_ttl_days: 365,
    audit_status: "contracted",
    metadata: { provider: "veriff", assurance: "high" },
  },
  {
    id: "issuer:abraxas",
    legal_name: "Abraxas Network",
    issuer_type: "network_coordinator",
    trust_status: "active",
    supported_claims: ["wallet_binding_confirmed"],
    jurisdictions: ["global"],
    assurance_levels: ["L2"],
    credential_ttl_days: 30,
    audit_status: "self_attested",
    metadata: { binding_method: "signed_challenge" },
  },
  {
    id: "issuer:abraxas-manual",
    legal_name: "Abraxas Manual Review",
    issuer_type: "manual_reviewer",
    trust_status: "active",
    supported_claims: ["kyb_verified", "asset_ownership_reviewed", "risk_review"],
    jurisdictions: ["US", "global"],
    assurance_levels: ["L2", "L3"],
    credential_ttl_days: 365,
    audit_status: "self_attested",
    metadata: {},
  },
  {
    id: "issuer:screening-partner",
    legal_name: "Sanctions / AML Provider (partner-gated)",
    issuer_type: "screening_provider",
    trust_status: "pending_audit",
    supported_claims: ["screening_outcome", "wallet_risk_band"],
    jurisdictions: ["US", "global"],
    assurance_levels: ["L1", "L2"],
    credential_ttl_days: 1,
    audit_status: "pending_audit",
    metadata: { note: "Full AML program requires partner onboarding" },
  },
];

export async function listTrustedIssuers(): Promise<TrustedIssuer[]> {
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("credential_issuers")
      .select("*")
      .order("legal_name");

    if (error || !data?.length) return TRUST_REGISTRY_FALLBACK;
    return data as TrustedIssuer[];
  } catch {
    return TRUST_REGISTRY_FALLBACK;
  }
}

export async function listCredentialSchemas(): Promise<CredentialSchemaRecord[]> {
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("credential_schemas")
      .select("*")
      .eq("status", "active")
      .order("name");

    if (error || !data?.length) {
      return [
        {
          id: "schema:abraxas-identity-v1",
          name: "Government Identity Credential",
          version: 1,
          claim_types: ["identity_verified", "liveness_passed", "government_id_verified", "residency_country"],
          w3c_type: "GovernmentIdentityCredential",
          status: "active",
        },
        {
          id: "schema:abraxas-wallet-v1",
          name: "Wallet Binding Credential",
          version: 1,
          claim_types: ["wallet_binding_confirmed"],
          w3c_type: "WalletBindingCredential",
          status: "active",
        },
      ];
    }
    return data as CredentialSchemaRecord[];
  } catch {
    return [];
  }
}

export function issuerAcceptsClaim(issuer: TrustedIssuer, claimType: string): boolean {
  return issuer.supported_claims.includes(claimType) && issuer.trust_status === "active";
}
