import { appendFile, mkdir, writeFile, readdir, readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// ../../lib/institutionalCertification/build547/receiptConsumptionStore.ts
var BUILD_548_REPLAY_SCOPE = "single_use_partner_policy_receipt_v1";
function buildCanonicalReplayKey(scope) {
  const scopeId = scope.scope ?? BUILD_548_REPLAY_SCOPE;
  const material = [
    scopeId,
    scope.partnerId.trim(),
    scope.policyId.trim(),
    scope.receiptId.trim()
  ].join("\0");
  return createHash("sha256").update(material).digest("hex");
}
function consumptionIdForAttempt(scope, requestId) {
  return createHash("sha256").update(`${buildCanonicalReplayKey(scope)}:${requestId}`).digest("hex").slice(0, 24);
}

// ../../lib/institutionalCertification/build547/receiptConsumptionStore.ts
function markerFileName(scope) {
  return `${buildCanonicalReplayKey(scope)}.json`;
}
var FileReceiptConsumptionStore = class {
  kind = "filesystem";
  consumedDir;
  auditPath;
  instanceId;
  appendAudit;
  constructor(baseDir, instanceId = `inst-${process.pid}`, options) {
    this.consumedDir = join(baseDir, "consumed");
    this.auditPath = join(baseDir, "consumption-audit.jsonl");
    this.instanceId = instanceId;
    this.appendAudit = options?.appendAudit ?? ((path, line) => appendFile(path, line, "utf8"));
  }
  async init() {
    await mkdir(this.consumedDir, { recursive: true });
  }
  async tryRecordConsumption(input) {
    await this.init();
    const scope = {
      partnerId: input.partnerId,
      policyId: input.policyId,
      receiptId: input.receiptId
    };
    const marker = join(this.consumedDir, markerFileName(scope));
    const id = consumptionIdForAttempt(scope, input.requestId);
    const payload = JSON.stringify({
      consumption_id: id,
      receipt_id: input.receiptId,
      request_id: input.requestId,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      recorded_at: input.at,
      instance_id: this.instanceId
    });
    try {
      await writeFile(marker, payload, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      const code = error?.code;
      if (code === "EEXIST") {
        return { status: "replay", consumption_id: null };
      }
      throw error;
    }
    const auditLine = `${payload}
`;
    try {
      await this.appendAudit(this.auditPath, auditLine);
    } catch (error) {
      const audit_error = error instanceof Error ? error.message : "audit_append_failed";
      return { status: "audit_append_failed", consumption_id: id, audit_error };
    }
    return { status: "recorded", consumption_id: id };
  }
  async reconcileAuditFromMarkers() {
    await this.init();
    let backfilled = 0;
    let skipped = 0;
    const existing = await this.listAudit(1e4);
    const loggedKeys = new Set(
      existing.map(
        (e) => buildCanonicalReplayKey({
          partnerId: e.partner_id,
          policyId: e.policy_id ?? "",
          receiptId: e.receipt_id
        })
      )
    );
    let names = [];
    try {
      names = await readdir(this.consumedDir);
    } catch {
      return { backfilled: 0, skipped: 0 };
    }
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readFile(join(this.consumedDir, name), "utf8");
      const entry = JSON.parse(raw);
      const key = buildCanonicalReplayKey({
        partnerId: entry.partner_id,
        policyId: entry.policy_id ?? "",
        receiptId: entry.receipt_id
      });
      if (loggedKeys.has(key)) {
        skipped += 1;
        continue;
      }
      await this.appendAudit(this.auditPath, `${raw.trim()}
`);
      loggedKeys.add(key);
      backfilled += 1;
    }
    return { backfilled, skipped };
  }
  async hasConsumed(scope) {
    const marker = join(this.consumedDir, markerFileName(scope));
    try {
      await access(marker, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
  async listAudit(limit = 200) {
    try {
      const raw = await readFile(this.auditPath, "utf8");
      const lines = raw.trim().split("\n").filter(Boolean);
      return lines.slice(-limit).map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  }
};

export { FileReceiptConsumptionStore };
//# sourceMappingURL=consumption.js.map
//# sourceMappingURL=consumption.js.map