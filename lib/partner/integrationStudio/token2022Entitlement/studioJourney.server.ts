import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  buildVerificationTiers,
  INDEPENDENT_VERIFY_CLI,
  loadAuthorizedLocalReference,
} from "./localReference";
import { resolveToken2022StudioEnvironment } from "./environment";
import { runPartnerVerifyAuthorizedArtifact } from "./partnerVerifyStructural";

export type Token2022StudioStage =
  | "choose_protection"
  | "verify_proof"
  | "receive_entitlement"
  | "use_entitlement"
  | "verify_independently";

export type Token2022StudioJourneyPayload = {
  ok: true;
  stage_hint: Token2022StudioStage;
  trusted_scope: {
    application_id: string;
    partner_id: string;
    policy_id: string;
    policy_version: number;
    policy_template_id: string;
    /** Browser cannot override these bindings. */
    scope_source: "launchpad_application_record";
  };
  environment: Awaited<ReturnType<typeof resolveToken2022StudioEnvironment>>;
  local_reference: ReturnType<typeof loadAuthorizedLocalReference>;
  verification_tiers: ReturnType<typeof buildVerificationTiers>;
  independent_handoff: {
    cli_instructions: string;
    example_readme: string;
    program_ids: {
      proof_continuity: string;
      entitlement_consumer: string;
      token_program: string;
    };
    public_accounts: {
      registry: string;
      trusted_config: string;
      commitment: string;
      entitlement_mint: string;
      holder_wallet: string;
      consumption_account: string | null;
    };
    rpc_attestation_env: "PARTNER_VERIFY_RPC_URL";
  };
  structural_verification_runtime?: {
    ran: boolean;
    ok: boolean;
    source?: string;
    excerpt?: string;
    reason?: string;
  };
};

export async function buildToken2022StudioJourney(input: {
  app: LaunchpadApplicationRow;
  runStructuralVerify?: boolean;
}): Promise<Token2022StudioJourneyPayload> {
  const environment = await resolveToken2022StudioEnvironment();
  const localReference = loadAuthorizedLocalReference();
  const verification_tiers = buildVerificationTiers(localReference);

  let structural_verification_runtime: Token2022StudioJourneyPayload["structural_verification_runtime"];
  if (input.runStructuralVerify) {
    const outcome = runPartnerVerifyAuthorizedArtifact();
    structural_verification_runtime = outcome.ok
      ? {
          ran: true,
          ok: true,
          source: outcome.source,
          excerpt: outcome.stdout.split("\n").slice(0, 12).join("\n"),
        }
      : {
          ran: true,
          ok: false,
          reason: outcome.reason,
          excerpt: outcome.stdout?.split("\n").slice(0, 8).join("\n"),
        };
  }

  return {
    ok: true,
    stage_hint: "choose_protection",
    trusted_scope: {
      application_id: input.app.id,
      partner_id: input.app.partner_id,
      policy_id: input.app.policy_id,
      policy_version: input.app.policy_version,
      policy_template_id: input.app.policy_template_id,
      scope_source: "launchpad_application_record",
    },
    environment,
    local_reference: localReference,
    verification_tiers,
    independent_handoff: {
      cli_instructions: INDEPENDENT_VERIFY_CLI,
      example_readme: "examples/independent-solana-entitlement-partner/README.md",
      program_ids: {
        proof_continuity: localReference.proof_continuity_program_id,
        entitlement_consumer: localReference.entitlement_consumer_program_id,
        token_program: localReference.token_program_id,
      },
      public_accounts: {
        registry: localReference.registry,
        trusted_config: localReference.trusted_config,
        commitment: localReference.commitment,
        entitlement_mint: localReference.entitlement_mint,
        holder_wallet: localReference.holder_wallet,
        consumption_account: localReference.consumption_account,
      },
      rpc_attestation_env: "PARTNER_VERIFY_RPC_URL",
    },
    structural_verification_runtime,
  };
}