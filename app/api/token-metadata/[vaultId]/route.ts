// FILE: app/api/token-metadata/[vaultId]/route.ts
// Wallets fetch this URI to render token name, symbol, image, attributes.

import { NextRequest, NextResponse } from "next/server";

const META: Record<string, { name: string; asset: string; apy: string }> = {
  "490": { name: "ABRAXAS MUSIC IP POSITION",    asset: "Music IP Royalties", apy: "12.8%" },
  "491": { name: "ABRAXAS MUSIC IP POSITION",    asset: "Music IP Royalties", apy: "11.4%" },
  "492": { name: "ABRAXAS REAL ESTATE POSITION", asset: "Real Estate",        apy: "6.2%"  },
  "493": { name: "ABRAXAS RECEIVABLES POSITION", asset: "Receivables",        apy: "9.1%"  },
  "494": { name: "ABRAXAS MUSIC IP POSITION",    asset: "Music IP Royalties", apy: "8.6%"  },
};

export async function GET(_req: NextRequest, { params }: { params: { vaultId: string } }) {
  const m = META[params.vaultId] ?? { name: "ABRAXAS POSITION", asset: "RWA", apy: "9%" };

  return NextResponse.json({
    name:        m.name,
    symbol:      "ABRAP",
    description: `Abraxas vault position. VAULT-${params.vaultId} · ${m.apy} APY · ${m.asset} · Non-custodial · Solana Token-2022.`,
    image:       "https://abraxas-app.vercel.app/icon.png",
    external_url: `https://abraxas-app.vercel.app/vault/${params.vaultId}`,
    attributes: [
      { trait_type: "Vault",       value: `VAULT-${params.vaultId}` },
      { trait_type: "Asset Class", value: m.asset    },
      { trait_type: "APY",         value: m.apy      },
      { trait_type: "Standard",    value: "Token-2022" },
      { trait_type: "Custody",     value: "Non-custodial" },
    ],
  }, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}