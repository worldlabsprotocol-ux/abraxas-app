// FILE: app/onboard/page.tsx
// Legacy asset onboarding — honest transition (deposit path retired).

import { AbxPageShell } from "@/components/design/AbxPageShell";
import { LegacyProductTransition } from "@/components/product/LegacyProductTransition";
import { LEGACY_ONBOARD_COPY } from "@/lib/product/legacyRoutes";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";

export default function OnboardPage() {
  return (
    <AbxPageShell accent="neutral">
      <div style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "clamp(2rem, 6vw, 3.5rem) clamp(1rem, 3vw, 2rem)",
      }}>
        <LegacyProductTransition {...LEGACY_ONBOARD_COPY} />
      </div>
      <RedesignFooter />
    </AbxPageShell>
  );
}
