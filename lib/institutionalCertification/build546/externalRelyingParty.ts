// FILE: lib/institutionalCertification/build546/externalRelyingParty.ts
// Minimal external relying party — verify, consume once, audit outcome (in-memory).

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  verifyReceiptIndependently,
  type IndependentVerifierResult,
  type RevocationSourceState,
} from "./independentVerifier";

export interface ExternalRpConfig {
  partnerId: string;
  policyId: string;
  allowSandbox?: boolean;
  env?: Record<string, string | undefined>;
}

export interface ExternalRpDecisionAudit {
  request_id: string;
  receipt_id: string;
  at: string;
  outcome: "granted" | "denied" | "blocked";
  verifier: IndependentVerifierResult;
  consumption_recorded: boolean;
  replay_detected: boolean;
  partner_visible: Record<string, string>;
}

export class ExternalRelyingPartyHarness {
  private readonly consumed = new Set<string>();
  private readonly auditLog: ExternalRpDecisionAudit[] = [];

  constructor(private readonly config: ExternalRpConfig) {}

  getAuditLog(): readonly ExternalRpDecisionAudit[] {
    return this.auditLog;
  }

  decide(input: {
    requestId: string;
    signedRecord?: DecisionReceiptRecord;
    publicReceipt?: PartnerFlowPublicReceipt;
    now?: Date;
    revocationSource?: RevocationSourceState;
    singleUse?: boolean;
  }): ExternalRpDecisionAudit {
    const receiptId =
      input.signedRecord?.id
      ?? input.publicReceipt?.receipt_id
      ?? "unknown";
    const now = input.now ?? new Date();
    const replayDetected = this.consumed.has(receiptId);

    if (input.singleUse !== false && replayDetected) {
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
    if (outcome === "granted") {
      this.consumed.add(receiptId);
      consumptionRecorded = true;
    }

    const audit: ExternalRpDecisionAudit = {
      request_id: input.requestId,
      receipt_id: receiptId,
      at: now.toISOString(),
      outcome,
      verifier,
      consumption_recorded: consumptionRecorded,
      replay_detected: false,
      partner_visible: {
        result: outcome === "granted" ? "permit" : outcome === "blocked" ? "blocked" : "deny",
        receipt_id: receiptId,
        policy_id: this.config.policyId,
      },
    };
    this.auditLog.push(audit);
    return audit;
  }
}
