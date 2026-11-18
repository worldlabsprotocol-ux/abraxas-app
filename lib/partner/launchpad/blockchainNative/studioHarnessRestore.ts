import type { PartnerHarnessCaseResult } from "@/lib/partner/launchpad/partnerTestHarness";
import type { PartnerHarnessScenarioId } from "@/lib/partner/launchpad/partnerTestHarness";

export type PortableHarnessPersistence = NonNullable<PartnerHarnessCaseResult["persistence"]>;

const EMPTY_CALLBACK = {
  receipt_id: "",
  decision: "",
  status: "",
};

/** Rebuild harness wrapper from a prior prepare response (portable persistence only). */
export function partnerHarnessFromPortablePersistence(
  persistence: PortableHarnessPersistence,
  scenarioId: PartnerHarnessScenarioId = "approved",
): PartnerHarnessCaseResult {
  const approved = scenarioId === "approved";
  return {
    scenario_id: scenarioId,
    simulated: false,
    passed: approved,
    expected_access: "allow_sandbox",
    observed_access: approved ? "allow" : "deny",
    validity: approved ? "valid" : "invalid",
    invalidation_reasons: [],
    signature_valid: true,
    production_usable: false,
    callback_params: EMPTY_CALLBACK,
    pii_scan_passed: true,
    signing_source: "configured_issuer_key",
    verification_path: "evaluatePublicReceiptTrust+validatePartnerFlowPublicReceipt",
    persistence,
  };
}

export function portablePersistencePartnerId(persistence: PortableHarnessPersistence): string | null {
  const partnerId = (persistence.public_payload as { partner_id?: string }).partner_id;
  return typeof partnerId === "string" && partnerId.trim() ? partnerId.trim() : null;
}