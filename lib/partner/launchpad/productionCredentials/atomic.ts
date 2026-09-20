// FILE: lib/partner/launchpad/productionCredentials/atomic.ts
// Pure planner for the durable Production-credential transaction.
// Production uses the SQL RPC; tests use a serialized store that mimics FOR UPDATE.

export type AtomicCredentialAction = "issue" | "rotate" | "revoke";

export interface AtomicCredentialSnapshot {
  requestStatus: string;
  requestPartnerId: string;
  applicationId: string;
  applicationPartnerId: string;
  environment: string;
  productionApiKeyId: string | null;
  activeLive: boolean;
}

export type AtomicCredentialPlan =
  | { kind: "deny"; code: string; credential_state?: "never_issued" | "active" | "revoked" }
  | { kind: "already_issued" }
  | { kind: "already_revoked"; credential_state: "never_issued" | "revoked" }
  | { kind: "revoke"; keyId: string }
  | { kind: "insert" }
  | { kind: "rotate"; revokeId: string };

export function planProductionCredentialOp(
  snapshot: AtomicCredentialSnapshot,
  action: AtomicCredentialAction,
): AtomicCredentialPlan {
  if (snapshot.applicationPartnerId !== snapshot.requestPartnerId) {
    return { kind: "deny", code: "not_found" };
  }
  if (action === "revoke") {
    if (!snapshot.activeLive) {
      return {
        kind: "already_revoked",
        credential_state: snapshot.productionApiKeyId ? "revoked" : "never_issued",
      };
    }
    return { kind: "revoke", keyId: snapshot.productionApiKeyId! };
  }
  if (snapshot.requestStatus !== "approved") {
    return { kind: "deny", code: "review_not_approved" };
  }
  if (action === "issue") {
    if (snapshot.activeLive) return { kind: "already_issued" };
    return { kind: "insert" };
  }
  if (!snapshot.activeLive || !snapshot.productionApiKeyId) {
    return {
      kind: "deny",
      code: "rotation_not_available",
      credential_state: snapshot.productionApiKeyId ? "revoked" : "never_issued",
    };
  }
  return { kind: "rotate", revokeId: snapshot.productionApiKeyId };
}

export interface DurableKeyRow {
  id: string;
  partnerId: string;
  applicationId: string;
  prefix: string;
  hash: string;
  revoked: boolean;
}

export interface DurableAppRow {
  id: string;
  partnerId: string;
  environment: string;
  productionApiKeyId: string | null;
}

export interface DurableRequestRow {
  id: string;
  applicationId: string;
  partnerId: string;
  status: string;
}

export function countActiveLiveKeys(keys: DurableKeyRow[], applicationId: string): number {
  return keys.filter((key) => key.applicationId === applicationId && !key.revoked && key.prefix.startsWith("abx_live_")).length;
}

/** Test-only store: one promise chain per application simulates SELECT FOR UPDATE. */
export class SerializedProductionCredentialStore {
  requests = new Map<string, DurableRequestRow>();
  apps = new Map<string, DurableAppRow>();
  keys: DurableKeyRow[] = [];
  failNextInsert = false;
  private locks = new Map<string, Promise<void>>();

  async transact<T>(applicationId: string, work: () => T | Promise<T>): Promise<T> {
    const prior = this.locks.get(applicationId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(applicationId, prior.then(() => gate));
    await prior;
    try {
      return await work();
    } finally {
      release();
    }
  }

  snapshot(requestId: string): AtomicCredentialSnapshot | null {
    const request = this.requests.get(requestId);
    if (!request) return null;
    const app = this.apps.get(request.applicationId);
    if (!app || app.partnerId !== request.partnerId) return null;
    const key = app.productionApiKeyId ? this.keys.find((row) => row.id === app.productionApiKeyId) : undefined;
    return {
      requestStatus: request.status,
      requestPartnerId: request.partnerId,
      applicationId: app.id,
      applicationPartnerId: app.partnerId,
      environment: app.environment,
      productionApiKeyId: app.productionApiKeyId,
      activeLive: Boolean(key && !key.revoked && key.prefix.startsWith("abx_live_")),
    };
  }

  apply(
    requestId: string,
    action: AtomicCredentialAction,
    minted?: { id: string; prefix: string; hash: string },
  ): { code: string; ok: boolean; rawAllowed: boolean; environment: string; activeCount: number } {
    const request = this.requests.get(requestId);
    const snap = this.snapshot(requestId);
    if (!request || !snap) {
      return { code: "not_found", ok: false, rawAllowed: false, environment: "sandbox", activeCount: 0 };
    }
    const app = this.apps.get(request.applicationId)!;
    const plan = planProductionCredentialOp(snap, action);
    if (plan.kind === "deny") {
      return { code: plan.code, ok: false, rawAllowed: false, environment: app.environment, activeCount: countActiveLiveKeys(this.keys, app.id) };
    }
    if (plan.kind === "already_issued") {
      return { code: "already_issued", ok: false, rawAllowed: false, environment: app.environment, activeCount: countActiveLiveKeys(this.keys, app.id) };
    }
    if (plan.kind === "already_revoked") {
      return { code: "already_revoked", ok: true, rawAllowed: false, environment: app.environment, activeCount: 0 };
    }
    if (plan.kind === "revoke") {
      const key = this.keys.find((row) => row.id === plan.keyId);
      if (key) key.revoked = true;
      return { code: "revoked", ok: true, rawAllowed: false, environment: app.environment, activeCount: countActiveLiveKeys(this.keys, app.id) };
    }
    if (this.failNextInsert) {
      this.failNextInsert = false;
      throw new Error("successor_write_failed");
    }
    if (!minted) {
      return { code: "invalid_input", ok: false, rawAllowed: false, environment: app.environment, activeCount: countActiveLiveKeys(this.keys, app.id) };
    }
    this.keys.push({
      id: minted.id,
      partnerId: app.partnerId,
      applicationId: app.id,
      prefix: minted.prefix,
      hash: minted.hash,
      revoked: false,
    });
    if (plan.kind === "rotate") {
      const previous = this.keys.find((row) => row.id === plan.revokeId);
      if (previous) previous.revoked = true;
    }
    app.productionApiKeyId = minted.id;
    return {
      code: plan.kind === "rotate" ? "rotated" : "issued",
      ok: true,
      rawAllowed: true,
      environment: app.environment,
      activeCount: countActiveLiveKeys(this.keys, app.id),
    };
  }
}
