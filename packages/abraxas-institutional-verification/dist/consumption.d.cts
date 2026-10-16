/** Single-use consumption scope — NOT keyed by request_id (retries cannot mint new grants). */
declare const BUILD_548_REPLAY_SCOPE: "single_use_partner_policy_receipt_v1";
type ReplayConsumptionScope = {
    partnerId: string;
    policyId: string;
    receiptId: string;
    scope?: typeof BUILD_548_REPLAY_SCOPE;
};

type ReceiptConsumptionStoreKind = "memory" | "filesystem" | "postgres";
type ConsumptionAttemptResult = {
    status: "recorded";
    consumption_id: string;
} | {
    status: "audit_append_failed";
    consumption_id: string;
    audit_error: string;
} | {
    status: "replay";
    consumption_id: string | null;
} | {
    status: "persistence_unavailable";
    error: string;
};
interface ConsumptionAuditEntry {
    consumption_id: string;
    receipt_id: string;
    request_id: string;
    partner_id: string;
    policy_id?: string;
    recorded_at: string;
    instance_id: string;
}
interface ReceiptConsumptionStore {
    readonly kind: ReceiptConsumptionStoreKind;
    tryRecordConsumption(input: {
        receiptId: string;
        requestId: string;
        partnerId: string;
        policyId: string;
        at: string;
    }): Promise<ConsumptionAttemptResult>;
    hasConsumed(scope: ReplayConsumptionScope): Promise<boolean>;
    listAudit(limit?: number): Promise<ConsumptionAuditEntry[]>;
    /** Filesystem certification store only — backfill audit.jsonl from wx markers. */
    reconcileAuditFromMarkers?(): Promise<{
        backfilled: number;
        skipped: number;
    }>;
}
type FileReceiptConsumptionStoreOptions = {
    /** Certification test hook — simulates crash after marker create. */
    appendAudit?: (auditPath: string, line: string) => Promise<void>;
};
/** Atomic `wx` marker files + append-only audit log — certification-scoped durability only. */
declare class FileReceiptConsumptionStore implements ReceiptConsumptionStore {
    readonly kind: "filesystem";
    private readonly consumedDir;
    private readonly auditPath;
    private readonly instanceId;
    private readonly appendAudit;
    constructor(baseDir: string, instanceId?: string, options?: FileReceiptConsumptionStoreOptions);
    init(): Promise<void>;
    tryRecordConsumption(input: {
        receiptId: string;
        requestId: string;
        partnerId: string;
        policyId: string;
        at: string;
    }): Promise<ConsumptionAttemptResult>;
    reconcileAuditFromMarkers(): Promise<{
        backfilled: number;
        skipped: number;
    }>;
    hasConsumed(scope: ReplayConsumptionScope): Promise<boolean>;
    listAudit(limit?: number): Promise<ConsumptionAuditEntry[]>;
}

export { type ConsumptionAttemptResult, type ConsumptionAuditEntry, FileReceiptConsumptionStore, type ReceiptConsumptionStore, type ReceiptConsumptionStoreKind, type ReplayConsumptionScope };
