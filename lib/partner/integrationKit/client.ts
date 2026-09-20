// FILE: lib/partner/integrationKit/client.ts
// Typed server-side Partner Integration Kit. Callback params are never trusted as authorization.

import { SITE_URL } from "@/lib/siteUrl";
import {
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";
import { parsePartnerCallbackParams } from "@/lib/partner/integrationKit/callback";
import { outcomeFromValidationErrors } from "@/lib/partner/integrationKit/outcomes";
import {
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  PARTNER_INTEGRATION_KIT_VERSION,
  PARTNER_INTEGRATION_RECEIPT_SCHEMA_VERSION,
  PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
  type PartnerIntegrationOutcome,
} from "@/lib/partner/integrationKit/contract";
import { resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { pickAllowedKeys, safeCallbackClientErrors } from "@/lib/privacy/selectiveDisclosure";
import { SHARED_SURFACE_FIELDS } from "@/lib/privacy/selectiveDisclosure/contract";

export interface AbraxasPartnerKitOptions {
  partnerId: string;
  policyId: string;
  policyVersion?: number;
  requirePolicyVersion?: boolean;
  environment: "sandbox" | "production";
  baseUrl?: string;
  appSlug?: string;
  policyPackId?: string;
  fetchFn?: typeof fetch;
}

export interface PartnerKitSafeResult {
  kit_version: typeof PARTNER_INTEGRATION_KIT_VERSION;
  outcome: PartnerIntegrationOutcome;
  action: "permit" | "deny";
  errors: string[];
  receipt_id: string | null;
  decision_result: string | null;
  status: string | null;
  policy_id: string | null;
  partner_id: string | null;
  production_usable: boolean | null;
  callback_trusted: false;
  google_sign_in_is_not_eligibility: typeof PARTNER_INTEGRATION_GOOGLE_BOUNDARY;
  replay_behavior: typeof PARTNER_INTEGRATION_REPLAY_BEHAVIOR;
}

function emptyResult(overrides: Partial<PartnerKitSafeResult> & Pick<PartnerKitSafeResult, "outcome" | "errors">): PartnerKitSafeResult {
  const result: PartnerKitSafeResult = {
    kit_version: PARTNER_INTEGRATION_KIT_VERSION,
    action: overrides.outcome === "permitted" ? "permit" : "deny",
    receipt_id: null,
    decision_result: null,
    status: null,
    policy_id: null,
    partner_id: null,
    production_usable: null,
    callback_trusted: false,
    google_sign_in_is_not_eligibility: PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
    replay_behavior: PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
    ...overrides,
  };
  return (pickAllowedKeys(result, SHARED_SURFACE_FIELDS.partner_kit) ?? result) as unknown as PartnerKitSafeResult;
}

function safeFromReceipt(
  receipt: PartnerFlowPublicReceipt,
  outcome: PartnerIntegrationOutcome,
  errors: string[],
): PartnerKitSafeResult {
  return emptyResult({
    outcome,
    errors,
    receipt_id: receipt.receipt_id ?? null,
    decision_result: receipt.decision_result ?? null,
    status: receipt.status ?? null,
    policy_id: receipt.policy_id ?? null,
    partner_id: receipt.partner_id ?? null,
    production_usable: typeof receipt.production_usable === "boolean" ? receipt.production_usable : null,
  });
}

export class AbraxasPartnerKit {
  readonly options: Required<Pick<AbraxasPartnerKitOptions, "partnerId" | "policyId" | "environment">> & AbraxasPartnerKitOptions;

  constructor(options: AbraxasPartnerKitOptions) {
    this.options = options;
  }

  createHostedVerificationUrl(returnUrl: string): string {
    const base = (this.options.baseUrl ?? SITE_URL).replace(/\/$/, "");
    const params = new URLSearchParams({ return_url: returnUrl });
    if (this.options.appSlug) {
      params.set("app", this.options.appSlug);
    } else {
      params.set("partner_id", this.options.partnerId);
      params.set("policy_id", this.options.policyId);
    }
    return `${base}/partner/verify?${params.toString()}`;
  }

  parseCallback(
    search: URLSearchParams | Record<string, string | string[] | undefined>,
  ) {
    return parsePartnerCallbackParams(search);
  }

  async fetchPublicReceipt(receiptId: string): Promise<
    { ok: true; receipt: PartnerFlowPublicReceipt } | { ok: false; errors: string[] }
  > {
    const fetchFn = this.options.fetchFn ?? fetch;
    const base = (this.options.baseUrl ?? SITE_URL).replace(/\/$/, "");
    try {
      const res = await fetchFn(`${base}/api/receipts/${encodeURIComponent(receiptId)}/public`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.status >= 500) {
        return { ok: false, errors: ["receipt_fetch_failed", "retry"] };
      }
      if (!res.ok) {
        return { ok: false, errors: ["receipt_missing"] };
      }
      const receipt = (await res.json()) as PartnerFlowPublicReceipt;
      return { ok: true, receipt };
    } catch {
      return { ok: false, errors: ["receipt_fetch_failed", "retry"] };
    }
  }

  evaluateFetchedReceipt(receipt: PartnerFlowPublicReceipt): PartnerKitSafeResult {
    const pack = this.options.policyPackId ? resolvePolicyPack(this.options.policyPackId) : null;
    const expectedPolicyId = this.options.policyId;
    const sandbox = this.options.environment === "sandbox";
    const validation = validatePartnerFlowPublicReceipt(receipt, {
      partnerId: this.options.partnerId,
      policyId: expectedPolicyId,
      allowSandbox: sandbox,
    });
    const errors = [...validation.errors];
    const version = (receipt as PartnerFlowPublicReceipt & { policy_version?: number }).policy_version;
    const pinRequired = this.options.requirePolicyVersion === true || this.options.policyVersion != null;
    if (pinRequired) {
      if (this.options.policyVersion == null) {
        errors.push("policy_version_not_adopted");
      } else if (version == null || Number.isNaN(Number(version))) {
        errors.push("policy_version_missing");
      } else if (Number(version) !== this.options.policyVersion) {
        errors.push(`policy_version_mismatch:expected=${this.options.policyVersion},got=${version}`);
      }
    }
    if (receipt.schema_version && receipt.schema_version !== PARTNER_INTEGRATION_RECEIPT_SCHEMA_VERSION) {
      errors.push(`schema_version_unsupported:${receipt.schema_version}`);
    }
    if (pack && receipt.policy_id && !receipt.policy_id.includes(pack.id) && receipt.policy_id !== expectedPolicyId) {
      errors.push(`policy_mismatch:expected=${expectedPolicyId},got=${receipt.policy_id}`);
    }

    if (errors.length === 0 && validation.ok) {
      return safeFromReceipt(receipt, "permitted", []);
    }
    return safeFromReceipt(receipt, outcomeFromValidationErrors(errors), errors);
  }

  async verifyCallback(
    search: URLSearchParams | Record<string, string | string[] | undefined>,
  ): Promise<PartnerKitSafeResult> {
    const parsed = this.parseCallback(search);
    if (!parsed.ok) {
      return emptyResult({
        outcome: "invalid",
        errors: safeCallbackClientErrors(parsed.errors),
      });
    }
    const fetched = await this.fetchPublicReceipt(parsed.params.receipt_id!);
    if (!fetched.ok) {
      return emptyResult({
        outcome: outcomeFromValidationErrors(fetched.errors),
        errors: fetched.errors,
        receipt_id: parsed.params.receipt_id,
      });
    }
    return this.evaluateFetchedReceipt(fetched.receipt);
  }

  async verifyReceiptId(receiptId: string): Promise<PartnerKitSafeResult> {
    const fetched = await this.fetchPublicReceipt(receiptId);
    if (!fetched.ok) {
      return emptyResult({
        outcome: outcomeFromValidationErrors(fetched.errors),
        errors: fetched.errors,
        receipt_id: receiptId,
      });
    }
    return this.evaluateFetchedReceipt(fetched.receipt);
  }
}

export function permitProtocolAction(result: PartnerKitSafeResult): boolean {
  return result.outcome === "permitted" && result.action === "permit";
}
