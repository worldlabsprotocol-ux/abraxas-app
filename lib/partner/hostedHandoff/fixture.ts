// FILE: lib/partner/hostedHandoff/fixture.ts
// Sandbox fixture lifecycle. No real holder, provider, OAuth, or live receipt.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import {
  completeHostedHandoff,
  consumeHandoffReceiptLookup,
  createHostedHandoff,
  projectPartner,
  projectPublic,
} from "./store";

const FIXTURE_RECEIPT = "rcpt_sandbox_fixture";

export async function runSandboxHandoffFixture(input: {
  application: LaunchpadApplicationRow;
  stored: PartnerFlowStoredConfig;
}) {
  const created = await createHostedHandoff({
    application: input.application,
    stored: input.stored,
    runtime: "universal_https",
    fixture: true,
  });
  const completed = await completeHostedHandoff({
    record: created,
    partnerId: input.application.partner_id,
    applicationId: input.application.id,
    publicReceiptId: FIXTURE_RECEIPT,
  });
  const partnerView = projectPartner(completed);
  const consumed = await consumeHandoffReceiptLookup(completed, input.application.partner_id);
  return {
    created: projectPublic(created),
    completed: partnerView,
    consumed: projectPublic(consumed),
    partner_must_call: "AbraxasPartnerKit.verifyReceiptId",
    callback_is_grant: false,
    fixture_receipt_id: partnerView.public_receipt_id,
    activates_production: false,
  };
}
