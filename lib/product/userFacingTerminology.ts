// FILE: lib/product/userFacingTerminology.ts
// User-facing product language (Build 882). Internal APIs and schema names unchanged.

export const TERM_TEST_WORKSPACE = "Test workspace";
export const TERM_CREATE_TEST_APP = "Create your test app";
export const TERM_CHECK_PROOF = "Check your proof";

/** Legacy internal route id; public copy uses TERM_TEST_WORKSPACE. */
export const INTERNAL_EPHEMERAL_SANDBOX_ROUTE = "/developers/ephemeral-sandbox";

export const USER_FACING_ACTIONS = {
  testWorkspace: TERM_TEST_WORKSPACE,
  createTestApp: TERM_CREATE_TEST_APP,
  checkProof: TERM_CHECK_PROOF,
} as const;
