# Errors and recovery (design partner)

## Partner Flow (hosted)

See `PARTNER_FLOW_ERROR_TABLE` in `lib/partner/partnerFlowIntegratorKit.ts` for HTTP-level errors (allowlist, policy mismatch, 401 holder session, etc.).

## Portable / independent verify

| Code / condition | Safe outcome | Next action |
|------------------|--------------|-------------|
| `portable_verification_fetch_failed` / 503 | indeterminate | Bounded retry; fail closed on user access |
| `issuer_export_not_configured` | indeterminate | Abraxas ops enables export on environment |
| `bundled_trust_anchor_not_authenticated` | indeterminate | Fix pin; never auto-trust bundle |
| `untrusted_anchor_substitution` | no permit | Authorized rotation only |
| `status_version_rollback_rejected` | no permit | Fetch fresh portable bundle |
| `status_statement_stale` | no permit | Refresh within max-age |
| `audience_mismatch` | deny | Wrong partner/policy/environment |
| `corrupted_checkpoint_state` | indeterminate | Restore checkpoint backup |
| Expired authentic receipt | **deny** | Do not grant; optional re-verification flow |

Partner Kit maps many codes via `partnerSafeNextActions()` ([BUILD #827](../BUILD_827_PARTNER_TRUST_CONTINUITY.md)).

## Recovery principles

1. **Never** grant access from callback URL or `success=true` alone.
2. **Never** silently reset checkpoint floors to zero after corruption — restore from backup or explicit ops procedure.
3. Offline verifier **cannot** know revocations newer than the authenticated freshness window — document that limit to auditors.
