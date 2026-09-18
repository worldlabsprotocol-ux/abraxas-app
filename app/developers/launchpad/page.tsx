// FILE: app/developers/launchpad/page.tsx
// Partner Launchpad — self service sandbox integration workspace.

import { PartnerLaunchpadClient } from "@/components/partner/launchpad/PartnerLaunchpadClient";

export const dynamic = "force-dynamic";

export default function PartnerLaunchpadPage() {
  return <PartnerLaunchpadClient />;
}
