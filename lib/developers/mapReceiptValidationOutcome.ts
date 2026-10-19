// FILE: lib/developers/mapReceiptValidationOutcome.ts

export type ReceiptValidationUiState =
  | { status: "idle" }
  | { status: "checking" }
  | {
      status: "validated";
      checkedAt: string;
      signatureAuthentic: boolean;
      currentlyAcceptable: boolean;
      invalidationReasons: string[];
      standaloneCryptographicVerification?: boolean;
      serverRecordIntegrityVerified?: boolean;
      verificationSummary?: string;
    }
  | {
      status: "failed";
      title: string;
      message: string;
      recovery?: string;
      technicalCode?: string;
    };

export function mapReceiptValidationApiResponse(json: {
  ok?: boolean;
  checked_at?: string;
  signature_authentic?: boolean;
  currently_acceptable?: boolean;
  signature_valid?: boolean;
  currently_valid?: boolean;
  invalidation_reasons?: string[];
  session_independent?: boolean;
  server_record_integrity_verified?: boolean;
  standalone_cryptographic_verification?: boolean;
  signature_authentic_basis?: string;
  code?: string;
}): ReceiptValidationUiState {
  if (json.code === "result_not_found") {
    return {
      status: "failed",
      title: "Receipt not found",
      message: "This receipt is no longer available from online storage. Validation can still use the copy shown in your browser.",
      recovery: "Try again. If this persists, run another test and validate immediately.",
      technicalCode: json.code,
    };
  }
  if (json.code === "invalid_input" || json.code === "invalid_receipt") {
    return {
      status: "failed",
      title: "Receipt unavailable",
      message: "This receipt could not be checked.",
      recovery: "Run another test and validate again.",
      technicalCode: json.code,
    };
  }

  const signatureAuthentic = Boolean(json.signature_authentic ?? json.signature_valid);
  const currentlyAcceptable = Boolean(json.currently_acceptable ?? json.currently_valid);
  const invalidationReasons = Array.isArray(json.invalidation_reasons) ? json.invalidation_reasons : [];

  const sandboxRecordBasis =
    json.standalone_cryptographic_verification === false
    || json.signature_authentic_basis === "sandbox_server_record_and_policy_gates";

  if (!signatureAuthentic) {
    return {
      status: "failed",
      title: sandboxRecordBasis ? "Receipt check failed" : "Receipt not authentic",
      message: sandboxRecordBasis
        ? "This sandbox test receipt did not match Abraxas records and policy gates."
        : "The signature on this receipt could not be verified against trusted signing authority.",
      recovery: "Do not rely on this receipt. Run a new verification.",
      technicalCode: "signature_invalid",
    };
  }

  return {
    status: "validated",
    checkedAt: json.checked_at ?? new Date().toISOString(),
    signatureAuthentic,
    currentlyAcceptable,
    invalidationReasons,
    standaloneCryptographicVerification: json.standalone_cryptographic_verification,
    serverRecordIntegrityVerified: json.server_record_integrity_verified,
    verificationSummary: sandboxRecordBasis
      ? "Matched Abraxas sandbox storage and policy gates. This is session-independent validation, not standalone registry-backed cryptography."
      : undefined,
  };
}
