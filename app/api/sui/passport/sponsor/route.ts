// FILE: app/api/sui/passport/sponsor/route.ts
// Verify which sponsor wallet + IssuanceCap Abraxas is using (no secrets exposed).

import { NextResponse } from "next/server";
import { getSuiDevnetClient } from "@/lib/sui/client";
import { getSponsorConfig, getSponsorEnvDiagnostics } from "@/lib/sui/passportIssuer";
import { getSuiNetwork } from "@/lib/sui/network";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSponsorConfig();
  const diagnostics = getSponsorEnvDiagnostics();
  const configured = diagnostics.issuer_fully_configured;

  let capOwner: string | null = null;
  let capOwnerMatchesSponsor = false;
  let cap_lookup_error: string | null = null;

  if (config.issuance_cap_object_id) {
    try {
      const sui = getSuiDevnetClient();
      const obj = await sui.getObject({
        id: config.issuance_cap_object_id,
        options: { showOwner: true },
      });
      if (!obj.data) {
        cap_lookup_error = "object_not_found_on_active_network";
      }
      const owner = obj.data?.owner;
      if (owner && typeof owner === "object" && "AddressOwner" in owner) {
        capOwner = owner.AddressOwner as string;
        capOwnerMatchesSponsor = Boolean(
          config.sponsor_address &&
          capOwner.toLowerCase() === config.sponsor_address.toLowerCase(),
        );
      }
    } catch {
      cap_lookup_error = "cap_lookup_failed";
    }
  }

  const hints: string[] = [];
  if (diagnostics.sponsor_key_status === "invalid") {
    hints.push("SUI_SPONSOR_SECRET_KEY is set but does not decode — use full suiprivkey1… export, no quotes, no seed phrase.");
  }
  if (!diagnostics.issuance_cap_length_ok && diagnostics.env_flags.SUI_ISSUANCE_CAP_OBJECT_ID_set) {
    hints.push(`SUI_ISSUANCE_CAP_OBJECT_ID length is ${diagnostics.issuance_cap_length} — must be 66 chars (0x + 64 hex). Re-copy from npm run sui:mint-cap.`);
  }
  if (getSuiNetwork() === "mainnet") {
    hints.push("SUI_NETWORK=mainnet but Move package is not published on mainnet yet — set SUI_NETWORK=devnet until mainnet deploy.");
  }
  if (cap_lookup_error === "object_not_found_on_active_network") {
    hints.push("Cap ID not found on active Sui network — devnet cap with mainnet network (or vice versa).");
  }

  return NextResponse.json({
    ...config,
    ...diagnostics,
    active_sui_network: getSuiNetwork(),
    configured,
    cap_owner: capOwner,
    cap_owner_matches_sponsor: capOwnerMatchesSponsor,
    cap_lookup_error,
    fix_hints: hints,
    note: config.cap_from_env
      ? "Using YOUR cap from SUI_ISSUANCE_CAP_OBJECT_ID env var — legacy 0x06ee wallet is NOT used."
      : "Set SUI_ISSUANCE_CAP_OBJECT_ID in Vercel to your mint-cap output.",
  });
}
