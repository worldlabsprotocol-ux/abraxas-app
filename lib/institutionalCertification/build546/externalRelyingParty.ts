// FILE: lib/institutionalCertification/build546/externalRelyingParty.ts
// Minimal external relying party — verify, consume once, audit outcome.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  verifyReceiptIndependently,
  type IndependentVerifierResult,
  type RevocationSourceState,
} from "./independentVerifier";
import type { ReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { InMemoryReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";

export interface ExternalRpConfig {
  partnerId: string;
  policyId: string;
  allowSandbox?: boolean;
  env?: Record<string, string | undefined>;
  /** Defaults to in-memory (Build #546). Build #547 supplies filesystem store for durability tests. */
  consumptionStore?: ReceiptConsumptionStore;
}

export interface ExternalRpDecisionAudit {
  request_id: string;
  receipt_id: string;
  at: string;
  outcome: "granted" | "denied" | "blocked";
  verifier: IndependentVerifierResult;
  consumption_recorded: boolean;
  replay_detected: boolean;
  consumption_id?: string | null;
  partner_visible: Record<string, string>;
}

export class ExternalRelyingPartyHarness {
  private readonly store: ReceiptConsumptionStore;
  private readonly auditLog: ExternalRpDecisionAudit[] = [];

  constructor(private readonly config: ExternalRpConfig) {
    this.store = config.consumptionStore ?? new InMemoryReceiptConsumptionStore();
  }

  getConsumptionStore(): ReceiptConsumptionStore {
    return this.store;
  }

  getAuditLog(): readonly ExternalRpDecisionAudit[] {
    return this.auditLog;
  }

  async decide(input: {
    requestId: string;
    signedRecord?: DecisionReceiptRecord;
    publicReceipt?: PartnerFlowPublicReceipt;
    now?: Date;
    revocationSource?: RevocationSourceState;
    singleUse?: boolean;
  }): Promise<ExternalRpDecisionAudit> {
    const receiptId =
      input.signedRecord?.id
      ?? input.publicReceipt?.receipt_id
      ?? "unknown";
    const now = input.now ?? new Date();
    const singleUse = input.singleUse !== false;

    const alreadyConsumed = singleUse && (await this.store.hasConsumed(receiptId));

    if (alreadyConsumed) {
      const blocked = verifyReceiptIndependently({
        signedRecord: input.signedRecord,
        publicReceipt: input.publicReceipt,
        expectations: {
          partnerId: this.config.partnerId,
          policyId: this.config.policyId,
          allowSandbox: this.config.allowSandbox,
        },
        now,
        env: this.config.env,
        revocationSource: input.revocationSource,
      });
      const audit: ExternalRpDecisionAudit = {
        request_id: input.requestId,
        receipt_id: receiptId,
        at: now.toISOString(),
        outcome: "denied",
        verifier: blocked,
        consumption_recorded: false,
        replay_detected: true,
        consumption_id: null,
        partner_visible: {
          result: "deny_replay",
          receipt_id: receiptId,
        },
      };
      this.auditLog.push(audit);
      return audit;
    }

    const verifier = verifyReceiptIndependently({
      signedRecord: input.signedRecord,
      publicReceipt: input.publicReceipt,
      expectations: {
        partnerId: this.config.partnerId,
        policyId: this.config.policyId,
        allowSandbox: this.config.allowSandbox,
      },
      now,
      env: this.config.env,
      revocationSource: input.revocationSource,
    });

    let outcome: ExternalRpDecisionAudit["outcome"] = "denied";
    if (verifier.verdict === "blocked") outcome = "blocked";
    else if (verifier.verdict === "authorize" && verifier.currently_authorizable) outcome = "granted";

    let consumptionRecorded = false;
    let replayDetected = false;
    let consumptionId: string | null = null;

    if (outcome === "granted" && singleUse) {
      const attempt = await this.store.tryRecordConsumption({
        receiptId,
        requestId: input.requestId,
        partnerId: this.config.partnerId,
        at: now.toISOString(),
      });
      if (attempt.status === "replay") {
        outcome = "denied";
        replayDetected = true;
        consumptionRecorded = false;
      } else {
        consumptionRecorded = true;
        consumptionId = attempt.consumption_id;
      }
    }

    const audit: ExternalRpDecisionAudit = {
      request_id: input.requestId,
      receipt_id: receiptId,
      at: now.toISOString(),
      outcome,
      verifier,
      consumption_recorded: consumptionRecorded,
      replay_detected: replayDetected,
      consumption_id: consumptionId,
      partner_visible: {
        result: outcome === "granted" ? "permit" : replayDetected ? "deny_replay" : outcome === "blocked" ? "blocked" : "deny",
        receipt_id: receiptId,
        policy_id: this.config.policyId,
      },
    };
    this.auditLog.push(audit);
    return audit;
  }
}
