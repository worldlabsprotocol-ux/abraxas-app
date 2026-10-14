import { describe, expect, it } from "vitest";
import {
  validateExclusiveSubjectAnchor,
  validatePassportDocumentSubjectAnchor,
} from "./holderSubjectAnchorSql";

const HS = "abx_hs_aabbccddeeff00112233445566778899";
const SUI = "0x00000000000000000000000000000000000000000000000000000000000000aa";

describe("holderSubjectAnchorSql", () => {
  it("requires exactly one anchor for review/biometric rows", () => {
    expect(validateExclusiveSubjectAnchor({ holder_subject_id: HS, sui_address: null }).ok).toBe(true);
    expect(validateExclusiveSubjectAnchor({ holder_subject_id: null, sui_address: SUI }).ok).toBe(true);
    expect(validateExclusiveSubjectAnchor({ holder_subject_id: HS, sui_address: SUI }).ok).toBe(false);
    expect(validateExclusiveSubjectAnchor({ holder_subject_id: null, sui_address: null }).ok).toBe(false);
  });

  it("rejects malformed abx_hs ids", () => {
    expect(validateExclusiveSubjectAnchor({
      holder_subject_id: "abx_hs_short",
      sui_address: null,
    }).ok).toBe(false);
  });

  it("allows legacy passport rows without dual anchor", () => {
    expect(validatePassportDocumentSubjectAnchor({ holder_subject_id: null, sui_address: SUI }).ok).toBe(true);
    expect(validatePassportDocumentSubjectAnchor({ holder_subject_id: null, sui_address: null }).ok).toBe(true);
    expect(validatePassportDocumentSubjectAnchor({ holder_subject_id: HS, sui_address: null }).ok).toBe(true);
    expect(validatePassportDocumentSubjectAnchor({ holder_subject_id: HS, sui_address: SUI }).ok).toBe(false);
  });
});
