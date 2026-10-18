import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeAccountStoreUnavailableError } from "./storeErrors";

vi.mock("@/lib/persistence/pgPool", () => ({
  queryAbraxasPg: vi.fn(),
}));

import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import {
  consumeWebAuthnChallengeAtomic,
  findPasskeyByCredentialId,
  insertNativeAccount,
} from "./postgresDirectStore";

describe("postgresDirectStore", () => {
  beforeEach(() => {
    vi.mocked(queryAbraxasPg).mockReset();
  });

  it("maps missing relation to store unavailable", async () => {
    vi.mocked(queryAbraxasPg).mockRejectedValue({ code: "42P01" });
    await expect(insertNativeAccount("abx_ac_test")).rejects.toBeInstanceOf(NativeAccountStoreUnavailableError);
  });

  it("uses parameterized credential lookup", async () => {
    vi.mocked(queryAbraxasPg).mockResolvedValue({ rows: [], rowCount: 0 });
    await findPasskeyByCredentialId("cred-1");
    expect(queryAbraxasPg).toHaveBeenCalledWith(expect.stringContaining("$1"), ["cred-1"]);
  });

  it("returns null when atomic challenge consume reports not ok", async () => {
    vi.mocked(queryAbraxasPg).mockResolvedValue({
      rows: [{ payload: { ok: false } }],
      rowCount: 1,
    });
    await expect(consumeWebAuthnChallengeAtomic("ch-1")).resolves.toBeNull();
  });

  it("returns payload when atomic challenge consume succeeds", async () => {
    vi.mocked(queryAbraxasPg).mockResolvedValue({
      rows: [
        {
          payload: {
            ok: true,
            purpose: "authenticate",
            account_id: "abx_ac_1",
            challenge: "abc",
            origin: "https://example.com",
            rp_id: "example.com",
          },
        },
      ],
      rowCount: 1,
    });
    await expect(consumeWebAuthnChallengeAtomic("ch-1")).resolves.toMatchObject({
      purpose: "authenticate",
      account_id: "abx_ac_1",
    });
  });
});
