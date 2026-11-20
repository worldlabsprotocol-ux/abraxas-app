import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { requireBlockchainNativeHolderWallet } from "@/lib/partner/launchpad/blockchainNative/holderWalletGate";
import {
  buildConnectedSandboxConsumeTransaction,
  buildConnectedSandboxMintTransaction,
  confirmConnectedSandboxConsume,
  confirmConnectedSandboxMint,
} from "@/lib/partner/integrationStudio/token2022Entitlement/connectedSandboxExecution.server";
import { evaluateConnectedSandboxBoundary } from "@/lib/partner/integrationStudio/token2022Entitlement/connectedSandboxBoundary";
import { token2022EntitlementRecovery } from "@/lib/partner/integrationStudio/token2022Entitlement/recovery";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/token2022-connected-execution",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const body = (await req.json().catch(() => ({}))) as {
    phase?:
      | "capabilities"
      | "prepare_mint"
      | "confirm_mint"
      | "prepare_consume"
      | "confirm_consume";
    prepare_token?: string;
    holder_wallet_address?: string;
    transaction_signature?: string;
    action_challenge_id?: string;
    action_signature?: string;
    client_policy_id?: string;
    client_partner_id?: string;
  };

  if (body.client_policy_id && body.client_policy_id !== app.policy_id) {
    return launchpadJson({
      ok: false,
      code: "policy_scope_mismatch",
      recovery: token2022EntitlementRecovery("policy_scope_mismatch"),
    });
  }
  if (body.client_partner_id && body.client_partner_id !== auth.session.partnerId) {
    return launchpadJson({
      ok: false,
      code: "policy_scope_mismatch",
      recovery: token2022EntitlementRecovery("policy_scope_mismatch"),
    });
  }

  if (body.phase === "capabilities" || !body.phase) {
    const boundary = await evaluateConnectedSandboxBoundary();
    return launchpadJson({ ok: true, phase: "capabilities", boundary });
  }

  const gated = await requireBlockchainNativeHolderWallet(req, {
    claimedHolderWallet: body.holder_wallet_address,
    requireActionAuthorization: body.phase?.startsWith("prepare") ?? false,
    actionChallengeId: body.action_challenge_id,
    actionSignature: body.action_signature,
    applicationId: app.id,
    policyId: app.policy_id,
  });
  if (!gated.ok) return gated.response;

  const prepareToken = body.prepare_token?.trim();
  if (!prepareToken) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "prepare_token_required");

  const common = {
    prepare_token: prepareToken,
    application_id: app.id,
    partner_id: auth.session.partnerId,
    holder_wallet: gated.holderWallet,
  };

  if (body.phase === "prepare_mint") {
    const built = await buildConnectedSandboxMintTransaction(common);
    if (!built.ok) {
      const recoveryKey =
        built.code === "commitment_missing_on_chain"
          ? "missing_entitlement"
          : built.code === "wrong_policy"
            ? "wrong_policy"
            : "connected_execution_unavailable";
      return launchpadJson({
        ok: false,
        code: built.code,
        recovery: token2022EntitlementRecovery(recoveryKey),
      });
    }
    return launchpadJson(built);
  }

  if (body.phase === "confirm_mint") {
    const signature = body.transaction_signature?.trim();
    if (!signature) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "chain_transaction_signature_required");
    const confirmed = await confirmConnectedSandboxMint({ ...common, transaction_signature: signature });
    if (!confirmed.ok) return launchpadJson({ ok: false, code: confirmed.code });
    return launchpadJson(confirmed);
  }

  if (body.phase === "prepare_consume") {
    const built = await buildConnectedSandboxConsumeTransaction(common);
    if (!built.ok) return launchpadJson({ ok: false, code: built.code });
    return launchpadJson(built);
  }

  if (body.phase === "confirm_consume") {
    const signature = body.transaction_signature?.trim();
    if (!signature) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "chain_transaction_signature_required");
    const confirmed = await confirmConnectedSandboxConsume({ ...common, transaction_signature: signature });
    if (!confirmed.ok) return launchpadJson({ ok: false, code: confirmed.code });
    return launchpadJson(confirmed);
  }

  return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "invalid_phase");
}