// FILE: lib/partner/portableActionContract/adapter.ts
// Generic portable action adapter. Reuses Partner Kit. No execution.

import {
  AbraxasPartnerKit,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  PORTABLE_ACTION_BOUNDARY,
  PORTABLE_ACTION_CLIENT_VISIBLE_KEYS,
  PORTABLE_ACTION_NOT_EXECUTION,
  type PortableActionClientResult,
  type PortableActionContract,
} from "./contract";
import { issuePortableActionContract } from "./issue";
import { preflightPortableAction } from "./preflight";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";

export interface AbraxasPortableActionAdapterOptions extends AbraxasPartnerKitOptions {}

export class AbraxasPortableActionAdapter {
  readonly kit: AbraxasPartnerKit;
  readonly fundsMovement = false as const;
  readonly createsTransactions = false as const;
  readonly createsPayments = false as const;
  readonly createsTrades = false as const;
  readonly connectsWallet = false as const;
  readonly executesAction = false as const;
  readonly boundary = PORTABLE_ACTION_BOUNDARY;
  readonly executionNotice = PORTABLE_ACTION_NOT_EXECUTION;

  constructor(options: AbraxasPortableActionAdapterOptions) {
    this.kit = new AbraxasPartnerKit(options);
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

  issueActionContract(input: {
    action_type: string;
    action_scope?: string;
    wallet_binding?: string;
    ttlMs?: number;
    now?: Date;
    network_id?: string;
  }): PortableActionContract | { ok: false; reason: "action_mismatch" } {
    return issuePortableActionContract({
      kit: this.kit,
      action_type: input.action_type,
      action_scope: input.action_scope,
      wallet_binding: input.wallet_binding,
      ttlMs: input.ttlMs,
      now: input.now,
      network_id: input.network_id,
    });
  }

  async preflight(input: {
    result: PartnerKitSafeResult;
    contract: PortableActionContract;
    action_type?: string;
    action_scope?: string;
    binding_ref?: string | null;
  }): Promise<PortableActionClientResult> {
    const result = await preflightPortableAction({
      kit: this.kit,
      result: input.result,
      contract: input.contract,
      action_type: input.action_type,
      action_scope: input.action_scope,
      binding_ref: input.binding_ref,
    });
    return (pickAllowedKeys(result, PORTABLE_ACTION_CLIENT_VISIBLE_KEYS) ?? result) as unknown as PortableActionClientResult;
  }
}
