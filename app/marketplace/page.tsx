import { MarketplaceClient } from "./MarketplaceClient";
import { fetchAssets } from "@/lib/bags";

/**
 * Marketplace page (server component).
 * Fetches the Bags token launch feed at request time, then hands
 * data to the client component for filters/interactivity.
 *
 * If Bags API is unavailable, we render an empty Bags section and
 * fall back to mock Abraxas vaults — the page never breaks.
 */
export default async function MarketplacePage() {
  const bagsTokens = await fetchAssets().catch(() => []);
  return <MarketplaceClient bagsTokens={bagsTokens} />;
}
