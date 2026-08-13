// FILE: scripts/demo/lib/demoProvisionerState.ts
// Atomic local state file for Partner Sandbox holder provisioning.

import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname } from "node:path";
import {
  DEMO_PROVISIONER_SCHEMA_VERSION,
  DEMO_SANDBOX_HOLDER_STATE_PATH,
  DEMO_STATE_FILE_MAX_BYTES,
} from "./demoProvisionerConfig";
import {
  assertProvisionIdFormat,
  deriveSubjectIdFromProvisionId,
  isValidProvisionId,
} from "./demoProvisionerSubject";
import { normalizeSuiAddress } from "@mysten/sui/utils";

export interface SandboxHolderStateV1 {
  schema_version: typeof DEMO_PROVISIONER_SCHEMA_VERSION;
  supabase_project_ref: string;
  provision_id: string;
  subject_id: string;
  credential_jti: string;
  credential_expires_at: string;
  screening_expires_at: string;
  applied_at: string;
  jurisdiction: string;
}

const ALLOWED_STATE_KEYS = new Set([
  "schema_version",
  "supabase_project_ref",
  "provision_id",
  "subject_id",
  "credential_jti",
  "credential_expires_at",
  "screening_expires_at",
  "applied_at",
  "jurisdiction",
]);

export class DemoProvisionerStateError extends Error {
  readonly code:
    | "state_missing"
    | "state_not_regular_file"
    | "state_symlink"
    | "state_too_large"
    | "state_invalid_json"
    | "state_schema_invalid"
    | "state_project_ref_mismatch";

  constructor(code: DemoProvisionerStateError["code"], message: string) {
    super(message);
    this.name = "DemoProvisionerStateError";
    this.code = code;
  }
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function assertNoSymlinkPath(path: string): void {
  if (!existsSync(path)) return;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    throw new DemoProvisionerStateError("state_symlink", "State file path must not be a symlink");
  }
}

function assertValidSuiAddress(subjectId: string): string {
  try {
    return normalizeSuiAddress(subjectId);
  } catch {
    throw new DemoProvisionerStateError("state_schema_invalid", "State file subject_id is invalid");
  }
}

export function validateSandboxHolderState(
  raw: unknown,
  expectedProjectRef?: string,
): SandboxHolderStateV1 {
  if (!raw || typeof raw !== "object") {
    throw new DemoProvisionerStateError("state_schema_invalid", "State file schema is invalid");
  }

  const record = raw as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (!ALLOWED_STATE_KEYS.has(key)) {
      throw new DemoProvisionerStateError(
        "state_schema_invalid",
        `State file contains unknown field: ${key}`,
      );
    }
  }

  if (record.schema_version !== DEMO_PROVISIONER_SCHEMA_VERSION) {
    throw new DemoProvisionerStateError("state_schema_invalid", "Unsupported state schema_version");
  }

  const requiredStringFields = [
    "supabase_project_ref",
    "provision_id",
    "subject_id",
    "credential_jti",
    "credential_expires_at",
    "screening_expires_at",
    "applied_at",
    "jurisdiction",
  ] as const;

  for (const field of requiredStringFields) {
    if (typeof record[field] !== "string" || !record[field]) {
      throw new DemoProvisionerStateError(
        "state_schema_invalid",
        `State file field ${field} is required`,
      );
    }
  }

  if (
    !isIsoTimestamp(record.credential_expires_at) ||
    !isIsoTimestamp(record.screening_expires_at) ||
    !isIsoTimestamp(record.applied_at)
  ) {
    throw new DemoProvisionerStateError("state_schema_invalid", "State file timestamps are invalid");
  }

  const provisionId = assertProvisionIdFormat(record.provision_id as string);
  const subjectId = assertValidSuiAddress(record.subject_id as string);
  const expectedSubject = deriveSubjectIdFromProvisionId(provisionId);
  if (subjectId !== expectedSubject) {
    throw new DemoProvisionerStateError(
      "state_schema_invalid",
      "State file subject_id does not match provision_id derivation",
    );
  }

  const expectedJti = `urn:uuid:${provisionId}`;
  if (record.credential_jti !== expectedJti) {
    throw new DemoProvisionerStateError(
      "state_schema_invalid",
      "State file credential_jti does not match provision_id",
    );
  }

  if (!isValidProvisionId(provisionId)) {
    throw new DemoProvisionerStateError("state_schema_invalid", "State file provision_id is invalid");
  }

  const state: SandboxHolderStateV1 = {
    schema_version: DEMO_PROVISIONER_SCHEMA_VERSION,
    supabase_project_ref: record.supabase_project_ref as string,
    provision_id: provisionId,
    subject_id: subjectId,
    credential_jti: record.credential_jti as string,
    credential_expires_at: record.credential_expires_at as string,
    screening_expires_at: record.screening_expires_at as string,
    applied_at: record.applied_at as string,
    jurisdiction: record.jurisdiction as string,
  };

  if (
    expectedProjectRef &&
    state.supabase_project_ref.trim() !== expectedProjectRef.trim()
  ) {
    throw new DemoProvisionerStateError(
      "state_project_ref_mismatch",
      "State file supabase_project_ref does not match DEMO_SUPABASE_PROJECT_REF",
    );
  }

  return state;
}

