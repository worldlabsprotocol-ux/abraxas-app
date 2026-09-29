// FILE: lib/partner/partnerActivitySignal/adapter.ts
// Optional activity-signal layer on top of the core receipt path.

import {
  AbraxasPartnerKit,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";
import {
  PARTNER_ACTIVITY_CLIENT_VISIBLE_KEYS,
  PARTNER_ACTIVITY_NO_RAW_DATA,
  PARTNER_ACTIVITY_NOT_ELIGIBILITY,
  rejectPartnerActivityClientOverride,
  type PartnerActivitySignalType,
} from "./contract";
import {
  issuePartnerActivitySignalBinding,
  type PartnerActivitySignalBinding,
} from "./bind";
import { activityCategoriesForPack } from "./categories";
import { preflightPartnerActivitySignal } from "./preflight";
import type { PartnerActivityClientVisibleResult } from "./clientVisible";
import type { PolicyPack } from "@/lib/partner/launchpad/policyPacks";

export interface AbraxasPartnerActivitySignalAdapterOptions extends AbraxasPartnerKitOptions {
  allowedCategories: readonly PartnerActivitySignalType[];
  purpose: string;
  actionScope: string;
  policyPack?: Pick<PolicyPack, "allowed_activity_categories"> | null;
}

export class AbraxasPartnerActivitySignalAdapter {
  readonly kit: AbraxasPartnerKit;
  readonly fundsMovement = false as const;
  readonly createsTransactions = false as const;
  readonly connectsWallet = false as const;
  readonly requiresZkLogin = false as const;
  readonly requiresApiKeys = false as const;
  readonly boundary = PARTNER_ACTIVITY_NO_RAW_DATA;
  readonly productBoundary = PARTNER_ACTIVITY_NOT_ELIGIBILITY;
  readonly allowedCategories: readonly PartnerActivitySignalType[];
  readonly purpose: string;
  readonly actionScope: string;

  constructor(options: AbraxasPartnerActivitySignalAdapterOptions) {
    this.kit = new AbraxasPartnerKit(options);
    this.allowedCategories = activityCategoriesForPack(options.policyPack ?? null, options.allowedCategories);
    this.purpose = options.purpose.trim();
    this.actionScope = options.actionScope.trim();
  }

  startPolicyVerification(returnUrl: string): string {
    return this.kit.createHostedVerificationUrl(returnUrl);
  }

  async verifySignedReceipt(receiptId: string): Promise<PartnerKitSafeResult> {
    return this.kit.verifyReceiptId(receiptId);
  }

  evaluateFetchedReceipt(receipt: PartnerFlowPublicReceipt): PartnerKitSafeResult {
    return this.kit.evaluateFetchedReceipt(receipt);
  }

  issueActivityBinding(input: {
    receipt_id: string;
    receipt_payload_hash: string;
    activity_signal_type: string;
    ttlMs?: number;
    now?: Date;
  }): PartnerActivitySignalBinding | { ok: false; reason: "invalid_activity_signal" | "invalid" } {
    return issuePartnerActivitySignalBinding({
      kit: this.kit,
      receipt_id: input.receipt_id,
      receipt_payload_hash: input.receipt_payload_hash,
      activity_signal_type: input.activity_signal_type,
      purpose: this.purpose,
      action_scope: this.actionScope,
      ttlMs: input.ttlMs,
      now: input.now,
    });
  }

  async preflight(input: {
    result: PartnerKitSafeResult;
    receipt_payload_hash: string;
    signal: unknown;
    binding: unknown;
  }): Promise<PartnerActivityClientVisibleResult> {
    const result = await preflightPartnerActivitySignal({
      kit: this.kit,
      result: input.result,
      receipt_payload_hash: input.receipt_payload_hash,
      signal: input.signal,
      binding: input.binding,
      allowed_categories: this.allowedCategories,
      expected_purpose: this.purpose,
      expected_action_scope: this.actionScope,
    });
    return (pickAllowedKeys(result, PARTNER_ACTIVITY_CLIENT_VISIBLE_KEYS) ?? result) as PartnerActivityClientVisibleResult;
  }
}
