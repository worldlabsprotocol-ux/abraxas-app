// FILE: lib/partner/integrationKit/trustContinuity/partnerSafeNextActions.ts

const NEXT_ACTIONS: Record<string, string> = {
  retry: "Retry portable export with bounded exponential backoff.",
  portable_verification_fetch_failed: "Issuer export unreachable — fail closed; retry later.",
  issuer_export_not_configured: "Contact Abraxas ops for issuer export on this environment.",
  integrator_trust_anchor_pin_required: "Install out-of-band trust anchor or registry before verifying.",
  untrusted_anchor_substitution: "Reject bundle — anchor not in integrator registry; obtain authorized rotation.",
  anchor_distrusted: "Emergency distrust active — do not verify with this anchor fingerprint.",
  bundled_trust_anchor_not_authenticated: "Bundled anchor does not match pin; never auto-trust downloads.",
  anchor_fingerprint_mismatch: "Confirm integrator pin matches out-of-band distribution.",
  status_version_rollback_rejected: "Fetch fresh portable bundle; do not reuse older signed status.",
  registry_version_rollback_rejected: "Fetch fresh issuer authority; registry snapshot rolled back.",
  status_statement_stale: "Refresh signed status within anchor max-age policy.",
  signed_status_evidence_required: "Portable export missing signed status — indeterminate.",
  corrupted_checkpoint_state: "Restore partner checkpoint backup; do not silently reset security history.",
  concurrency_conflict: "Retry after concurrent verifier completes checkpoint commit.",
  not_currently_acceptable: "Authentic decision may be expired or revoked — deny access.",
  audience_mismatch: "Receipt not issued for this partner/policy/environment.",
  signature_invalid: "Reject receipt — cryptographic authenticity failed.",
};

export function partnerSafeNextActions(failureCodes: string[]): string[] {
  const out: string[] = [];
  for (const code of failureCodes) {
    const action = NEXT_ACTIONS[code];
    if (action && !out.includes(action)) out.push(action);
  }
  if (out.length === 0 && failureCodes.length > 0) {
    out.push("Treat as indeterminate; review failure_codes before granting access.");
  }
  return out;
}
