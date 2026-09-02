// FILE: examples/good-trouble-wix/backend/wixNonceStore.test.js

import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MAX_OUTSTANDING_PENDING_FLOWS } from "./constants.js";

const STORE_SOURCE = readFileSync(
  new URL("./wixNonceStore.js", import.meta.url),
  "utf8",
);
const WEB_SOURCE = readFileSync(
  new URL("./abraxasVerification.web.js", import.meta.url),
  "utf8",
);

const BACKEND_WRITE_OPTIONS = { suppressAuth: true };
const BACKEND_READ_OPTIONS = { suppressAuth: true, consistentRead: true };

const findMock = vi.fn(async () => ({ items: [] }));
const countMock = vi.fn(async () => 0);
const queryChain = {
  eq: vi.fn(function eq() { return this; }),
  gt: vi.fn(function gt() { return this; }),
  le: vi.fn(function le() { return this; }),
  limit: vi.fn(function limit() { return this; }),
  find: findMock,
  count: countMock,
};

const wixDataMock = {
  insert: vi.fn(async (_collection, record) => ({ ...record, _id: "rec_1" })),
  get: vi.fn(async () => ({
    _id: "rec_1",
    flowId: "gtf_" + "a".repeat(64),
    state: "pending",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  })),
  update: vi.fn(async (_collection, record) => record),
  remove: vi.fn(async () => ({})),
  query: vi.fn(() => queryChain),
};

vi.mock("wix-data", () => ({
  default: wixDataMock,
}));

const { createWixNonceStore } = await import("./wixNonceStore.js");
const { createAbraxasVerificationStartService } = await import("./abraxasVerificationService.js");
const { createMemoryNonceStore } = await import("./memoryNonceStore.js");

describe("wixNonceStore deployment contract", () => {
  it("documents Admin-only collection permissions and backend-only suppressAuth", () => {
    expect(STORE_SOURCE).toContain("Admin only");
    expect(STORE_SOURCE).toContain("suppressAuth");
    expect(STORE_SOURCE).toContain("consistentRead");
    expect(STORE_SOURCE).not.toMatch(/suppressAuth.*webMethod|webMethod.*suppressAuth/);
  });

  it("does not expose suppressAuth through web-method arguments", () => {
    expect(WEB_SOURCE).not.toContain("suppressAuth");
    expect(WEB_SOURCE).not.toMatch(/async\s*\([^)]*suppressAuth/);
  });
});

