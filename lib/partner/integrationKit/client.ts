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
  PARTNER_INTEGRATION_NARROW_RESULT_SCHEMA_VERSION,
  PARTNER_INTEGRATION_RECEIPT_SCHEMA_VERSION,
  PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
  type PartnerIntegrationOutcome,
} from "@/lib/partner/integrationKit/contract";
import type { NarrowPartnerResult } from "@/lib/partner/narrowPartnerResult/contract";
import type { ProvenancePartnerFacts } from "@/lib/partner/provenancePartnerResult";
import { resolvePolicyPack, inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { assertReceiptMatchesBinding } from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";
import type { ResolvedApplicationPolicyBinding } from "@/lib/partner/launchpad/policyBindingContract";
import { embedRequestIdInReturnUrl } from "@/lib/partner/productionIntegration/requestCorrelation";
import type { PartnerRequestStateStore } from "@/lib/partner/integrationKit/partnerRequestStateStore";
import { validateUniversalRequestCorrelation } from "@/lib/partner/integrationKit/requestCorrelationValidation";
import { pickAllowedKeys, safeCallbackClientErrors } from "@/lib/privacy/selectiveDisclosure";
import { SHARED_SURFACE_FIELDS } from "@/lib/privacy/selectiveDisclosure/contract";
import { resolvePolicyIntegrationCapabilities } from "@/lib/partner/integrationKit/policyCapabilities";
import type {
  CreateVerificationRequestInput,
  VerificationRequestResult,
  VerifyCallbackWithNarrowResultInput,
  VerifyCallbackWithNarrowResultResult,
} from "@/lib/partner/integrationKit/verificationRequest";

export interface AbraxasPartnerKitOptions {
  partnerId: string;
  policyId: string;
  policyVersion?: number;
  requirePolicyVersion?: boolean;
  environment: "sandbox" | "production";
  baseUrl?: string;
  appSlug?: string;
  applicationId?: string;
  /** Server-side only. Never expose to browser bundles. Used for hosted handoff request creation. */
  apiKey?: string;
  /** Partner-owned durable store for redirect-mode req_* correlation (Postgres, Redis, KV). */
  requestStateStore?: PartnerRequestStateStore;
  policyPackId?: string;
  bindingId?: string;
  resultFamily?: string;
  fetchFn?: typeof fetch;
  /** When true, best-effort privacy-safe verification telemetry is recorded. Never affects outcomes. */
  reportVerificationTelemetry?: boolean;
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

  createHostedVerificationUrl(returnUrl: string, options?: { requestId?: string }): string {
    const base = (this.options.baseUrl ?? SITE_URL).replace(/\/$/, "");
    const boundReturnUrl = options?.requestId
      ? embedRequestIdInReturnUrl(returnUrl, options.requestId)
      : returnUrl;
    const params = new URLSearchParams({ return_url: boundReturnUrl });
    if (this.options.appSlug) {
      params.set("app", this.options.appSlug);
    } else {
      params.set("partner_id", this.options.partnerId);
      params.set("policy_id", this.options.policyId);
    }
    return `${base}/partner/verify?${params.toString()}`;
  }

  /** Policy-agnostic Verify with Abraxas — server-side request creation only. */
  async createVerificationRequest(input: CreateVerificationRequestInput): Promise<VerificationRequestResult> {
    const { createVerificationRequestForKit } = await import("@/lib/partner/integrationKit/verificationRequest");
    return createVerificationRequestForKit(
      {
        partnerId: this.options.partnerId,
        policyId: this.options.policyId,
        environment: this.options.environment,
        baseUrl: this.options.baseUrl,
        appSlug: this.options.appSlug,
        applicationId: this.options.applicationId,
        apiKey: this.options.apiKey,
        policyPackId: this.options.policyPackId,
        bindingId: this.options.bindingId,
        requestStateStore: this.options.requestStateStore,
        fetchFn: this.options.fetchFn,
      },
      input,
    );
  }

  /** Verify callback, public receipt, and narrow authorized result in one server-side call. */
  async verifyCallbackWithNarrowResult(
    input: VerifyCallbackWithNarrowResultInput,
  ): Promise<VerifyCallbackWithNarrowResultResult> {
    const { verifyCallbackWithNarrowResultForKit } = await import("@/lib/partner/integrationKit/verificationRequest");
    return verifyCallbackWithNarrowResultForKit(this, input);
  }

  policyIntegrationCapabilities() {
    return resolvePolicyIntegrationCapabilities({
      policyPackId: this.options.policyPackId,
      policyId: this.options.policyId,
    });
  }

  parseCallback(
    search: URLSearchParams | Record<string, string | string[] | undefined>,
  ) {
    return parsePartnerCallbackParams(search);
  }

  async fetchNarrowPartnerResult(receiptId: string): Promise<
    { ok: true; result: NarrowPartnerResult } | { ok: false; errors: string[] }
  > {
    const fetchFn = this.options.fetchFn ?? fetch;
    const base = (this.options.baseUrl ?? SITE_URL).replace(/\/$/, "");
    try {
      const res = await fetchFn(`${base}/api/receipts/${encodeURIComponent(receiptId)}/narrow-result`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.status >= 500) {
        return { ok: false, errors: ["narrow_result_fetch_failed", "retry"] };
      }
      if (!res.ok) {
        return { ok: false, errors: ["narrow_result_missing"] };
      }
      const result = (await res.json()) as NarrowPartnerResult;
      if (result.schema_version !== PARTNER_INTEGRATION_NARROW_RESULT_SCHEMA_VERSION) {
        return { ok: false, errors: [`narrow_result_schema_unsupported:${result.schema_version ?? "missing"}`] };
      }
      if (result.partner_id !== this.options.partnerId) {
        return { ok: false, errors: [`narrow_result_partner_mismatch:expected=${this.options.partnerId},got=${result.partner_id ?? "missing"}`] };
      }
      if (result.policy_id !== this.options.policyId) {
        return { ok: false, errors: [`narrow_result_policy_mismatch:expected=${this.options.policyId},got=${result.policy_id ?? "missing"}`] };
      }
      return { ok: true, result };
    } catch {
      return { ok: false, errors: ["narrow_result_fetch_failed", "retry"] };
    }
  }

  extractProvenanceFromNarrowResult(result: NarrowPartnerResult): ProvenancePartnerFacts | null {
    return result.provenance ?? null;
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

  async verifyForAction(input: {
    receiptId: string;
    expectedPartnerId?: string;
    expectedPolicyId?: string;
    expectedPolicyVersion?: number;
    expectedEnvironment?: "sandbox" | "production";
    expectedBindingId?: string;
    expectedPackId?: string;
    expectedResultFamily?: string;
    binding?: ResolvedApplicationPolicyBinding;
    expectedRequestId?: string;
    callbackRequestId?: string | null;
    expectedPurpose?: string;
    expectedAction?: string;
  }): Promise<PartnerKitSafeResult> {
    const started = Date.now();
    const binding = input.binding ?? null;
    const partnerId = input.expectedPartnerId ?? binding?.partner_id ?? this.options.partnerId;
    const policyId = input.expectedPolicyId ?? binding?.policy_id ?? this.options.policyId;
    const environment = input.expectedEnvironment ?? binding?.environment ?? this.options.environment;
    const policyVersion = input.expectedPolicyVersion ?? binding?.policy_version ?? this.options.policyVersion;
    const expectedBindingId = input.expectedBindingId ?? binding?.binding_id ?? this.options.bindingId;
    const expectedPackId = input.expectedPackId ?? binding?.pack_id ?? this.options.policyPackId;
    const expectedResultFamily = input.expectedResultFamily ?? binding?.result_family ?? this.options.resultFamily;

    const fetched = await this.fetchPublicReceipt(input.receiptId);
    if (!fetched.ok) {
      const denied = emptyResult({
        outcome: outcomeFromValidationErrors(fetched.errors),
        errors: fetched.errors,
        receipt_id: input.receiptId,
      });
      void this.emitVerificationTelemetry(input, denied, Date.now() - started);
      return denied;
    }

    const receipt = fetched.receipt;
    const errors: string[] = [];

    const mode = environment === "production" ? "production" : "sandbox";
    const validation = validatePartnerFlowPublicReceipt(receipt, {
      partnerId,
      policyId,
      mode,
    });
    errors.push(...validation.errors);

    if (policyVersion != null) {
      const version = (receipt as typeof receipt & { policy_version?: number }).policy_version;
      if (version == null || Number.isNaN(Number(version))) {
        errors.push("policy_version_missing");
      } else if (Number(version) !== policyVersion) {
        errors.push(`policy_version_mismatch:expected=${policyVersion},got=${version}`);
      }
    }

    if (receipt.schema_version && receipt.schema_version !== PARTNER_INTEGRATION_RECEIPT_SCHEMA_VERSION) {
      errors.push(`schema_version_unsupported:${receipt.schema_version}`);
    }

    if (expectedBindingId && this.options.bindingId && expectedBindingId !== this.options.bindingId) {
      errors.push("POLICY_BINDING_NOT_FOUND");
    }

    if (binding) {
      errors.push(...assertReceiptMatchesBinding({
        binding,
        receiptPolicyId: receipt.policy_id,
        receiptPolicyVersion: (receipt as typeof receipt & { policy_version?: number }).policy_version,
        receiptPartnerId: receipt.partner_id,
        receiptEnvironment: environment,
      }));
    } else if (expectedPackId || expectedResultFamily) {
      const inferred = inferPolicyPackFromPolicyId(receipt.policy_id ?? "");
      if (expectedPackId && inferred?.id !== expectedPackId) {
        errors.push("RECEIPT_PACK_MISMATCH");
      }
      if (expectedResultFamily && inferred?.disclosed_result !== expectedResultFamily) {
        errors.push("RECEIPT_RESULT_FAMILY_MISMATCH");
      }
    }

    errors.push(...await validateUniversalRequestCorrelation({
      expectedRequestId: input.expectedRequestId,
      callbackRequestId: input.callbackRequestId,
      partnerId,
      policyId,
      environment,
      purpose: input.expectedPurpose,
      requestStateStore: this.options.requestStateStore,
    }));

    if (receipt.currently_valid === false || receipt.lifecycle_status === "superseded" || receipt.lifecycle_status === "revoked") {
      void this.emitCurrentValidityTelemetry(input.receiptId, receipt, partnerId, policyId);
    }

    const result = errors.length === 0 && validation.ok
      ? safeFromReceipt(receipt, "permitted", [])
      : safeFromReceipt(receipt, outcomeFromValidationErrors(errors), errors);
    void this.emitVerificationTelemetry(input, result, Date.now() - started);
    return result;
  }

  private async emitCurrentValidityTelemetry(
    receiptId: string,
    receipt: PartnerFlowPublicReceipt,
    partnerId: string,
    policyId: string,
  ): Promise<void> {
    if (this.options.reportVerificationTelemetry === false) return;
    if (!this.options.applicationId && this.options.reportVerificationTelemetry !== true) return;
    try {
      const { recordIntegrationEventBestEffort } = await import("@/lib/partner/integrationObservability/record");
      await recordIntegrationEventBestEffort({
        partnerId,
        applicationId: this.options.applicationId ?? null,
        environment: this.options.environment,
        eventType: "receipt_current_validity_failed",
        lifecycleStage: "receipt",
        outcome: receipt.lifecycle_status ?? "invalidated",
        partnerSafeReason: (receipt.partner_safe_reason as import("@/lib/partner/integrationObservability/contract").PartnerSafeFailureCode | null) ?? "receipt_invalid",
        receiptId,
        policyId,
        policyVersion: this.options.policyVersion ?? null,
        metadata: { outcome_class: receipt.partner_safe_reason ?? "invalid" },
      });
    } catch {
      // Telemetry must never affect verification.
    }
  }

  private async emitVerificationTelemetry(
    input: {
      receiptId: string;
      expectedRequestId?: string;
      expectedEnvironment?: "sandbox" | "production";
    },
    result: PartnerKitSafeResult,
    latencyMs: number,
  ): Promise<void> {
    if (this.options.reportVerificationTelemetry === false) return;
    if (!this.options.applicationId && this.options.reportVerificationTelemetry !== true) return;
    try {
      const { instrumentVerifyForActionResult } = await import("@/lib/partner/integrationObservability/instrument");
      await instrumentVerifyForActionResult({
        options: this.options,
        verifyInput: input,
        result,
        latencyMs,
      });
    } catch {
      // Telemetry must never affect verification.
    }
  }

  async verifyEligibilityPresentation(
    envelope: unknown,
    expected: {
      verifier_nonce: string;
      policy_id: string;
      policy_version: number;
      action: string;
      environment: "sandbox" | "production";
    },
  ) {
    const { verifyPresentationWithKit } = await import("@/lib/eligibilityPresentation/kit");
    return verifyPresentationWithKit(this, envelope, expected);
  }
}

export function permitProtocolAction(result: PartnerKitSafeResult): boolean {
  return result.outcome === "permitted" && result.action === "permit";
}
