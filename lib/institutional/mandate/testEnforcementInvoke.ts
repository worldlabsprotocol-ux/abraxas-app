// FILE: lib/institutional/mandate/testEnforcementInvoke.ts
// Test helper — invokes Build 886 protected enforcement entrypoint.

import type { ProposedInstitutionalTransaction } from "@/lib/institutional/transactionMandateEnforcement";
import type { ControlledMandateIssuerFixture } from "./controlledIssuerFixture";
import {
  receiptBindingForMandate,
  sealedExecution,
  trustedPolicyForMandate,
} from "./controlledIssuerFixture";
import type { SignedInstitutionalMandate } from "./contract";
import {
  enforceProtectedInstitutionalAction,
  type IndependentReceiptContext,
  type RelyingPartyEnforcementResult,
} from "./enforceInstitutionalAction";
import type { InstitutionalEnforcementMode } from "./enforcementPolicy";

export function invokeProtectedEnforcement(input: {
  fixture: ControlledMandateIssuerFixture;
  signed: SignedInstitutionalMandate;
  transaction: ProposedInstitutionalTransaction;
  now: Date;
  mode: InstitutionalEnforcementMode;
  receipt?: IndependentReceiptContext | "auto_binding" | null;
  execution_id?: string;
}): RelyingPartyEnforcementResult {
  let independentReceipt = input.receipt ?? null;
  if (independentReceipt === "auto_binding") {
    independentReceipt = receiptBindingForMandate(input.signed);
  }
  return enforceProtectedInstitutionalAction({
    signedMandate: input.signed,
    signedIssuerAuthority: input.fixture.signedIssuerAuthority,
    trustAnchorPublicJwk: input.fixture.trustAnchorPublicJwk,
    trustedEnforcementPolicy: trustedPolicyForMandate(input.signed.payload, input.mode),
    trustedExecution: sealedExecution(input.transaction, input.execution_id),
    now: input.now,
    independentReceipt: independentReceipt ?? undefined,
  });
}
