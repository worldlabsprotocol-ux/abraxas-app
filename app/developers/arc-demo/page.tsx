// FILE: app/developers/arc-demo/page.tsx

import { ArcSettlementDemoClient } from "@/components/arc/ArcSettlementDemoClient";

export const metadata = {
  title: "Arc Testnet Settlement Demo | Abraxas",
  description: "Abraxas hosted Arc Testnet proof gated USDC settlement demonstration.",
};

export default function ArcDemoPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const appSlug = searchParams.app ?? "demo";
  return <ArcSettlementDemoClient appSlug={appSlug} />;
}
