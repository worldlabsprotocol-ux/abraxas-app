// FILE: lib/idv/holderSubjectIdv.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  assertSessionOwnsRequestedSubject,
  HolderSubjectResolutionError,
  idvDocumentSubjectColumns,
  passportDocumentsSubjectOrFilter,
  resolveHolderSubjectFromBrowserSession,
} from "./holderSubjectIdv";
import * as schemaReady from "@/lib/persistence/chainNeutralSchemaReady";

const HS = "abx_hs_00000000000000000000000000000001";
const HS_B = "abx_hs_00000000000000000000000000000002";
const SUI = "0x0000000000000000000000000000000000000000000000000000000000000001";

describe("holderSubjectIdv", () => {
  it("maps chain-neutral subject to holder_subject_id column only", () => {
    const cols = idvDocumentSubjectColumns(HS);
    expect(cols.holder_subject_id).toBe(HS);
    expect(cols.sui_address).toBeNull();
  });

  it("maps legacy Sui to sui_address column only", () => {
    const cols = idvDocumentSubjectColumns(SUI);
    expect(cols.sui_address).toBe(SUI);
    expect(cols.holder_subject_id).toBeNull();
  });

  it("resolves abx_hs from browser session without Sui normalization", () => {
    const subject = resolveHolderSubjectFromBrowserSession({
      subjectId: HS,
      authMethod: "evm_wallet",
    });
    expect(subject).toBe(HS);
  });

  it("rejects subject substitution in capture body", () => {
    expect(() => assertSessionOwnsRequestedSubject(
      { subjectId: HS, authMethod: "evm_wallet" },
      HS_B,
    )).toThrow(HolderSubjectResolutionError);
  });

  it("passportDocumentsSubjectOrFilter fails closed without document schema", async () => {
    vi.spyOn(schemaReady, "chainNeutralIdvDocumentSchemaReady").mockResolvedValue(false);
    await expect(passportDocumentsSubjectOrFilter(HS)).rejects.toMatchObject({
      code: "chain_neutral_schema_unavailable",
    });
  });
});
