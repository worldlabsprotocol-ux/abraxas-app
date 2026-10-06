import { describe, expect, it } from "vitest";
import {
  applyPartnerFlowTrustGate,
  isPartnerFlowAuthorizationSuccess,
  isPartnerFlowVerificationRequired,
  resolveHolderAuthorizationState,
  resolvePartnerFlowTrustGate,
} from "@/lib/partner/partnerFlowCurrentAuthorization";
import { CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON } from "@/lib/partner/sandboxReceiptTrustContract";

describe("partnerFlowCurrentAuthorization", () => {
  it("authorizes healthy current replay", () => {
    const gate = resolvePartnerFlowTrustGate({
      currently_valid: true,
      validity: "active",
      invalidation_reasons: [],
    });
    expect(gate.next).toBe("enter");
    expect(gate.holder_authorization_state).toBe("authorized");
    expect(gate.redirect_allowed).toBe(true);
  });

  it("requires verification for revoked dependency replay", () => {
    const gate = resolvePartnerFlowTrustGate({
      currently_valid: false,
      validity: "revoked_dependency",
      invalidation_reasons: ["source_evidence_revoked"],
    });
    expect(gate.next).toBe("verification_required");
    expect(gate.holder_authorization_state).toBe("verification_required");
    expect(gate.redirect_allowed).toBe(false);
  });

  it("requires verification for expired replay", () => {
    expect(resolveHolderAuthorizationState({
      currently_valid: false,
      invalidation_reasons: ["receipt_expired"],
    })).toBe("verification_required");
  });

  it("denies revoked claim replay fail-closed", () => {
    expect(resolveHolderAuthorizationState({
      currently_valid: false,
      invalidation_reasons: ["claim_revoked"],
    })).toBe("denied");
  });

  it("denies receipt-revoked replay fail-closed", () => {
    const gated = applyPartnerFlowTrustGate({
      next: "enter",
      redirect_url: "https://partner.example/callback",
      partner_result: { decision: "approved", receipt_id: "dr_stale" },
      replay_status: "idempotent_replay",
      decision_id: "decision-1",
    }, {
      currently_valid: false,
      validity: "access_revoked",
      invalidation_reasons: ["receipt_revoked"],
    });

    expect(gated.next).toBe("denied");
    expect(gated.holder_authorization_state).toBe("denied");
    expect(gated.redirect_url).toBeUndefined();
    expect(gated.partner_result?.receipt_id).toBe("dr_stale");
  });

  it("preserves sandbox authorization for healthy sandbox-only limitation", () => {
    const gated = applyPartnerFlowTrustGate({
      next: "enter",
      redirect_url: "https://partner.example/callback",
      partner_result: { decision: "approved", receipt_id: "dr_sandbox" },
      replay_status: "idempotent_replay",
    }, {
      currently_valid: true,
      validity: "sandbox_only",
      invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    });

    expect(gated.next).toBe("enter");
    expect(gated.holder_authorization_state).toBe("authorized");
    expect(gated.redirect_url).toBe("https://partner.example/callback");
  });

  it("requires verification for revoked sandbox dependency", () => {
    const gated = applyPartnerFlowTrustGate({
      next: "enter",
      redirect_url: "https://partner.example/callback",
      partner_result: { decision: "approved", receipt_id: "dr_sandbox_stale" },
      replay_status: "idempotent_replay",
    }, {
      currently_valid: false,
      validity: "revoked_dependency",
      invalidation_reasons: ["source_evidence_revoked", CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    });

    expect(gated.next).toBe("verification_required");
    expect(gated.redirect_url).toBeUndefined();
  });

  it("does not treat verification_required as authorization success", () => {
    expect(isPartnerFlowAuthorizationSuccess({
      next: "verification_required",
      holder_authorization_state: "verification_required",
    })).toBe(false);
    expect(isPartnerFlowVerificationRequired({
      next: "verification_required",
      holder_authorization_state: "verification_required",
    })).toBe(true);
  });
});
