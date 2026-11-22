"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PremiumHomeHero } from "@/components/home/premium/PremiumHomeHero";
import { HomeDiscoveryBegin, HomeDiscoveryStory } from "@/components/home/premium/HomeDiscoveryStory";
import { HomeTrustContinuousArchitectureImage } from "@/components/home/HomeTrustContinuousArchitectureImage";
import { resolvePublicNavPrimaryAction } from "@/lib/nav/publicNavPrimaryAction";
import { CINEMATIC_HOME_CTA_PRIMARY, CINEMATIC_HOME_CTA_PRIMARY_HREF } from "@/lib/home/cinematicHomeCopy";

/** The product entry is primary; the existing educational chapters remain optional. */
export function PremiumHomeHeroCarousel() {
  const pathname = usePathname() ?? "/";
  const [activePillar, setActivePillar] = useState(0);
  const [educationOpen, setEducationOpen] = useState(false);
  const [cta, setCta] = useState({ label: CINEMATIC_HOME_CTA_PRIMARY, href: CINEMATIC_HOME_CTA_PRIMARY_HREF });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin", cache: "no-store" });
        const enabledJson = (await enabledRes.json()) as { auth_mode?: string };
        if (enabledJson.auth_mode !== "ephemeral_wallet") return;
        const sessionRes = await fetch("/api/auth/wallet/session", { credentials: "same-origin", cache: "no-store" });
        const sessionJson = (await sessionRes.json()) as { authenticated?: boolean };
        if (!cancelled && sessionJson.authenticated) {
          const action = resolvePublicNavPrimaryAction({ developerSessionAuthenticated: true, pathname });
          setCta({ label: action.label, href: action.href });
        }
      } catch {
        // Keep the public builder entry when session status cannot be read.
      }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <div className="abx-premium-home-intro">
      <PremiumHomeHero variant="carousel" cta={cta} />
      <details className="abx-premium-home-intro__details" onToggle={(event) => setEducationOpen(event.currentTarget.open)}>
        <summary>Explore how Abraxas works</summary>
        {educationOpen ? (
          <>
            <HomeDiscoveryStory activePillar={activePillar} onSelectPillar={setActivePillar} />
            <div className="abx-premium-home-intro__diagram">
              <HomeTrustContinuousArchitectureImage priority={false} />
            </div>
            <HomeDiscoveryBegin />
          </>
        ) : null}
      </details>
    </div>
  );
}
