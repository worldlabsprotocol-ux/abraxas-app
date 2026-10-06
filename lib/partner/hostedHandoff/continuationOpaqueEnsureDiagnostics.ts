// FILE: lib/partner/hostedHandoff/continuationOpaqueEnsureDiagnostics.ts
// Safe diagnostics for atomic opaque continuation ensure (#565).

import { logHostedHandoffContinueDiagnostic } from "./continueContextDiagnostics";

export const ENSURE_OPAQUE_CONTINUATION_RPC = "ensure_partner_flow_continuation_by_opaque";

export type ContinuationOpaqueEnsureDiagnosticInput = {
  verifyRequestRef?: string;
  normalizedIdentifier: string | null;
  wasCreated?: boolean;
  error: { code?: string; message?: string } | null;
  mappedJti?: string;
};

function safeErrorCode(error: { code?: string } | null): string | undefined {
  const code = error?.code?.trim();
  if (!code) return undefined;
  return code.slice(0, 32);
}

export function logContinuationOpaqueEnsureDiagnostic(
  input: ContinuationOpaqueEnsureDiagnosticInput,
): void {
  const normalized = input.normalizedIdentifier?.trim() ?? "";
  logHostedHandoffContinueDiagnostic({
    stage: "continuation_opaque_ensure",
    verifyRequestRef: input.verifyRequestRef,
    continuationJti: input.mappedJti,
    internalCode: input.error
      ? safeErrorCode(input.error) ?? "supabase_rpc_error"
      : input.wasCreated
        ? "continuation_created"
        : "continuation_reused",
    functionName: "createSupabaseContinuationStore.ensureByOpaqueVerifyRequest",
    opaqueEnsure: {
      normalized_identifier_present: Boolean(normalized),
      normalized_identifier_length: normalized.length,
      rpc_name: ENSURE_OPAQUE_CONTINUATION_RPC,
      error_present: Boolean(input.error),
      was_created: input.wasCreated ?? null,
    },
  });
}
