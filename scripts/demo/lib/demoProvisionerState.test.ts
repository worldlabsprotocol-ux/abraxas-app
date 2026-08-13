// FILE: scripts/demo/lib/demoProvisionerState.test.ts

import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DemoProvisionerStateError,
  readSandboxHolderState,
  validateSandboxHolderState,
  writeSandboxHolderStateAtomic,
} from "./demoProvisionerState";
import { deriveSubjectIdFromProvisionId } from "./demoProvisionerSubject";

describe("demoProvisionerState", () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) {
      rmSync(dirs.pop()!, { recursive: true, force: true });
    }
  });

  function tempStatePath(): string {
    const dir = mkdtempSync(join(tmpdir(), "demo-state-"));
    dirs.push(dir);
    return join(dir, ".sandbox-holder.json");
  }

  const provisionId = "33333333-3333-4333-8333-333333333333";
  const subjectId = deriveSubjectIdFromProvisionId(provisionId);

  const validState = {
    schema_version: 1,
    supabase_project_ref: "ocntwbxarpjeixdnzide",
    provision_id: provisionId,
    subject_id: subjectId,
    credential_jti: `urn:uuid:${provisionId}`,
    credential_expires_at: "2027-01-01T00:00:00.000Z",
    screening_expires_at: "2026-06-02T00:00:00.000Z",
    applied_at: "2026-06-01T00:00:00.000Z",
    jurisdiction: "US",
  };

  it("validates schema, unknown keys, and project ref binding", () => {
    const parsed = validateSandboxHolderState(validState, "ocntwbxarpjeixdnzide");
    expect(parsed.provision_id).toBe(provisionId);

    expect(() => validateSandboxHolderState(validState, "other-ref")).toThrow(
      DemoProvisionerStateError,
    );

    expect(() =>
      validateSandboxHolderState({ ...validState, extra: "nope" }, "ocntwbxarpjeixdnzide"),
    ).toThrow(/unknown field/);
  });

  it("rejects subject_id that does not match provision_id derivation", () => {
    expect(() =>
      validateSandboxHolderState({
        ...validState,
        subject_id: "0x00000000000000000000000000000000000000000000000000000000000000f1",
      }),
    ).toThrow(/derivation/);
  });

  it("writes atomically with mode 0600", () => {
    const path = tempStatePath();
    writeSandboxHolderStateAtomic(validState, { path });
    expect(existsSync(path)).toBe(true);
    const statMode = statSync(path).mode & 0o777;
    expect(statMode).toBe(0o600);
    const parsed = readSandboxHolderState({ path, expectedProjectRef: "ocntwbxarpjeixdnzide" });
    expect(parsed.subject_id).toBe(subjectId);
  });

  it("rejects symlink targets", () => {
    const dir = mkdtempSync(join(tmpdir(), "demo-state-link-"));
    dirs.push(dir);
    const target = join(dir, "target.json");
    const link = join(dir, "link.json");
    writeFileSync(target, "{}");
    symlinkSync(target, link);
    expect(() => readSandboxHolderState({ path: link })).toThrow(/symlink/);
  });

  it("rejects oversized files", () => {
    const path = tempStatePath();
    writeFileSync(path, `${"x".repeat(5000)}`);
    chmodSync(path, 0o600);
    expect(() => readSandboxHolderState({ path })).toThrow(/maximum size/);
  });
});
