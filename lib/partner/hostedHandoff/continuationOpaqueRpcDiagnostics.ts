// FILE: lib/partner/hostedHandoff/continuationOpaqueRpcDiagnostics.ts
// Safe application-level diagnostics at the opaque continuation RPC boundary (#562).

import {
  isKnownProductionSupabaseRef,
  supabaseProjectRefFromUrl,
} from "@/lib/supabase/projectRefs";
import {
  classifySupabaseServiceRoleKeyShape,
  supabaseJwtProjectRef,
  supabaseJwtRole,
} from "@/lib/supabase/supabaseKeyProjectRef";
import { logHostedHandoffContinueDiagnostic } from "./continueContextDiagnostics";

export const OPAQUE_CONTINUATION_PEEK_RPC = "partner_flow_continuation_peek_by_opaque";
export const OPAQUE_CONTINUATION_PEEK_RPC_ARG = "p_opaque";

export type OpaqueRpcResponseDataKind = "null" | "object" | "array";

export type ContinuationOpaqueRpcDiagnosticInput = {
  verifyRequestRef?: string;
  normalizedIdentifier: string | null;
  rpcName: string;
  rpcArgumentName: string;
  data: unknown;
  error: { code?: string; message?: string; details?: string; hint?: string } | null;
  mappedRecord?: {
    jti?: string;
    verifyRequestId?: string | null;
    consumedAt?: string | null;
  } | null;
  mapAttempted?: boolean;
  mapSucceeded?: boolean;
  mapErrorClass?: string;
};

function classifyRpcData(data: unknown): {
  dataPresent: boolean;
  dataKind: OpaqueRpcResponseDataKind;
  arrayLength?: number;
  rowCandidatePresent: boolean;
} {
  if (data == null) {
    return { dataPresent: false, dataKind: "null", rowCandidatePresent: false };
  }
  if (Array.isArray(data)) {
    const row = data[0];
    return {
      dataPresent: true,
      dataKind: "array",
      arrayLength: data.length,
      rowCandidatePresent: row != null && typeof row === "object",
    };
  }
  if (typeof data === "object") {
    return {
      dataPresent: true,
      dataKind: "object",
      rowCandidatePresent: true,
    };
  }
  return { dataPresent: true, dataKind: "object", rowCandidatePresent: false };
}

function safeRpcErrorCode(error: { code?: string } | null): string | undefined {
  const code = error?.code?.trim();
  if (!code) return undefined;
  return code.slice(0, 32);
}

function safeRpcErrorCategory(error: { code?: string; message?: string } | null): string | undefined {
  const code = error?.code?.trim() ?? "";
  if (code.startsWith("PGRST")) return "postgrest";
  if (/^\d{2}/.test(code)) return "postgres";
  if (error?.message?.toLowerCase().includes("fetch")) return "network";
  if (error) return "supabase_rpc";
  return undefined;
}

function safeRpcErrorMessage(error: { message?: string } | null): string | undefined {
  const message = error?.message?.trim();
  if (!message) return undefined;
  return message.slice(0, 160);
}

function readSupabaseClientBoundary(): {
  urlProjectRef: string | null;
  keyProjectRef: string | null;
  keyRole: string | null;
  keyShape: ReturnType<typeof classifySupabaseServiceRoleKeyShape>;
  urlKeyProjectMatch: boolean | null;
  expectedProductionProject: boolean;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const urlProjectRef = supabaseProjectRefFromUrl(url);
  const keyProjectRef = supabaseJwtProjectRef(key);
  const keyRole = supabaseJwtRole(key);
  const keyShape = classifySupabaseServiceRoleKeyShape(key);
  const urlKeyProjectMatch = urlProjectRef && keyProjectRef
    ? urlProjectRef === keyProjectRef
    : null;

  return {
    urlProjectRef,
    keyProjectRef,
    keyRole,
    keyShape,
    urlKeyProjectMatch,
    expectedProductionProject: isKnownProductionSupabaseRef(urlProjectRef),
  };
}

export function buildContinuationOpaqueRpcDiagnosticFields(
  input: ContinuationOpaqueRpcDiagnosticInput,
): Record<string, unknown> {
  const normalized = input.normalizedIdentifier?.trim() ?? "";
  const dataShape = classifyRpcData(input.data);
  const boundary = readSupabaseClientBoundary();
  const mapped = input.mappedRecord;

  const fields: Record<string, unknown> = {
    normalized_identifier_present: Boolean(normalized),
    normalized_identifier_length: normalized.length,
    rpc_name: input.rpcName,
    rpc_argument_name: input.rpcArgumentName,
    error_present: Boolean(input.error),
    data_present: dataShape.dataPresent,
    data_kind: dataShape.dataKind,
    row_candidate_present: dataShape.rowCandidatePresent,
    map_attempted: input.mapAttempted ?? false,
    map_succeeded: input.mapSucceeded ?? false,
    expected_production_project: boundary.expectedProductionProject,
    service_role_key_shape: boundary.keyShape,
  };

  if (input.verifyRequestRef) fields.verify_request_ref = input.verifyRequestRef;
  if (boundary.urlProjectRef) fields.supabase_project_ref = boundary.urlProjectRef;
  if (boundary.keyProjectRef) fields.service_role_key_project_ref = boundary.keyProjectRef;
  if (boundary.keyRole) fields.client_role_classification = boundary.keyRole;
  if (boundary.urlKeyProjectMatch != null) fields.url_key_project_match = boundary.urlKeyProjectMatch;

  const safeErrorCode = safeRpcErrorCode(input.error);
  if (safeErrorCode) fields.safe_error_code = safeErrorCode;

  const safeErrorCategory = safeRpcErrorCategory(input.error);
  if (safeErrorCategory) fields.safe_error_category = safeErrorCategory;

  const safeErrorMessage = safeRpcErrorMessage(input.error);
  if (safeErrorMessage) fields.safe_error_message = safeErrorMessage;

  if (dataShape.arrayLength != null) fields.array_length = dataShape.arrayLength;

  if (mapped?.jti) fields.mapped_jti = mapped.jti;
  if (mapped?.verifyRequestId && normalized) {
    fields.mapped_opaque_identifier_match = mapped.verifyRequestId === normalized;
  }
  if (mapped?.consumedAt != null) fields.mapped_consumed = Boolean(mapped.consumedAt);
  else if (mapped) fields.mapped_consumed = false;

  if (input.mapErrorClass) fields.map_error_class = input.mapErrorClass.slice(0, 120);

  return fields;
}

export function logContinuationOpaqueRpcDiagnostic(
  input: ContinuationOpaqueRpcDiagnosticInput,
): void {
  const fields = buildContinuationOpaqueRpcDiagnosticFields(input);
  logHostedHandoffContinueDiagnostic({
    stage: "continuation_opaque_rpc",
    verifyRequestRef: input.verifyRequestRef,
    continuationJti: input.mappedRecord?.jti,
    consumed: input.mappedRecord?.consumedAt ? true : input.mappedRecord ? false : undefined,
    errorClass: input.error ? "SupabaseRpcError" : input.mapErrorClass,
    internalCode: input.error
      ? safeRpcErrorCategory(input.error) ?? "supabase_rpc_error"
      : input.mapErrorClass
        ? "opaque_rpc_map_failed"
        : undefined,
    postgresCode: safeRpcErrorCode(input.error),
    functionName: "createSupabaseContinuationStore.peekByVerifyRequestId",
    opaqueRpc: fields,
  });
}
