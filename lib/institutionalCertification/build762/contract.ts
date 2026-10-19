// FILE: lib/institutionalCertification/build762/contract.ts

export const BUILD_762_SCHEMA_VERSION = "build-762-v2" as const;

export type Build762TrustContext = "sandbox_only";

export type Build762NegativeVerdict = "pass" | "fail";

export type Build762NegativeCase = {
  case_id: string;
  property: string;
  expected: string;
  observed: string;
  verdict: Build762NegativeVerdict;
};

export type Build762InstitutionalTrustReport = {
  schema_version: typeof BUILD_762_SCHEMA_VERSION;
  generated_at: string;
  commit_sha: string;
  execution_mode: "local_imported_http_route_handlers";
  deployment_environment: "vitest_process";
  journey_id: "ephemeral_developer_workspace_institutional_trust";
  journey_label: string;
  trust_context: Build762TrustContext;
  status: {
    implemented: true;
    session_independent_verification_demonstrated: boolean;
    fail_closed_integrity_verified: boolean;
    standalone_cryptographic_verification: false;
    issuer_operational: false;
    production_authorized: false;
  };
  institution: {
    partner_id: string;
    policy_id: string;
    policy_version: number;
    requested_attribute: string;
  };
  holder_authorization: {
    wallet_sign_in: true;
    presentation_authorization: true;
    wallet_proof_method: "test_wallet_ed25519_sign_message";
    interactive_browser_wallet: false;
    scoped_wallet_action: {
      operation: string;
      resource_pattern: string;
    };
  };
  evidence: {
    kind: string;
    sandbox_test_issuer: true;
    production_eligibility: false;
  };
  execution: {
    workspace_id: string;
    presentation_commit_id: string;
    action_challenge_id: string;
    receipt_id: string;
    decision: string;
    result_label: string;
  };
  independent_verification: {
    source: "presented_receipt";
    session_independent: true;
    server_record_integrity_verified: boolean;
    standalone_cryptographic_verification: false;
    currently_acceptable: boolean;
    without_wallet_session: true;
  };
  solana_contribution: {
    wallet_sign_message_scope_proof: true;
    wallet_proof_method: "test_wallet_ed25519_sign_message";
    onchain_program_enforcement: false;
    note: string;
  };
  negative_cases: Build762NegativeCase[];
  limitations: string[];
  reproduction_command: string;
};
