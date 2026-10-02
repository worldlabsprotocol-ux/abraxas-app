// FILE: lib/trust/resolveCanonicalIssuer.ts
// Single resolution layer for credential issuers — DB first, code fallback.

import { getIssuerById, type IssuerRecord } from "@/lib/trust/issuerFramework";
import { TRUST_REGISTRY_FALLBACK, type TrustedIssuer } from "@/lib/trust/trustRegistry";

function fallbackToRecord(issuer: TrustedIssuer): IssuerRecord {
  return {
    id: issuer.id,
    legal_name: issuer.legal_name,
    display_name: issuer.legal_name,
    issuer_type: issuer.issuer_type,
    issuer_status: issuer.trust_status === "active" ? "active" : "pending",
    trust_status: issuer.trust_status,
    supported_claims: issuer.supported_claims,
    jurisdictions: issuer.jurisdictions,
    assurance_levels: issuer.assurance_levels,
    verification_methods: [],
    credential_ttl_days: issuer.credential_ttl_days,
    audit_status: issuer.audit_status,
    metadata: issuer.metadata,
  };
}

/** Resolve issuer from DB credential_issuers, falling back to in-code trust registry. */
export async function resolveCanonicalIssuer(issuerId: string): Promise<IssuerRecord | null> {
  const fromDb = await getIssuerById(issuerId);
  if (fromDb) return fromDb;

  const fallback = TRUST_REGISTRY_FALLBACK.find((i) => i.id === issuerId);
  if (fallback) return fallbackToRecord(fallback);

  return null;
}
