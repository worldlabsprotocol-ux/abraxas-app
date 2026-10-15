// FILE: lib/persistence/holderIdentityCanonicalSuiBinding.test.ts

import { describe, expect, it } from "vitest";
import {
  evaluateCanonicalSuiIdvBinding,
  suiAddressFromWalletCaip10,
  walletCaip10AddressMatchesSui,
} from "./holderIdentityCanonicalSuiBinding";

const SUI = "0x" + "a".repeat(64);
const SUI_OTHER = "0x" + "b".repeat(64);
const HS = "abx_hs_" + "c".repeat(32);
const HS_OTHER = "abx_hs_" + "d".repeat(32);
const CAIP = `sui:mainnet:${SUI}`;

describe("Build #579 canonical Sui IDV binding trust boundary", () => {
  it("parses Sui address from session-bound CAIP-10", () => {
    expect(suiAddressFromWalletCaip10(CAIP)?.toLowerCase()).toBe(SUI.toLowerCase());
    expect(walletCaip10AddressMatchesSui(CAIP, SUI)).toBe(true);
    expect(walletCaip10AddressMatchesSui(CAIP, SUI_OTHER)).toBe(false);
  });

  it("does not authorize canonical sui match without legacy link or verified wallet", () => {
    const binding = evaluateCanonicalSuiIdvBinding({
      canonicalSubjectId: HS,
      sessionSuiAddress: SUI,
      sessionWalletCaip10: undefined,
      suiLegacyLinkSubjectId: null,
      verifiedWalletAccountSubjectId: null,
    });
    expect(binding.authoritativeSuiAddress).toBeNull();
    expect(binding.ambiguousLegacyConflict).toBe(false);
    expect(binding.missingCanonicalLegacySuiBinding).toBe(true);
  });

  it("authorizes pre-backfill sui rows when legacy link matches canonical subject", () => {
    const binding = evaluateCanonicalSuiIdvBinding({
      canonicalSubjectId: HS,
      sessionSuiAddress: SUI,
      suiLegacyLinkSubjectId: HS,
      verifiedWalletAccountSubjectId: null,
    });
    expect(binding.authoritativeSuiAddress?.toLowerCase()).toBe(SUI.toLowerCase());
    expect(binding.missingCanonicalLegacySuiBinding).toBe(false);
  });

  it("authorizes when verified wallet account binds session CAIP-10 to canonical subject", () => {
    const binding = evaluateCanonicalSuiIdvBinding({
      canonicalSubjectId: HS,
      sessionSuiAddress: SUI,
      sessionWalletCaip10: CAIP,
      suiLegacyLinkSubjectId: null,
      verifiedWalletAccountSubjectId: HS,
    });
    expect(binding.authoritativeSuiAddress).toBeTruthy();
  });

  it("blocks canonical session when legacy link points at another subject", () => {
    const binding = evaluateCanonicalSuiIdvBinding({
      canonicalSubjectId: HS,
      sessionSuiAddress: SUI,
      suiLegacyLinkSubjectId: HS_OTHER,
      verifiedWalletAccountSubjectId: null,
    });
    expect(binding.authoritativeSuiAddress).toBeNull();
    expect(binding.ambiguousLegacyConflict).toBe(true);
  });

  it("blocks when verified wallet row belongs to another canonical subject", () => {
    const binding = evaluateCanonicalSuiIdvBinding({
      canonicalSubjectId: HS,
      sessionSuiAddress: SUI,
      sessionWalletCaip10: CAIP,
      suiLegacyLinkSubjectId: null,
      verifiedWalletAccountSubjectId: HS_OTHER,
    });
    expect(binding.authoritativeSuiAddress).toBeNull();
    expect(binding.ambiguousLegacyConflict).toBe(true);
  });

  it("does not treat unrelated session sui as authoritative for canonical holder", () => {
    const binding = evaluateCanonicalSuiIdvBinding({
      canonicalSubjectId: HS,
      sessionSuiAddress: SUI_OTHER,
      sessionWalletCaip10: CAIP,
      suiLegacyLinkSubjectId: null,
      verifiedWalletAccountSubjectId: HS,
    });
    expect(binding.authoritativeSuiAddress).toBeNull();
    expect(binding.missingCanonicalLegacySuiBinding).toBe(true);
  });
});
