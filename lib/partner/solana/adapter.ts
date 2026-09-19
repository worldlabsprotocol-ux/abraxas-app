// FILE: lib/partner/solana/adapter.ts
// Solana partner adapter. Uses @solana/kit for optional program id checks only.

import { address } from "@solana/kit";
import {
  AbraxasPartnerKit,
  permitProtocolAction,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  SOLANA_NO_FUNDS_BOUNDARY,
  SOLANA_PARTNER_ACTIONS,
  type SolanaPartnerAction,
} from "@/lib/partner/solana/contract";
import {
  toClientVisibleResult,
  type SolanaClientVisibleResult,
} from "@/lib/partner/solana/clientVisible";

export interface AbraxasSolanaPartnerAdapterOptions extends AbraxasPartnerKitOptions {
  /** Optional Solana program id. Validated with @solana/kit address(). Never used to send a transaction. */
  partnerProgramId?: string;
}

export class AbraxasSolanaPartnerAdapter {
  readonly kit: AbraxasPartnerKit;
  readonly partnerProgramId: string | null;
  readonly fundsMovement = false as const;
  readonly createsTransactions = false as const;
  readonly boundary = SOLANA_NO_FUNDS_BOUNDARY;

  constructor(options: AbraxasSolanaPartnerAdapterOptions) {
    const { partnerProgramId, ...kitOptions } = options;
    this.kit = new AbraxasPartnerKit(kitOptions);
    this.partnerProgramId = partnerProgramId?.trim() || null;
    if (this.partnerProgramId) {
      address(this.partnerProgramId);
    }
  }

  startPolicyVerification(returnUrl: string): string {
    return this.kit.createHostedVerificationUrl(returnUrl);
  }

  async verifySignedReceipt(receiptId: string): Promise<PartnerKitSafeResult> {
    return this.kit.verifyReceiptId(receiptId);
  }

  async verifyCallback(
    search: URLSearchParams | Record<string, string | string[] | undefined>,
  ): Promise<PartnerKitSafeResult> {
    return this.kit.verifyCallback(search);
  }

  evaluateFetchedReceipt(receipt: PartnerFlowPublicReceipt): PartnerKitSafeResult {
    return this.kit.evaluateFetchedReceipt(receipt);
  }

  bindPartnerAction(
    result: PartnerKitSafeResult,
    action: SolanaPartnerAction,
  ): SolanaClientVisibleResult {
    if (!SOLANA_PARTNER_ACTIONS.includes(action)) {
      return { allowed: false, reason: "invalid", action: "claim_access" };
    }
    if (!permitProtocolAction(result)) {
      return toClientVisibleResult(result, action);
    }
    return { allowed: true, reason: "permitted", action };
  }
}

export function parseSolanaPartnerProgramId(value: string): { ok: true } | { ok: false; reason: "invalid_program" } {
  try {
    address(value);
    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid_program" };
  }
}
