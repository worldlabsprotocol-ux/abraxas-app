// FILE: lib/commercial/pilotActivation/externalDeveloperAcceptance.ts
// Build 876 — unaided external developer acceptance (structure only; no simulated metrics).

export type AdoptionEvidenceClass =
  | "unaided_external_developer"
  | "automated_reference_run"
  | "not_recorded";

export type ExternalDeveloperMetrics = {
  evidence_class: AdoptionEvidenceClass;
  recorded_at: string | null;
  setup_wall_clock_ms: number | null;
  time_to_first_independent_verify_ms: number | null;
  callback_configuration_failures: number | null;
  operator_interventions: number | null;
  integrator_enforced_permit: boolean | null;
  integrator_enforced_deny_or_indeterminate: boolean | null;
  notes: string | null;
};

export const EXTERNAL_DEVELOPER_HANDOFF_MINIMUM = [
  "Demo ABRAXAS_BASE_URL (https://demo.abraxasworld.xyz)",
  "Server-side abx_test_… API key (secure channel, never commit)",
  "ABRAXAS_APPLICATION_ID, ABRAXAS_PARTNER_ID, ABRAXAS_POLICY_ID from Integration Studio",
  "HTTPS callback URL allowlisted on sandbox application",
  "Trust anchor JSON + fingerprint out-of-band (TRUST_ANCHOR.md)",
  "Verifier package abraxas-independent-verifier-0.1.1.tgz + SHA-256",
  "examples/external-node-partner copied into integrator repo",
] as const;

export const EXTERNAL_DEVELOPER_EXECUTABLE_STEPS = [
  "cp .env.example .env and fill credentials",
  "npm install && npm start",
  "Create verification request (POST /api/v1/partner-handoff)",
  "Complete holder flow when policy requires wallet control",
  "Receive callback; server fetches portable bundle",
  "verifyPortable + enforce in integrator process (not Abraxas UI)",
] as const;

export function emptyExternalDeveloperMetrics(): ExternalDeveloperMetrics {
  return {
    evidence_class: "not_recorded",
    recorded_at: null,
    setup_wall_clock_ms: null,
    time_to_first_independent_verify_ms: null,
    callback_configuration_failures: null,
    operator_interventions: null,
    integrator_enforced_permit: null,
    integrator_enforced_deny_or_indeterminate: null,
    notes: null,
  };
}

export function validateExternalDeveloperMetrics(input: ExternalDeveloperMetrics): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (input.evidence_class === "automated_reference_run") {
    errors.push("automated_reference_run does not satisfy unaided external developer gate");
  }
  if (input.evidence_class === "unaided_external_developer") {
    if (input.setup_wall_clock_ms == null) errors.push("setup_wall_clock_ms required");
    if (input.time_to_first_independent_verify_ms == null) {
      errors.push("time_to_first_independent_verify_ms required");
    }
    if (input.integrator_enforced_permit !== true) {
      errors.push("integrator_enforced_permit must be true for acceptance");
    }
    if (input.integrator_enforced_deny_or_indeterminate !== true) {
      errors.push("integrator_enforced_deny_or_indeterminate must be true for acceptance");
    }
  }
  return { ok: errors.length === 0, errors };
}
