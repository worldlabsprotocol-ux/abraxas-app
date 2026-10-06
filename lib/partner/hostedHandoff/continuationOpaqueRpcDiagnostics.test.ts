import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildContinuationOpaqueRpcDiagnosticFields,
  logContinuationOpaqueRpcDiagnostic,
  OPAQUE_CONTINUATION_PEEK_RPC,
  OPAQUE_CONTINUATION_PEEK_RPC_ARG,
} from "./continuationOpaqueRpcDiagnostics";

const PRODUCTION_REF = "bztwutzprwsdrtqdpymf";
const SERVICE_ROLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6dHd1dHpwcndzZHJ0cWRweW1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU0NTQxOSwiZXhwIjoyMDk0MTIxNDE5fQ.test";

describe("continuationOpaqueRpcDiagnostics", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${PRODUCTION_REF}.supabase.co`);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_JWT);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("logs PostgREST-faithful one-row array response with map success", () => {
    const fields = buildContinuationOpaqueRpcDiagnosticFields({
      verifyRequestRef: "vr_4e795fbe99303008",
      normalizedIdentifier: "vr_4e795fbe99303008",
      rpcName: OPAQUE_CONTINUATION_PEEK_RPC,
      rpcArgumentName: OPAQUE_CONTINUATION_PEEK_RPC_ARG,
      data: [{
        jti: "22da5f72-23a8-482c-9e36-0052d60c975f",
        opaque_verify_request: "vr_4e795fbe99303008",
        consumed_at: null,
      }],
      error: null,
      mappedRecord: {
        jti: "22da5f72-23a8-482c-9e36-0052d60c975f",
        verifyRequestId: "vr_4e795fbe99303008",
        consumedAt: null,
      },
      mapAttempted: true,
      mapSucceeded: true,
    });

    expect(fields).toMatchObject({
      normalized_identifier_present: true,
      normalized_identifier_length: 19,
      rpc_name: OPAQUE_CONTINUATION_PEEK_RPC,
      rpc_argument_name: OPAQUE_CONTINUATION_PEEK_RPC_ARG,
      supabase_project_ref: PRODUCTION_REF,
      expected_production_project: true,
      client_role_classification: "service_role",
      url_key_project_match: true,
      error_present: false,
      data_present: true,
      data_kind: "array",
      array_length: 1,
      row_candidate_present: true,
      map_attempted: true,
      map_succeeded: true,
      mapped_jti: "22da5f72-23a8-482c-9e36-0052d60c975f",
      mapped_opaque_identifier_match: true,
      mapped_consumed: false,
    });
    expect(JSON.stringify(fields)).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });

  it("distinguishes RPC error from zero-row miss", () => {
    const fields = buildContinuationOpaqueRpcDiagnosticFields({
      normalizedIdentifier: "vr_4e795fbe99303008",
      rpcName: OPAQUE_CONTINUATION_PEEK_RPC,
      rpcArgumentName: OPAQUE_CONTINUATION_PEEK_RPC_ARG,
      data: [],
      error: {
        code: "PGRST202",
        message: "Could not find the function public.partner_flow_continuation_peek_by_opaque",
      },
      mapAttempted: false,
      mapSucceeded: false,
    });

    expect(fields).toMatchObject({
      error_present: true,
      safe_error_code: "PGRST202",
      safe_error_category: "postgrest",
      data_present: true,
      data_kind: "array",
      array_length: 0,
      row_candidate_present: false,
      map_attempted: false,
      map_succeeded: false,
    });
  });

  it("emits structured console diagnostic without secrets", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logContinuationOpaqueRpcDiagnostic({
      verifyRequestRef: "vr_4e795fbe99303008",
      normalizedIdentifier: "vr_4e795fbe99303008",
      rpcName: OPAQUE_CONTINUATION_PEEK_RPC,
      rpcArgumentName: OPAQUE_CONTINUATION_PEEK_RPC_ARG,
      data: [],
      error: null,
      mapAttempted: false,
      mapSucceeded: false,
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      type: "abraxas_hosted_handoff_continue_diagnostic",
      stage: "continuation_opaque_rpc",
      verify_request_ref: "vr_4e795fbe99303008",
      error_present: false,
      data_kind: "array",
      array_length: 0,
    });
    expect(payload).not.toHaveProperty("peek_found");
    errorSpy.mockRestore();
  });
});
