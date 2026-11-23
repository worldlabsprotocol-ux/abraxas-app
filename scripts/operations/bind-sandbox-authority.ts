// Operator-only repair for one existing sandbox application. Dry run by default.
// Run in the authorized deployment environment with its existing database configuration.
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { inspectInstitutionalAuthorityBinding, institutionalAuthorityFromLaunchpad } from "@/lib/partner/trustExecution/institutionalAuthorityBinding";
import { readInstitutionalAuthorityBinding, syncInstitutionalAuthority } from "@/lib/partner/trustExecution/syncInstitutionalAuthority.server";

async function main() {
  const applicationId = process.argv[2]?.trim();
  const partnerId = process.argv[3]?.trim();
  const apply = process.argv[4] === "--apply";
  if (!applicationId || !partnerId || (process.argv[4] && !apply)) {
    throw new Error("Usage: bind-sandbox-authority <application-uuid> <partner-id> [--apply]");
  }

  const app = await getLaunchpadApplicationForPartner(applicationId, partnerId);
  const source = institutionalAuthorityFromLaunchpad(app);
  if (!source || source.partnerId !== partnerId) {
    console.log("UNAVAILABLE: no matching sandbox Launchpad authority");
    process.exitCode = 1;
    return;
  }
  const current = await readInstitutionalAuthorityBinding(applicationId);
  const inspection = inspectInstitutionalAuthorityBinding({
    authorizedApplicationId: applicationId,
    source,
    sovereign: current,
  });
  if (!apply) {
    // Report only the classification; never emit identifiers, policy or revision values.
    console.log(`${inspection.status.toUpperCase()}: read-only authority comparison; no write attempted`);
    if (inspection.status === "stale" || inspection.status === "conflicting"
        || inspection.status === "unavailable") process.exitCode = 1;
    return;
  }
  if (inspection.status !== "bindable" && inspection.status !== "already_bound") {
    throw new Error(`Authority binding refused: ${inspection.code}`);
  }
  const result = await syncInstitutionalAuthority({ authorizedApplicationId: applicationId, source });
  if (!result.ok) throw new Error(`Authority binding refused: ${result.code}`);
  console.log("Sandbox authority binding confirmed for the authorized application");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Authority binding failed";
  console.error(/^(Usage:|Authority binding refused:)/.test(message)
    ? message : "UNAVAILABLE: authorized source or trust store could not be read; inspect server logs");
  process.exitCode = 1;
});
