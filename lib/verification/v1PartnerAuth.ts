// FILE: lib/verification/v1PartnerAuth.ts
// Partner auth for v1 verification-request API — DB keys with legacy env fallback.

import type { NextRequest } from "next/server";
import {
  authenticatePartner as authenticateDbPartner,
  extractPartnerKey,
  type PartnerAuthContext,
  type PartnerScope,
} from "@/lib/partner/partnerAuth";

export interface V1PartnerAuth {
  partnerId: string;
  ctx: PartnerAuthContext | null;
}

export type V1PartnerAuthFailure = { error: string; status: 401 | 403 };

const LEGACY_SCOPES: PartnerScope[] = ["verify:credential", "verify:registry", "verify:requests", "verify:screening"];

function legacyEnvAuth(req: NextRequest): V1PartnerAuth | V1PartnerAuthFailure | null {
  const headerKey =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-abraxas-api-key");

  const configured = process.env.PARTNER_API_KEY ?? process.env.ABRAXAS_PARTNER_API_KEY;
  const partnerId = process.env.PARTNER_ID ?? "abraxas";

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      return { error: "Partner API not configured", status: 401 };
    }
    return { partnerId, ctx: null };
  }

  if (!headerKey || headerKey !== configured) {
    return { error: "Invalid API key", status: 401 };
  }

  return {
    partnerId,
    ctx: {
      partnerId,
      apiKeyId: "legacy-env",
      displayName: "Legacy env key",
      keyPrefix: configured.slice(0, 12),
      scopes: LEGACY_SCOPES,
    },
  };
}

function scopeAllowed(ctx: PartnerAuthContext, required: PartnerScope): boolean {
  if (ctx.scopes.includes(required)) return true;
  if (required === "verify:requests" && ctx.scopes.includes("verify:credential")) return true;
  if (required === "verify:screening" && (ctx.scopes.includes("verify:requests") || ctx.scopes.includes("verify:credential"))) return true;
  return false;
}

export async function authenticateV1Partner(
  req: NextRequest,
  requiredScope: PartnerScope = "verify:requests",
): Promise<V1PartnerAuth | V1PartnerAuthFailure> {
  const rawKey = extractPartnerKey(req);

  if (rawKey) {
    const dbAuth = await authenticateDbPartner(req);
    if (dbAuth?.ok) {
      if (!scopeAllowed(dbAuth.ctx, requiredScope)) {
        return { error: `Missing scope: ${requiredScope}`, status: 403 };
      }
      return { partnerId: dbAuth.ctx.partnerId, ctx: dbAuth.ctx };
    }
    if (dbAuth && !dbAuth.ok) {
      return { error: dbAuth.error, status: dbAuth.status };
    }
  }

  const legacy = legacyEnvAuth(req);
  if (!legacy) {
    return { error: "Partner API key required", status: 401 };
  }
  if ("error" in legacy) return legacy;
  return legacy;
}
