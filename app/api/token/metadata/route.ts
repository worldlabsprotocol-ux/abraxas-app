/**
 * GET /api/token-metadata/[vaultId]
 *
 * Returns NFT-compatible JSON metadata for Token-2022 position tokens.
 * Wallets (Phantom, Solflare) fetch this URI to display the token name,
 * symbol, image, and description to the user.
 */

import { NextRequest, NextResponse } from "next/server";

const VAULT_META: Record<string, {
  name: string; symbol: string; assetClass: string; apy: string;
}> = {
  "490": { name: "ABRAXAS MUSIC IP POSITION",   symbol: "ABRAP", assetClass: "Music IP Royalties",  apy: "12.8%" },
  "491": { name: "ABRAXAS MUSIC IP POSITION",   symbol: "ABRAP", assetClass: "Music IP Royalties",  apy: "11.4%" },
  "492": { name: "ABRAXAS REAL ESTATE POSITION",symbol: "ABRAP", assetClass: "Real Estate",         apy: "6.2%"  },
  "493": { name: "ABRAXAS RECEIVABLES POSITION",symbol: "ABRAP", assetClass: "Receivables",         apy: "9.1%"  },
  "494": { name: "ABRAXAS MUSIC IP POSITION",   symbol: "ABRAP", assetClass: "Music IP Royalties",  apy: "8.6%"  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { vaultId: string } }
) {
  const { vaultId } = params;
  const meta = VAULT_META[vaultId] ?? {
    name: "ABRAXAS VAULT POSITION", symbol: "ABRAP",
    assetClass: "RWA", apy: "9.0%",
  };

  return NextResponse.json({
    name:        meta.name,
    symbol:      meta.symbol,
    description: `Abraxas autonomous vault position — VAULT-${vaultId} · ${meta.apy} APY · ${meta.assetClass} · Non-custodial · Solana Token-2022. This token represents your operating position in the Abraxas vault. The agent operates your income stream automatically. View your position at abraxas-app.vercel.app/vault/${vaultId}`,
    image:       `https://abraxas-app.vercel.app/icon.png`,
    external_url:`https://abraxas-app.vercel.app/vault/${vaultId}`,
    attributes: [
      { trait_type: "Vault",        value: `VAULT-${vaultId}` },
      { trait_type: "Asset Class",  value: meta.assetClass    },
      { trait_type: "APY",          value: meta.apy           },
      { trait_type: "Standard",     value: "Token-2022"       },
      { trait_type: "Custody",      value: "Non-custodial"    },
      { trait_type: "Protocol",     value: "Abraxas"          },
      { trait_type: "Chain",        value: "Solana"           },
    ],
    properties: {
      category: "position",
      files: [{ uri: "https://abraxas-app.vercel.app/icon.png", type: "image/png" }],
    },
  }, {
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control":               "public, max-age=3600",
    },
  });
}