export function readSandboxHolderState(input?: {
  path?: string;
  expectedProjectRef?: string;
}): SandboxHolderStateV1 {
  const path = input?.path ?? DEMO_SANDBOX_HOLDER_STATE_PATH;
  assertRegularFileOrAbsent(path, { allowAbsent: false });
  const content = readFileSync(path, "utf8");
  if (Buffer.byteLength(content, "utf8") > DEMO_STATE_FILE_MAX_BYTES) {
    throw new DemoProvisionerStateError("state_too_large", "State file exceeds maximum size");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new DemoProvisionerStateError("state_invalid_json", "State file is not valid JSON");
  }

  return validateSandboxHolderState(parsed, input?.expectedProjectRef);
}

export function assertRegularFileOrAbsent(
  path: string,
  options: { allowAbsent: boolean },
): void {
  if (!existsSync(path)) {
    if (options.allowAbsent) return;
    throw new DemoProvisionerStateError("state_missing", "Sandbox holder state file is missing");
  }

  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    throw new DemoProvisionerStateError("state_symlink", "State file path must not be a symlink");
  }
  if (!stat.isFile()) {
    throw new DemoProvisionerStateError(
      "state_not_regular_file",
      "State file path must be a regular file",
    );
  }
}

function fsyncDirectoryBestEffort(dir: string): void {
  let dirFd: number | undefined;
  try {
    dirFd = openSync(dir, constants.O_RDONLY | constants.O_DIRECTORY);
    fsyncSync(dirFd);
  } catch {
    // directory fsync is best-effort across platforms
  } finally {
    if (dirFd !== undefined) {
      try {
        closeSync(dirFd);
      } catch {
        // ignore
      }
    }
  }
}

export function writeSandboxHolderStateAtomic(
  state: SandboxHolderStateV1,
  options?: { path?: string },
): void {
  const path = options?.path ?? DEMO_SANDBOX_HOLDER_STATE_PATH;
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  assertNoSymlinkPath(dir);

  if (existsSync(path)) {
    assertRegularFileOrAbsent(path, { allowAbsent: false });
  }

  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  const bytes = Buffer.from(serialized, "utf8");
  if (bytes.byteLength > DEMO_STATE_FILE_MAX_BYTES) {
    throw new DemoProvisionerStateError("state_too_large", "State payload exceeds maximum size");
  }

  const tmpPath = `${path}.${process.pid}.tmp`;
  assertNoSymlinkPath(tmpPath);

  let fd: number | undefined;
  try {
    fd = openSync(tmpPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    writeSync(fd, bytes);
    fsyncSync(fd);
    fstatSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(tmpPath, path);
    fsyncDirectoryBestEffort(dir);
  } catch (error) {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // ignore close errors while cleaning up
      }
    }
    if (existsSync(tmpPath)) {
      try {
        unlinkSync(tmpPath);
      } catch {
        // ignore cleanup errors
      }
    }
    throw error;
  }
}

export function tryReadSandboxHolderState(input?: {
  path?: string;
  expectedProjectRef?: string;
}): SandboxHolderStateV1 | null {
  const path = input?.path ?? DEMO_SANDBOX_HOLDER_STATE_PATH;
  if (!existsSync(path)) return null;
  return readSandboxHolderState(input);
}
