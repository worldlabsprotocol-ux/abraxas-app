import { createHash } from "node:crypto";

/** Anchor instruction discriminator: sha256("global:{name}")[0:8]. */
export function anchorGlobalDiscriminator(instructionName: string): Buffer {
  return createHash("sha256").update(`global:${instructionName}`).digest().subarray(0, 8);
}

export const EXECUTE_HARNESS_RUN_DISCRIMINATOR = anchorGlobalDiscriminator("execute_harness_run");
export const REGISTER_SANDBOX_BINDING_DISCRIMINATOR = anchorGlobalDiscriminator("register_sandbox_binding");