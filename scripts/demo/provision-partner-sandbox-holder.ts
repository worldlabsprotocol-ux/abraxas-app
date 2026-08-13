// FILE: scripts/demo/provision-partner-sandbox-holder.ts
// CLI entry for Partner Sandbox synthetic holder provisioning (Phase C).

import { runProvisionerCommand } from "./lib/demoProvisionerCli";
import { PROVISIONER_EXIT } from "./lib/demoProvisionerGuard";
import { redactDatabaseSecrets } from "./lib/demoDatabaseUrl";
import { redactSecrets } from "./lib/demoProjectGuard";

runProvisionerCommand(process.argv.slice(2), process.env)
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(redactDatabaseSecrets(redactSecrets(message), process.env));
    process.exit(PROVISIONER_EXIT.failure);
  });
