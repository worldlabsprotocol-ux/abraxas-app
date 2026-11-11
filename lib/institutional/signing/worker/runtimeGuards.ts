import {
  GOVERNANCE_OPERATOR_PG_URL_ENV_NAME,
  INSTITUTIONAL_WORKER_ENV_FLAG,
} from "../custodyImplementation";
import { LIVE_AWS_KMS_REQUIRED_ENV_VARS } from "../awsKmsLiveTestEnv";

const CUSTODY_CREDENTIAL_PREFIXES = [
  "ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID",
  "ABRAXAS_AWS_KMS_ISSUER_SECRET_ACCESS_KEY",
  "ABRAXAS_AWS_KMS_STATUS_ACCESS_KEY_ID",
  "ABRAXAS_AWS_KMS_STATUS_SECRET_ACCESS_KEY",
] as const;

export function assertInstitutionalWorkerProcessEnv(
  env: Record<string, string | undefined> = process.env,
):
  | { ok: true }
  | { ok: false; reason: "institutional_worker_flag_required" | "vercel_worker_forbidden" | "governance_operator_url_forbidden_on_worker" } {
  if (env[INSTITUTIONAL_WORKER_ENV_FLAG]?.trim() !== "1") {
    return { ok: false, reason: "institutional_worker_flag_required" };
  }
  if (env.VERCEL?.trim() === "1" || env.VERCEL_ENV?.trim()) {
    return { ok: false, reason: "vercel_worker_forbidden" };
  }
  if (env[GOVERNANCE_OPERATOR_PG_URL_ENV_NAME]?.trim()) {
    return { ok: false, reason: "governance_operator_url_forbidden_on_worker" };
  }
  return { ok: true };
}

export function assertReceiptRuntimeMustNotHoldInstitutionalCustody(
  env: Record<string, string | undefined> = process.env,
):
  | { ok: true }
  | {
      ok: false;
      reason:
        | "institutional_worker_flag_on_receipt_runtime"
        | "institutional_custody_credentials_on_receipt_runtime"
        | "governance_operator_url_on_receipt_runtime";
    } {
  if (env[INSTITUTIONAL_WORKER_ENV_FLAG]?.trim() === "1") {
    return { ok: false, reason: "institutional_worker_flag_on_receipt_runtime" };
  }
  for (const name of CUSTODY_CREDENTIAL_PREFIXES) {
    if (env[name]?.trim()) {
      return { ok: false, reason: "institutional_custody_credentials_on_receipt_runtime" };
    }
  }
  if (env.VERCEL?.trim() === "1" || env.VERCEL_ENV?.trim()) {
    for (const name of LIVE_AWS_KMS_REQUIRED_ENV_VARS) {
      if (name.endsWith("_ACCESS_KEY_ID") || name.endsWith("_SECRET_ACCESS_KEY")) {
        if (env[name]?.trim()) {
          return { ok: false, reason: "institutional_custody_credentials_on_receipt_runtime" };
        }
      }
    }
    if (env[GOVERNANCE_OPERATOR_PG_URL_ENV_NAME]?.trim()) {
      return { ok: false, reason: "governance_operator_url_on_receipt_runtime" };
    }
  }
  return { ok: true };
}
