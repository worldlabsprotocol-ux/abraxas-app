import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/persistence/boundary/issuerAuthority/buildFromRegistry", () => ({
  publishSignedIssuerAuthorityFromRegistry: vi.fn(),
}));
vi.mock("@/lib/persistence/boundary/sovereignCurrentValidity/evaluate", () => ({
  evaluateSovereignCurrentValidity: vi.fn(),
}));
vi.mock("@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus", () => ({
  publishSignedReceiptStatusFromSovereignEvaluation: vi.fn(),
}));

import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { evaluateSovereignCurrentValidity } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildAuthoritativeVerificationMaterial } from "./buildTrustExecutionVerificationMaterial";

const publishIssuer = vi.mocked(publishSignedIssuerAuthorityFromRegistry);
const evaluate = vi.mocked(evaluateSovereignCurrentValidity);
const publishStatus = vi.mocked(publishSignedReceiptStatusFromSovereignEvaluation);

const record = {
  id: "dr_sandbox",
  partner_id: "partner-a",
  policy_id: "policy-a",
  policy_version: 1,
  decision_context: "sandbox_only",
  signing_key_id: "abraxas-primary",
  status: "active",
  issuance_finalized_at: "2026-11-09T00:00:00.000Z",
} as DecisionReceiptRecord;

const anchor = { kty: "OKP", crv: "Ed25519", x: "abc" } as JsonWebKey;

describe("authoritative verification material", () => {
  beforeEach(() => {
    publishIssuer.mockReset();
    evaluate.mockReset();
    publishStatus.mockReset();
    publishIssuer.mockReturnValue({
      payload: { environment: "production" },
      signature: "anchor-signature",
    } as ReturnType<typeof publishSignedIssuerAuthorityFromRegistry>);
  });

  it("checks a sandbox decision under the production runtime environment", async () => {
    evaluate.mockResolvedValue({
      store_available: true,
      currently_acceptable: false,
      lifecycle_status: "invalidated",
      invalidation_reasons: ["wrong_environment"],
    } as Awaited<ReturnType<typeof evaluateSovereignCurrentValidity>>);

    const result = await buildAuthoritativeVerificationMaterial({
      record,
      applicationId: "app-1",
      env: { VERCEL_ENV: "production" },
      anchorPublicJwk: anchor,
      anchorPrivateJwk: anchor,
      anchorKeyId: "anchor",
      registryVersion: 854,
    });

    expect(result).toEqual({ ok: false, code: "wrong_environment" });
    expect(evaluate).toHaveBeenCalledWith(expect.objectContaining({
      expectedEnvironment: "production",
    }));
    expect(publishStatus).not.toHaveBeenCalled();
  });

  it("does not sign status when the checkpoint cannot advance", async () => {
    evaluate.mockResolvedValue({
      store_available: true,
      currently_acceptable: true,
      lifecycle_status: "active",
      invalidation_reasons: [],
      checked_at: "2026-11-09T00:00:00.000Z",
    } as Awaited<ReturnType<typeof evaluateSovereignCurrentValidity>>);
    publishStatus.mockResolvedValue({ ok: false, reason: "checkpoint_write_failed" });

    const result = await buildAuthoritativeVerificationMaterial({
      record,
      applicationId: "app-1",
      env: { VERCEL_ENV: "production" },
      anchorPublicJwk: anchor,
      anchorPrivateJwk: anchor,
      anchorKeyId: "anchor",
      registryVersion: 854,
    });

    expect(result).toEqual({ ok: false, code: "checkpoint_write_failed" });
    expect(result).not.toHaveProperty("material");
  });
});