describe("wixNonceStore elevated backend access", () => {
  /** @type {ReturnType<typeof createWixNonceStore>} */
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    countMock.mockResolvedValue(0);
    store = createWixNonceStore();
  });

  it("passes suppressAuth on insert", async () => {
    const record = {
      flowId: "gtf_" + "b".repeat(64),
      verifierChallenge: "c".repeat(64),
      state: "pending",
      createdAt: new Date(),
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    };
    await store.insert(record);
    expect(wixDataMock.insert).toHaveBeenCalledWith(
      "AbraxasVerificationNonces",
      record,
      BACKEND_WRITE_OPTIONS,
    );
  });

  it("passes suppressAuth and consistentRead on findByFlowId query", async () => {
    await store.findByFlowId("gtf_" + "a".repeat(64));
    expect(findMock).toHaveBeenCalledWith(BACKEND_READ_OPTIONS);
  });

  it("passes suppressAuth and consistentRead on updateGuarded read before write", async () => {
    await store.updateGuarded("rec_1", { state: "validating" }, { expectedState: "pending" });
    expect(wixDataMock.get).toHaveBeenCalledWith(
      "AbraxasVerificationNonces",
      "rec_1",
      BACKEND_READ_OPTIONS,
    );
    expect(wixDataMock.update).toHaveBeenCalledWith(
      "AbraxasVerificationNonces",
      expect.objectContaining({ _id: "rec_1", state: "validating" }),
      BACKEND_WRITE_OPTIONS,
    );
  });

  it("preserves validation guards before privileged update", async () => {
    wixDataMock.get.mockResolvedValueOnce({
      _id: "rec_1",
      flowId: "gtf_" + "a".repeat(64),
      state: "consumed",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    const result = await store.updateGuarded("rec_1", { state: "validating" }, {
      expectedState: "pending",
    });
    expect(result).toBeNull();
    expect(wixDataMock.update).not.toHaveBeenCalled();
  });

  it("returns the numeric count from Wix Data count()", async () => {
    countMock.mockResolvedValueOnce(3);
    const count = await store.countPending(new Date("2026-01-01T00:00:00.000Z"));
    expect(count).toBe(3);
    expect(typeof count).toBe("number");
  });

  it("passes suppressAuth and consistentRead on countPending", async () => {
    countMock.mockResolvedValueOnce(3);
    await store.countPending(new Date("2026-01-01T00:00:00.000Z"));
    expect(countMock).toHaveBeenCalledWith(BACKEND_READ_OPTIONS);
  });

  it.each([
    ["undefined", undefined],
    ["object-shaped result", { totalCount: 5 }],
    ["negative", -1],
    ["non-integer", 1.5],
    ["NaN", Number.NaN],
  ])("fails closed when count() returns %s", async (_label, invalidCount) => {
    countMock.mockResolvedValueOnce(invalidCount);
    await expect(store.countPending(new Date("2026-01-01T00:00:00.000Z"))).rejects.toThrow(
      "Invalid pending-flow count returned by Wix Data",
    );
  });

  it("passes suppressAuth on removeById", async () => {
    await store.removeById("rec_1");
    expect(wixDataMock.remove).toHaveBeenCalledWith(
      "AbraxasVerificationNonces",
      "rec_1",
      BACKEND_WRITE_OPTIONS,
    );
  });

  it("passes read options on purge queries and write options on purge removes", async () => {
    findMock
      .mockResolvedValueOnce({ items: [{ _id: "expired_1" }] })
      .mockResolvedValueOnce({ items: [{ _id: "consumed_1" }] });

    const removed = await store.purgeStale(new Date("2026-01-01T00:00:00.000Z"));

    expect(removed).toBe(2);
    expect(findMock).toHaveBeenCalledTimes(2);
    expect(findMock).toHaveBeenCalledWith(BACKEND_READ_OPTIONS);
    expect(wixDataMock.remove).toHaveBeenCalledTimes(2);
    expect(wixDataMock.remove).toHaveBeenCalledWith(
      "AbraxasVerificationNonces",
      "expired_1",
      BACKEND_WRITE_OPTIONS,
    );
    expect(wixDataMock.remove).toHaveBeenCalledWith(
      "AbraxasVerificationNonces",
      "consumed_1",
      BACKEND_WRITE_OPTIONS,
    );
  });
});

describe("wixNonceStore capacity enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countMock.mockResolvedValue(0);
  });

  it("prevents another flow when countPending reports cap reached", async () => {
    countMock.mockResolvedValue(MAX_OUTSTANDING_PENDING_FLOWS);
    const store = createWixNonceStore();
    const now = new Date("2026-01-01T00:00:00.000Z");

    const result = await createAbraxasVerificationStartService(null, {
      store,
      skipCaptcha: true,
      now,
    });

    expect(result).toEqual({ error: "rate_limited" });
    expect(wixDataMock.insert).not.toHaveBeenCalled();
  });

  it("does not permit flow creation when countPending fails closed on invalid count", async () => {
    countMock.mockResolvedValueOnce(undefined);
    const store = createWixNonceStore();
    const now = new Date("2026-01-01T00:00:00.000Z");

    await expect(
      createAbraxasVerificationStartService(null, {
        store,
        skipCaptcha: true,
        now,
      }),
    ).rejects.toThrow("Invalid pending-flow count returned by Wix Data");
    expect(wixDataMock.insert).not.toHaveBeenCalled();
  });
});

describe("anonymous web-method flow vs direct collection access", () => {
  it("allows anonymous backend flow start when store is injected (no membership required)", async () => {
    const store = createMemoryNonceStore();
    const result = await createAbraxasVerificationStartService(null, {
      store,
      skipCaptcha: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.flowId).toMatch(/^gtf_[a-f0-9]{64}$/);
    expect(result.verifier).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps suppressAuth internal to wixNonceStore — not a caller-controlled option", () => {
    expect(STORE_SOURCE).toContain("BACKEND_WRITE_OPTIONS");
    expect(STORE_SOURCE).toContain("BACKEND_READ_OPTIONS");
    expect(STORE_SOURCE).not.toMatch(/function createWixNonceStore\([^)]*options/);
    expect(WEB_SOURCE).not.toContain("suppressAuth");
  });
});
