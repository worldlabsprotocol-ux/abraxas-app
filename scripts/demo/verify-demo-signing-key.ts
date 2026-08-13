// FILE: scripts/demo/verify-demo-signing-key.ts
// CLI entry for local demo-only Ed25519 signing-key verification.

import {
  DEMO_SIGNING_KEY_EXIT,
  formatBootstrapError,
  formatVerifySuccessOutput,
  parseVerifyArgs,
  verifyDemoSigningKeyFiles,
} from "./lib/demoSigningKeyBootstrap";

async function main(): Promise<number> {
  try {
    const input = parseVerifyArgs(process.argv.slice(2));
    const result = await verifyDemoSigningKeyFiles(input);
    console.log(formatVerifySuccessOutput(result));
    return DEMO_SIGNING_KEY_EXIT.success;
  } catch (error) {
    console.error(formatBootstrapError(error));
    return DEMO_SIGNING_KEY_EXIT.failure;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(formatBootstrapError(error));
    process.exit(DEMO_SIGNING_KEY_EXIT.failure);
  });
