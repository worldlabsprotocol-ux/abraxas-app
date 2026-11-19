import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TOKEN2022_PARTNER_ARTIFACT_AUTHORIZED,
  TOKEN2022_PARTNER_ARTIFACT_REVOKED,
  ENTITLEMENT_CONSUMER_PROGRAM_ID,
} from "@/lib/solana/token2022Entitlement/constants";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";

export type Token2022JourneyStageView = {
  stage: string;
  program_id: string;
  outcome: string;
  notes: string | null;
};

export type Token2022LocalReferenceView = {
  build: string;
  environment: string;
  execution_kind: string;
  proof_continuity_program_id: string;
  entitlement_consumer_program_id: string;
  token_program_id: string;
  stages: Token2022JourneyStageView[];
  receipt_id_hash_hex: string;
  registry: string;
  trusted_config: string;
  commitment: string;
  entitlement_mint: string;
  holder_wallet: string;
  consumption_account: string | null;
  consumption_recorded: boolean;
  has_partner_evidence: boolean;
  evidence_supply: string | null;
  independent_verification_ok_disclaimer: string;
};

export type Token2022VerificationTiers = {
  execution_report: {
    tier: "untrusted_recorded_claims";
    disclaimer: string;
  };
  structural_semantic: {
    tier: "offline_snapshots";
    disclaimer: string;
    available_in_studio: boolean;
    partner_evidence_present: boolean;
  };
  authenticated_chain: {
    tier: "rpc_attestation";
    status: "not_performed" | "requires_rpc";
    disclaimer: string;
  };
};

const UNTRUSTED_FLAG_DISCLAIMER =
  "The JSON field independent_verification_ok is a recorded ProgramTest claim only. partner-verify never treats it as proof.";

function loadArtifact(relPath: string): unknown {
  const abs = join(process.cwd(), relPath);
  return JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
}

export function loadAuthorizedLocalReference(): Token2022LocalReferenceView {
  const raw = loadArtifact(TOKEN2022_PARTNER_ARTIFACT_AUTHORIZED) as Record<string, unknown>;
  const evidence = raw.partner_evidence as Record<string, unknown> | undefined;
  return {
    build: String(raw.build ?? "981"),
    environment: String(raw.environment ?? "local_program_test"),
    execution_kind: String(raw.execution_kind ?? "banks_client_transaction"),
    proof_continuity_program_id: String(raw.proof_continuity_program_id ?? PROOF_CONTINUITY_PROGRAM_ID),
    entitlement_consumer_program_id: String(raw.entitlement_consumer_program_id ?? ENTITLEMENT_CONSUMER_PROGRAM_ID),
    token_program_id: String(raw.token_program_id ?? ""),
    stages: Array.isArray(raw.stages)
      ? (raw.stages as Array<Record<string, unknown>>).map((s) => ({
          stage: String(s.stage ?? ""),
          program_id: String(s.program_id ?? ""),
          outcome: String(s.outcome ?? ""),
          notes: s.notes != null ? String(s.notes) : null,
        }))
      : [],
    receipt_id_hash_hex: String(raw.receipt_id_hash_hex ?? ""),
    registry: String(raw.registry ?? ""),
    trusted_config: String(raw.trusted_config ?? ""),
    commitment: String(raw.commitment ?? ""),
    entitlement_mint: String(raw.entitlement_mint ?? ""),
    holder_wallet: String(raw.holder_wallet ?? ""),
    consumption_account: raw.consumption_account != null ? String(raw.consumption_account) : null,
    consumption_recorded: Boolean(raw.consumption_recorded),
    has_partner_evidence: Boolean(evidence),
    evidence_supply: evidence?.evidence_supply != null ? String(evidence.evidence_supply) : null,
    independent_verification_ok_disclaimer: UNTRUSTED_FLAG_DISCLAIMER,
  };
}

export function loadRevokedLocalReference(): Pick<
  Token2022LocalReferenceView,
  "consumption_recorded" | "commitment" | "has_partner_evidence"
> {
  const raw = loadArtifact(TOKEN2022_PARTNER_ARTIFACT_REVOKED) as Record<string, unknown>;
  return {
    consumption_recorded: Boolean(raw.consumption_recorded),
    commitment: String(raw.commitment ?? ""),
    has_partner_evidence: Boolean(raw.partner_evidence),
  };
}

export function buildVerificationTiers(
  reference: Token2022LocalReferenceView,
): Token2022VerificationTiers {
  return {
    execution_report: {
      tier: "untrusted_recorded_claims",
      disclaimer:
        "Stages and outcomes in the JSON artifact are untrusted execution reports captured from ProgramTest.",
    },
    structural_semantic: {
      tier: "offline_snapshots",
      disclaimer:
        "Structural checks validate embedded base64 account snapshots for canonical PDAs and receipt semantics. This does not prove the state existed on a public cluster.",
      available_in_studio: reference.has_partner_evidence,
      partner_evidence_present: reference.has_partner_evidence,
    },
    authenticated_chain: {
      tier: "rpc_attestation",
      status: reference.environment.includes("program_test") ? "not_performed" : "requires_rpc",
      disclaimer:
        "Authenticated proof requires PARTNER_VERIFY_RPC_URL against live cluster state. ProgramTest exports mark this tier as NOT PERFORMED.",
    },
  };
}

export const INDEPENDENT_VERIFY_CLI = [
  "npm run test:build-981",
  "cd solana/abraxas-eligibility-gate && cargo run --bin partner-verify authorized",
  "cd solana/abraxas-eligibility-gate && cargo run --bin partner-verify revoked",
].join("\n");