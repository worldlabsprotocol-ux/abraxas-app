// FILE: scripts/demo/generate-demo-signing-key.ts
// CLI entry for local demo-only Ed25519 signing-key generation.

import {
  DEMO_SIGNING_KEY_EXIT,
  formatBootstrapError,
  formatGenerateSuccessOutput,
  generateDemoSigningKeyFiles,
  parseGenerateArgs,
} from "./lib/demoSigningKeyBootstrap";

async function main(): Promise<number> {
  try {
    const input = parseGenerateArgs(process.argv.slice(2));
    const result = generateDemoSigningKeyFiles(input);
    console.log(formatGenerateSuccessOutput(result));
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
