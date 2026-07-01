// FILE: app/api/sui/passport/sponsor/route.ts
// Verify which sponsor wallet + IssuanceCap Abraxas is using (no secrets exposed).

import { NextResponse } from "next/server";
import { getSuiDevnetClient } from "@/lib/sui/client";
import { getSponsorConfig, isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSponsorConfig();
  const configured = isPassportIssuerConfigured();

  let capOwner: string | null = null;
  let capOwnerMatchesSponsor = false;

  if (config.issuance_cap_object_id) {
    try {
      const sui = getSuiDevnetClient();
      const obj = await sui.getObject({
        id: config.issuance_cap_object_id,
        options: { showOwner: true },
      });
      const owner = obj.data?.owner;
      if (owner && typeof owner === "object" && "AddressOwner" in owner) {
        capOwner = owner.AddressOwner as string;
        capOwnerMatchesSponsor = Boolean(
          config.sponsor_address &&
          capOwner.toLowerCase() === config.sponsor_address.toLowerCase(),
        );
      }
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({
    configured,
    ...config,
    cap_owner: capOwner,
    cap_owner_matches_sponsor: capOwnerMatchesSponsor,
    note: config.cap_from_env
      ? "Using YOUR cap from SUI_ISSUANCE_CAP_OBJECT_ID env var — legacy 0x06ee wallet is NOT used."
      : "Set SUI_ISSUANCE_CAP_OBJECT_ID in Vercel to your mint-cap output.",
  });
}
