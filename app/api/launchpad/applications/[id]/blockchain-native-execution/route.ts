// Blockchain-native Integration Studio path — on-chain continuity + portable verification (not sovereign PG issuance).

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import {
  confirmBlockchainNativeStudioExecutionFromPortable,
  prepareBlockchainNativeStudioHarness,
} from "@/lib/partner/launchpad/blockchainNative/studioExecution";
import type { PortableHarnessPersistence } from "@/lib/partner/launchpad/blockchainNative/studioHarnessRestore";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

function parsePortableReceipt(body: unknown): PortableHarnessPersistence | null {
  if (!body || typeof body !== "object") return null;
  const record = body as PortableHarnessPersistence;
  if (typeof record.receipt_id !== "string" || !record.receipt_id.trim()) return null;
  if (!record.public_payload || typeof record.public_payload !== "object") return null;
  if (typeof record.signature !== "string" || !record.signature.trim()) return null;
  if (typeof record.expires_at !== "string" || !record.expires_at.trim()) return null;
  const payloadHash = (record.public_payload as { payload_hash?: string }).payload_hash;
  if (typeof payloadHash !== "string" || !payloadHash.trim()) return null;
  return record;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/blockchain-native-execution",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const body = (await req.json().catch(() => ({}))) as {
    phase?: "prepare" | "confirm";
    scenario_id?: string;
    transaction_signature?: string;
    portable_receipt?: unknown;
  };

  if (body.phase === "prepare") {
    const prepared = prepareBlockchainNativeStudioHarness({
      partnerId: auth.session.partnerId,
      policyId: app.policy_id,
      policyVersion: app.policy_version,
      policyTemplateId: app.policy_template_id,
      scenarioId: body.scenario_id ?? "approved",
    });
    if (!prepared.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, prepared.code);
    return launchpadJson({
      ok: true,
      phase: "prepared",
      receipt_id: prepared.receipt_id,
      registry_pda: prepared.registry_pda,
      commitment_pda: prepared.commitment_pda,
      payload_hash_hex: prepared.payload_hash_hex,
      receipt_id_hash_hex: prepared.receipt_id_hash_hex,
      rpc_url: prepared.rpc_url,
      finality_slots: prepared.finality_slots,
      portable_receipt: prepared.harness.persistence,
    });
  }

  if (body.phase === "confirm") {
    const persistence = parsePortableReceipt(body.portable_receipt);
    if (!persistence) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "portable_receipt_required");
    }
    const confirmed = await confirmBlockchainNativeStudioExecutionFromPortable({
      persistence,
      partnerId: auth.session.partnerId,
      policyId: app.policy_id,
      policyTemplateId: app.policy_template_id,
      transactionSignature: body.transaction_signature?.trim(),
    });
    if (!confirmed.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 422, confirmed.code);
    return launchpadJson({
      ok: true,
      phase: "confirmed",
      receipt_id: confirmed.receipt_id,
      payload_hash_hex: confirmed.payload_hash_hex,
      observation_slot: confirmed.observation_slot,
      transaction_signature: confirmed.transaction_signature,
      independent_verification: confirmed.portable,
      chain_status_version: confirmed.chain_status_version.toString(),
    });
  }

  return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "invalid_phase");
}