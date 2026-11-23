// Operator-only repair for one existing sandbox application. Dry run by default.
// Run in the authorized deployment environment with its existing database configuration.
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { institutionalAuthorityFromLaunchpad } from "@/lib/partner/trustExecution/institutionalAuthorityBinding";
import { loadPartnerApplicationAuthority } from "@/lib/partner/trustExecution/partnerTrustExecutionService";
import { syncInstitutionalAuthority } from "@/lib/partner/trustExecution/syncInstitutionalAuthority.server";

async function main() {
  const applicationId = process.argv[2]?.trim();
  const partnerId = process.argv[3]?.trim();
  const apply = process.argv[4] === "--apply";
  if (!applicationId || !partnerId || (process.argv[4] && !apply)) {
    throw new Error("Usage: bind-sandbox-authority <application-uuid> <partner-id> [--apply]");
  }

  const app = await getLaunchpadApplicationForPartner(applicationId, partnerId);
  const source = institutionalAuthorityFromLaunchpad(app);
  if (!source || source.applicationId !== applicationId || source.partnerId !== partnerId
      || source.status !== "active") {
    throw new Error("No active, matching sandbox Launchpad authority was found");
  }
  const current = await loadPartnerApplicationAuthority({ partnerId, applicationId });
  if (!apply) {
    // No names, policies, revisions or sensitive data are printed.
    console.log(current?.sourceRevision ? "Existing trust binding found; no write attempted"
      : "Trust binding absent or unversioned; no write attempted. Use --apply only after operator approval.");
    return;
  }
  const result = await syncInstitutionalAuthority({ authorizedApplicationId: applicationId, source });
  if (!result.ok) throw new Error(`Authority binding refused: ${result.code}`);
  console.log("Sandbox authority binding confirmed for the authorized application");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Authority binding failed";
  console.error(/^(Usage:|No active, matching|Authority binding refused:)/.test(message)
    ? message : "Authority binding failed; inspect authorized server logs");
  process.exitCode = 1;
});
