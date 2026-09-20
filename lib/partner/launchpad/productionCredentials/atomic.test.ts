// FILE: lib/partner/launchpad/productionCredentials/atomic.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import {
  SerializedProductionCredentialStore,
  countActiveLiveKeys,
  planProductionCredentialOp,
} from "./atomic";

const SQL = readFileSync(
  resolve(process.cwd(), "supabase/migrations/095_partner_launchpad_production_credential_atomic.sql"),
  "utf8",
);

function seed(store: SerializedProductionCredentialStore, extra?: { status?: string; partner?: string }) {
  store.requests.set("req-1", {
    id: "req-1",
    applicationId: "app-1",
    partnerId: extra?.partner ?? "acme",
    status: extra?.status ?? "approved",
  });
  store.apps.set("app-1", {
    id: "app-1",
    partnerId: "acme",
    environment: "sandbox",
    productionApiKeyId: null,
  });
}

describe("095 atomic Production credential migration", () => {
  it("locks the application and request rows and enforces one active live key", () => {
    expect(SQL).toContain("partner_launchpad_operate_production_credential_atomic");
    expect(SQL).toContain("FOR UPDATE");
    expect(SQL).toContain("partner_api_keys_one_active_live_per_app");
    expect(SQL).toContain("launchpad_application_id");
    expect(SQL).toContain("GRANT EXECUTE");
    expect(SQL).toContain("TO postgres, service_role");
    expect(SQL).toContain("REVOKE EXECUTE");
    expect(SQL).not.toContain("environment = 'production'");
    expect(SQL).not.toMatch(/allowed_environments/);
    expect(SQL).not.toMatch(/p_raw|api_key\s/);
  });
});

describe("production credential atomic planner", () => {
  const base = {
    requestStatus: "approved",
    requestPartnerId: "acme",
    applicationId: "app-1",
    applicationPartnerId: "acme",
    environment: "sandbox",
    productionApiKeyId: null as string | null,
    activeLive: false,
  };

  it("denies cross-tenant snapshots and pending reviews", () => {
    expect(planProductionCredentialOp({ ...base, applicationPartnerId: "other" }, "issue").kind).toBe("deny");
    expect(planProductionCredentialOp({ ...base, requestStatus: "pending" }, "issue")).toMatchObject({
      kind: "deny",
      code: "review_not_approved",
    });
  });

  it("treats a second issue as already_issued and revoke replay as already_revoked", () => {
    expect(planProductionCredentialOp({ ...base, productionApiKeyId: "k1", activeLive: true }, "issue").kind).toBe("already_issued");
    expect(planProductionCredentialOp({ ...base, productionApiKeyId: "k1", activeLive: false }, "revoke")).toMatchObject({
      kind: "already_revoked",
      credential_state: "revoked",
    });
  });
});

describe("serialized durable store", () => {
  it("lets only one concurrent issue create an active live key", async () => {
    const store = new SerializedProductionCredentialStore();
    seed(store);
    const results = await Promise.all(
      [1, 2].map((n) =>
        store.transact("app-1", () => {
          const minted = generatePartnerKey("live");
          return store.apply("req-1", "issue", { id: `k-${n}`, prefix: minted.prefix, hash: minted.hash });
        }),
      ),
    );
    const issued = results.filter((row) => row.code === "issued");
    const blocked = results.filter((row) => row.code === "already_issued");
    expect(issued).toHaveLength(1);
    expect(blocked).toHaveLength(1);
    expect(blocked[0]?.rawAllowed).toBe(false);
    expect(countActiveLiveKeys(store.keys, "app-1")).toBe(1);
    expect(results.every((row) => row.environment === "sandbox")).toBe(true);
  });

  it("rotates concurrently without leaving two active live keys", async () => {
    const store = new SerializedProductionCredentialStore();
    seed(store);
    const first = generatePartnerKey("live");
    store.apply("req-1", "issue", { id: "k-1", prefix: first.prefix, hash: first.hash });
    const results = await Promise.all(
      [2, 3].map((n) =>
        store.transact("app-1", () => {
          const minted = generatePartnerKey("live");
          return store.apply("req-1", "rotate", { id: `k-${n}`, prefix: minted.prefix, hash: minted.hash });
        }),
      ),
    );
    expect(results.every((row) => row.ok && row.code === "rotated")).toBe(true);
    expect(countActiveLiveKeys(store.keys, "app-1")).toBe(1);
    expect(store.keys.filter((key) => key.revoked)).toHaveLength(2);
  });

  it("keeps the predecessor active when successor creation fails", () => {
    const store = new SerializedProductionCredentialStore();
    seed(store);
    const first = generatePartnerKey("live");
    store.apply("req-1", "issue", { id: "k-1", prefix: first.prefix, hash: first.hash });
    store.failNextInsert = true;
    expect(() =>
      store.apply("req-1", "rotate", { id: "k-2", prefix: "abx_live_xxxxxxx", hash: "a".repeat(64) }),
    ).toThrow("successor_write_failed");
    expect(store.apps.get("app-1")?.productionApiKeyId).toBe("k-1");
    expect(store.keys.find((key) => key.id === "k-1")?.revoked).toBe(false);
    expect(countActiveLiveKeys(store.keys, "app-1")).toBe(1);
  });

  it("replays revoke and issues a new key only after revocation", () => {
    const store = new SerializedProductionCredentialStore();
    seed(store);
    const first = generatePartnerKey("live");
    store.apply("req-1", "issue", { id: "k-1", prefix: first.prefix, hash: first.hash });
    expect(store.apply("req-1", "revoke").code).toBe("revoked");
    const replay = store.apply("req-1", "revoke");
    expect(replay).toMatchObject({ ok: true, code: "already_revoked", rawAllowed: false });
    const next = generatePartnerKey("live");
    const issued = store.apply("req-1", "issue", { id: "k-2", prefix: next.prefix, hash: next.hash });
    expect(issued.code).toBe("issued");
    expect(issued.rawAllowed).toBe(true);
    expect(store.keys.find((key) => key.id === "k-1")?.revoked).toBe(true);
    expect(countActiveLiveKeys(store.keys, "app-1")).toBe(1);
  });

  it("returns no raw secret on already_issued and isolates tenants", () => {
    const store = new SerializedProductionCredentialStore();
    seed(store);
    const minted = generatePartnerKey("live");
    const first = store.apply("req-1", "issue", { id: "k-1", prefix: minted.prefix, hash: minted.hash });
    expect(first.rawAllowed).toBe(true);
    const duplicate = store.apply("req-1", "issue", { id: "k-2", prefix: "abx_live_yyyyyyy", hash: "b".repeat(64) });
    expect(duplicate).toMatchObject({ ok: false, code: "already_issued", rawAllowed: false });
    seed(store, { partner: "other" });
    expect(store.apply("req-1", "issue", { id: "k-x", prefix: "abx_live_zzzzzzz", hash: "c".repeat(64) }).code).toBe("not_found");
  });
});
