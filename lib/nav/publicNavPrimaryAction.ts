// FILE: lib/nav/publicNavPrimaryAction.ts
// Single primary header CTA by session state (Build 872).

import { PUBLIC_NAV_START_BUILDING } from "@/lib/design/publicSurface";

export type PublicNavPrimaryAction = {
  label: string;
  href: string;
  ariaLabel: string;
};

export function resolvePublicNavPrimaryAction(input: {
  /** Ephemeral wallet Abraxas session (developer workspace). */
  developerSessionAuthenticated: boolean;
  pathname: string;
}): PublicNavPrimaryAction {
  const onHome = input.pathname === "/";
  const startHref = onHome ? "#start-sandbox" : PUBLIC_NAV_START_BUILDING.href;

  if (input.developerSessionAuthenticated) {
    return {
      label: "Continue building",
      href: "/developers/ephemeral-sandbox",
      ariaLabel: "Continue in Developer Workspace",
    };
  }

  return {
    label: PUBLIC_NAV_START_BUILDING.label,
    href: startHref,
    ariaLabel: "Start building with Abraxas",
  };
}
