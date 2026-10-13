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
  /** Verifier authorize + currently_authorizable at decision time (before consumption). */
  authorization_verified: boolean;
  /** Durable wx marker (or in-memory slot) committed for this receipt. */
  durable_consumption_marker: boolean;
  /** Append-only audit line persisted (false if marker exists but audit append failed). */
  durable_audit_logged: boolean;
  consumption_recorded: boolean;
  replay_detected: boolean;
  audit_append_failed?: boolean;
  persistence_unavailable?: boolean;
  consumption_id?: string | null;
  replay_key_scope?: string;
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

    const consumptionScope = {
      partnerId: this.config.partnerId,
      policyId: this.config.policyId,
      receiptId,
    };
    const alreadyConsumed = singleUse && (await this.store.hasConsumed(consumptionScope));

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
        authorization_verified:
          blocked.verdict === "authorize" && blocked.currently_authorizable,
        durable_consumption_marker: true,
        durable_audit_logged: false,
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

    const authorizationVerified =
      verifier.verdict === "authorize" && verifier.currently_authorizable;

    let consumptionRecorded = false;
    let replayDetected = false;
    let consumptionId: string | null = null;
    let durableConsumptionMarker = false;
    let durableAuditLogged = false;
    let auditAppendFailed = false;
    let persistenceUnavailable = false;

    if (outcome === "granted" && singleUse) {
      const attempt = await this.store.tryRecordConsumption({
        receiptId,
        requestId: input.requestId,
        partnerId: this.config.partnerId,
        policyId: this.config.policyId,
        at: now.toISOString(),
      });
      if (attempt.status === "replay") {
        outcome = "denied";
        replayDetected = true;
        consumptionRecorded = false;
        durableConsumptionMarker = true;
      } else if (attempt.status === "persistence_unavailable") {
        outcome = "blocked";
        persistenceUnavailable = true;
        consumptionRecorded = false;
        durableConsumptionMarker = false;
        durableAuditLogged = false;
      } else if (attempt.status === "audit_append_failed") {
        outcome = "denied";
        auditAppendFailed = true;
        consumptionId = attempt.consumption_id;
        durableConsumptionMarker = true;
        durableAuditLogged = false;
        consumptionRecorded = false;
      } else {
        consumptionRecorded = true;
        consumptionId = attempt.consumption_id;
        durableConsumptionMarker = true;
        durableAuditLogged = true;
      }
    }

    const audit: ExternalRpDecisionAudit = {
      request_id: input.requestId,
      receipt_id: receiptId,
      at: now.toISOString(),
      outcome,
      verifier,
      authorization_verified: authorizationVerified,
      durable_consumption_marker: durableConsumptionMarker,
      durable_audit_logged: durableAuditLogged,
      consumption_recorded: consumptionRecorded,
      replay_detected: replayDetected,
      audit_append_failed: auditAppendFailed || undefined,
      persistence_unavailable: persistenceUnavailable || undefined,
      consumption_id: consumptionId,
      replay_key_scope: "single_use_partner_policy_receipt_v1",
      partner_visible: {
        result:
          outcome === "granted"
            ? "permit"
            : persistenceUnavailable
              ? "blocked_persistence_unavailable"
              : auditAppendFailed
                ? "deny_audit_incomplete"
                : replayDetected
                  ? "deny_replay"
                  : outcome === "blocked"
                    ? "blocked"
                    : "deny",
        receipt_id: receiptId,
        policy_id: this.config.policyId,
      },
    };
    this.auditLog.push(audit);
    return audit;
  }
}
