"use client";
// FILE: components/nav/PublicNavExploreLink.tsx

import Link from "next/link";
import { PUBLIC_NAV_EXPLORE_HREF } from "@/lib/nav/publicNavConnectBehavior";

export function PublicNavExploreLink({ prominent = false }: { prominent?: boolean }) {
  const className = [
    "public-nav-connect__trigger",
    "public-nav-connect__trigger--ghost",
    prominent ? "public-nav-connect__trigger--prominent" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={PUBLIC_NAV_EXPLORE_HREF} className={className} aria-label="Explore Abraxas without signing in">
      <span className="public-nav-connect__trigger-label">Explore</span>
    </Link>
  );
}
