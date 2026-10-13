// FILE: lib/idv/holderIdentityRef.test.ts

import { describe, expect, it } from "vitest";
import {
  identityVerificationOrFilter,
  identityVerificationUpsertKeys,
  parseVeriffVendorDataHolder,
  veriffVendorDataForHolder,
} from "./holderIdentityRef";

const HS = "abx_hs_00000000000000000000000000000001";

describe("holderIdentityRef", () => {
  it("builds upsert keys for chain-neutral subjects without sui_address", () => {
    const keys = identityVerificationUpsertKeys(HS);
    expect(keys.holder_subject_id).toBe(HS);
    expect(keys.sui_address).toBeNull();
    expect(keys.wallet_address).toBe(HS);
  });

  it("includes holder_subject_id in verification lookup filter", () => {
    expect(identityVerificationOrFilter(HS)).toContain(`holder_subject_id.eq.${HS}`);
  });

  it("round-trips veriff vendor data for chain-neutral holders", () => {
    const vendor = veriffVendorDataForHolder(HS);
    expect(parseVeriffVendorDataHolder(vendor)).toBe(HS);
  });
});
