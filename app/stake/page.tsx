"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StakePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tokenomics#tiers");
  }, [router]);
  return null;
}
