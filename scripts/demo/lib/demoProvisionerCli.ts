// FILE: scripts/demo/lib/demoProvisionerCli.ts
// Command orchestration for Partner Sandbox holder provisioning (testable entry).

import {
  formatProvisionerApplyReport,
  formatCommittedStateWriteFailure,
  runProvisionerApply,
} from "./demoProvisionerApply";
import {
  buildProvisionerDryRunReport,
  formatProvisionerDryRunReport,
} from "./demoProvisionerDryRun";
import {
  assertApplyConfirmation,
  DemoProvisionerCommittedStateError,
  DemoProvisionerConflictError,
  DemoProvisionerLockError,
  mapProvisionerErrorToExitCode,
  parseProvisionerArgs,
  PROVISIONER_EXIT,
  rejectProductionNodeEnv,
  validateProvisionerDatabaseConfig,
  validateProvisionerDryRunConfig,
} from "./demoProvisionerGuard";
import { DemoDatabaseUrlError, redactDatabaseSecrets } from "./demoDatabaseUrl";
import { DemoProjectGuardError, redactSecrets } from "./demoProjectGuard";
import {
  promptDatabaseUrlIfNeeded,
  promptSigningKeyIfNeeded,
  unsetProvisionerSecrets,
} from "./demoProvisionerSecrets";
import { DemoProvisionerSigningError, signingKeySafeErrorMessage } from "./demoProvisionerSigning";
import { DemoProvisionerStateError } from "./demoProvisionerState";
import {
  formatProvisionerVerifyReport,
  runProvisionerVerify,
  verifyExitCode,
} from "./demoProvisionerVerify";
import { DemoSslRootCertError } from "./demoSslRootCert";
import {
  assertDemoSigningKeyBootstrapConfigured,
  DemoSigningKeyBootstrapError,
} from "./expectedDemoSigningKeyThumbprint";

export async function runProvisionerCommand(
  argv: string[],
  env: Record<string, string | undefined>,
): Promise<number> {
  const args = parseProvisionerArgs(argv);

  try {
    rejectProductionNodeEnv(env);

    if (args.mode === "dry-run") {
      const config = validateProvisionerDryRunConfig(env);
      const report = buildProvisionerDryRunReport(config);
      console.log(formatProvisionerDryRunReport(report));
      return PROVISIONER_EXIT.success;
    }

    if (args.mode === "apply") {
      assertApplyConfirmation(
        args.confirm,
        validateProvisionerDryRunConfig(env).demoProjectRef,
      );
      assertDemoSigningKeyBootstrapConfigured();
    }

    const databaseUrl = await promptDatabaseUrlIfNeeded(env);

    if (args.mode === "verify") {
      const config = validateProvisionerDatabaseConfig(env, databaseUrl);
      try {
        const report = await runProvisionerVerify({
          config,
          recoverProvisionId: args.recoverProvisionId,
          env,
        });
        console.log(formatProvisionerVerifyReport(report));
        return verifyExitCode(report);
      } finally {
        unsetProvisionerSecrets(env);
      }
    }

    const config = validateProvisionerDatabaseConfig(env, databaseUrl);
    const signingKeyJson = await promptSigningKeyIfNeeded(env);

    try {
      const report = await runProvisionerApply({
        config,
        signingKeyJson,
        env,
      });
      console.log(formatProvisionerApplyReport(report));
      return PROVISIONER_EXIT.success;
    } finally {
      unsetProvisionerSecrets(env);
    }
  } catch (error) {
    if (error instanceof DemoProvisionerCommittedStateError) {
      console.error(formatCommittedStateWriteFailure(error.provisionId));
      return PROVISIONER_EXIT.committedStateWriteFailed;
    }

    if (error instanceof DemoSigningKeyBootstrapError) {
      console.error(redactSecrets(`Configuration error [${error.code}]: ${error.message}`));
      return PROVISIONER_EXIT.config;
    }

    if (error instanceof DemoProvisionerLockError) {
      console.error(redactSecrets(error.message));
      return PROVISIONER_EXIT.lockHeld;
    }

    if (error instanceof DemoProjectGuardError) {
      console.error(redactSecrets(`Configuration error [${error.code}]: ${error.message}`));
      return PROVISIONER_EXIT.config;
    }

    if (error instanceof DemoDatabaseUrlError) {
      console.error(redactDatabaseSecrets(redactSecrets(error.message), env));
      return PROVISIONER_EXIT.config;
    }

    if (error instanceof DemoSslRootCertError) {
      console.error(redactDatabaseSecrets(redactSecrets(error.message), env));
      return PROVISIONER_EXIT.config;
    }

    if (error instanceof DemoProvisionerSigningError) {
      console.error(redactSecrets(signingKeySafeErrorMessage(error)));
      return PROVISIONER_EXIT.config;
    }

    if (error instanceof DemoProvisionerStateError) {
      console.error(redactSecrets(`State error [${error.code}]: ${error.message}`));
      return mapProvisionerErrorToExitCode(error);
    }

    if (error instanceof DemoProvisionerConflictError) {
      console.error(redactSecrets(`Conflict: ${error.message}`));
      return PROVISIONER_EXIT.conflict;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(redactDatabaseSecrets(redactSecrets(message), env));
    return PROVISIONER_EXIT.failure;
  }
}
