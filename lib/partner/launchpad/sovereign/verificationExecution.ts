// FILE: lib/partner/launchpad/sovereign/verificationExecution.ts
import "server-only";

import { withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import type { PartnerHarnessCaseResult } from "@/lib/partner/launchpad/partnerTestHarness";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { pgInsertLaunchpadActivity } from "@/lib/partner/launchpad/sovereign/launchpadPgStore";

export async function recordSovereignVerificationRun(input: {
  app: LaunchpadApplicationRow;
  partnerId: string;
  scenarioId: string;
  harness: PartnerHarnessCaseResult;
  idempotencyKey?: string;
}): Promise<{ verificationRequestId: string; receiptId: string | null }> {
  const persistence = input.harness.persistence;

  const verificationRequestId = await withAbraxasPgTransaction(async (client) => {
    const req = await client.query<{ id: string }>(
      `insert into public.partner_launchpad_verification_requests
        (application_id, partner_id, policy_id, policy_version, scenario_id, idempotency_key, status)
       values ($1::uuid, $2, $3, $4, $5, $6, 'completed')
       on conflict (idempotency_key) do update set status = excluded.status
       returning id`,
      [
        input.app.id,
        input.partnerId,
        input.app.policy_id,
        input.app.policy_version,
        input.scenarioId,
        input.idempotencyKey ?? null,
      ],
    );
    const requestId = req.rows[0]?.id;
    if (!requestId) throw new Error("verification_request_failed");

    if (persistence) {
      await client.query(
        `insert into public.partner_launchpad_signed_receipts
          (verification_request_id, receipt_id, application_id, partner_id, policy_id, policy_version,
           public_payload, signature, expires_at)
         values ($1::uuid, $2, $3::uuid, $4, $5, $6, $7::jsonb, $8, $9::timestamptz)
         on conflict (receipt_id) do nothing`,
        [
          requestId,
          persistence.receipt_id,
          input.app.id,
          input.partnerId,
          input.app.policy_id,
          input.app.policy_version,
          JSON.stringify(persistence.public_payload),
          persistence.signature,
          persistence.expires_at,
        ],
      );
    }

    await client.query(
      `insert into public.partner_launchpad_usage_events (application_id, partner_id, event_kind, metadata)
       values ($1::uuid, $2, 'verification_harness', $3::jsonb)`,
      [
        input.app.id,
        input.partnerId,
        JSON.stringify({ scenario_id: input.scenarioId, passed: input.harness.passed }),
      ],
    );

    return requestId;
  });

  await pgInsertLaunchpadActivity({
    applicationId: input.app.id,
    partnerId: input.partnerId,
    eventType: input.harness.passed ? "receipt_verified" : "verification_failed",
    publicCode: input.harness.passed
      ? `harness_${input.scenarioId}_pass`
      : `harness_${input.scenarioId}_fail`,
    metadata: {
      scenario: input.scenarioId,
      simulated: false,
      harness: true,
      passed: input.harness.passed,
      receipt_id: persistence?.receipt_id ?? null,
    },
  });

  return {
    verificationRequestId,
    receiptId: persistence?.receipt_id ?? null,
  };
}
