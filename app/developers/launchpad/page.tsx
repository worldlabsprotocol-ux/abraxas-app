// FILE: app/developers/launchpad/page.tsx
// Partner Launchpad — self service sandbox integration workspace.

import { PartnerLaunchpadClient } from "@/components/partner/launchpad/PartnerLaunchpadClient";
import { LaunchpadOperationalProvider } from "@/components/partner/launchpad/launchpadOperationalContext";
import { resolvePolicyChangeControlUiAvailability } from "@/lib/partner/launchpad/policyChangeControlAvailability";

export const dynamic = "force-dynamic";

export default async function PartnerLaunchpadPage() {
  const policyChangeControlAvailable = await resolvePolicyChangeControlUiAvailability();
  return (
    <LaunchpadOperationalProvider>
      <PartnerLaunchpadClient policyChangeControlAvailable={policyChangeControlAvailable} />
    </LaunchpadOperationalProvider>
  );
}
