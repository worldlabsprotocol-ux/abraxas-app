"use client";
// FILE: components/passport/PassportClaimsCard.tsx
// Live credential claims from /api/credentials/claims. honest Passport state.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchCredentialClaims, passportQueryKeys } from "@/lib/api/passport";
import { ProductStatusBadge } from "@/components/ui/ProductStatusBadge";
import { Skeleton } from "@/lib/motion/Skeleton";
import type { ProductStatus } from "@/lib/passportLayers";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function claimStatusBadge(claimType: string, active: boolean): ProductStatus {
  if (active) return "live";
  if (claimType === "screening_outcome") return "partner_gated";
  return "planned";
}

export function PassportClaimsCard({ suiAddress }: { suiAddress: string | null }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: suiAddress ? passportQueryKeys.claims(suiAddress) : ["passport", "claims", "none"],
    queryFn: () => fetchCredentialClaims(suiAddress!),
    enabled: Boolean(suiAddress),
    staleTime: 20_000,
  });

  if (!suiAddress) return null;

  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      padding: "1.15rem 1.25rem",
      marginBottom: "1.5rem",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: "0.5rem", marginBottom: "0.65rem", flexWrap: "wrap",
      }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Active claims · Compliance Passport
        </div>
        {data && (
          <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
            {data.count} live
          </span>
        )}
      </div>

      {isLoading && (
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <Skeleton width="100%" height={36} />
          <Skeleton width="80%" height={36} />
        </div>
      )}

      {isError && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
          Claims registry unavailable. ensure Supabase migration 018 is applied (see docs/SUPABASE_MIGRATION_018.md).
        </p>
      )}

      {!isLoading && !isError && data?.claims.length === 0 && (
        <div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
            Passport Core is active. No compliance claims yet. add an ID check when a booking or partner requires it.
          </p>
          <Link href="#passport-step-2" style={{
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
          }}>
            Start optional ID check →
          </Link>
        </div>
      )}

      {!isLoading && data && data.claims.length > 0 && (
        <div style={{ display: "grid", gap: "0.45rem" }}>
          {data.claims.map(claim => (
            <div key={`${claim.claim_type}-${claim.issued_at}`} style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              gap: "0.5rem", alignItems: "start",
              padding: "0.55rem 0.65rem", borderRadius: 10,
              background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {claim.label}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {claim.issuer_id.replace("issuer:", "")}
                  {claim.assurance_level ? ` · ${claim.assurance_level}` : ""}
                  {claim.expires_at ? ` · exp ${new Date(claim.expires_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <ProductStatusBadge status={claimStatusBadge(claim.claim_type, claim.status === "active")} size="xs" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
