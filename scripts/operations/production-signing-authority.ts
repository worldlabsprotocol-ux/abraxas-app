// Operator entrypoint. Run on the founder's trusted Windows machine, outside the cloud agent.
// Private JWKs stay in the absolute --output directory. This process does not delete them.

import { spawnSync } from "node:child_process";
import {
  formatPublicSummary,
  generateProductionAuthorities,
  installProductionSecrets,
  ProductionSigningAuthorityError,
  restoreCheckRecovery,
  verifyProductionAuthorities,
  verifyVercelScopes,
  writeEncryptedRecovery,
} from "./productionSigningAuthority";

function runCommand(command: string, args: readonly string[], input: string) {
  const result = spawnSync(command, args, {
    input,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function outputDir(argv: string[]): string {
  const index = argv.indexOf("--output");
  const value = index >= 0 ? argv[index + 1] : "";
  if (!value || value.startsWith("--")) {
    throw new ProductionSigningAuthorityError("output_required", "Pass --output with an absolute directory outside the repository");
  }
  return value;
}

function main(): number {
  const argv = process.argv.slice(2);
  const command = argv[0];
  try {
    if (command === "generate") {
      console.log(formatPublicSummary(generateProductionAuthorities(outputDir(argv))));
      return 0;
    }
    if (command === "verify") {
      console.log(formatPublicSummary(verifyProductionAuthorities(outputDir(argv))));
      return 0;
    }
    if (command === "backup") {
      const path = writeEncryptedRecovery(outputDir(argv), process.env, process.argv);
      console.log(`recovery_backup: ${path}`);
      console.log("Keep this encrypted file and its passphrase. Do not delete the unencrypted private files yet.");
      return 0;
    }
    if (command === "restore-check") {
      console.log(formatPublicSummary(restoreCheckRecovery(outputDir(argv), process.env, process.argv)));
      console.log("restore_check: ok");
      return 0;
    }
    if (command === "install") {
      const saved = installProductionSecrets(outputDir(argv), runCommand);
      console.log(saved.map((name) => `production_secret_saved: ${name}`).join("\n"));
      console.log("Private files were retained. Confirm scopes with verify-vercel before any redeploy.");
      return 0;
    }
    if (command === "verify-vercel") {
      verifyVercelScopes(runCommand);
      console.log("vercel_scope: production_only");
      return 0;
    }
    console.error("Usage: generate | verify | backup | restore-check | install | verify-vercel --output <absolute directory outside the repo>");
    return 2;
  } catch (error) {
    const message = error instanceof ProductionSigningAuthorityError
      ? `${error.code}: ${error.message}`
      : "ceremony_failed";
    console.error(message);
    return 2;
  }
}

process.exit(main());
