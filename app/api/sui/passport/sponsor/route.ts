// FILE: app/api/sui/passport/sponsor/route.ts
// Verify which sponsor wallet + IssuanceCap Abraxas is using (no secrets exposed).

import { NextResponse } from "next/server";
import { getSuiDevnetClient } from "@/lib/sui/serverClient";
import { isSuiMainnetDeployed } from "@/lib/sui/config";
import { getSponsorConfig, getSponsorEnvDiagnostics } from "@/lib/sui/passportIssuer";
import { getSuiNetwork } from "@/lib/sui/network";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSponsorConfig();
  const diagnostics = getSponsorEnvDiagnostics();
  const network = getSuiNetwork();
  const mainnetDeployed = isSuiMainnetDeployed();
  const configured = diagnostics.issuer_fully_configured && (network !== "mainnet" || mainnetDeployed);

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
  if (diagnostics.sponsor_key_status === "missing") {
    hints.push("Set SUI_SPONSOR_SECRET_KEY in Vercel (full suiprivkey1 export from sponsor wallet).");
  }
  if (diagnostics.sponsor_key_status === "invalid") {
    hints.push("SUI_SPONSOR_SECRET_KEY is set but does not decode. Use full suiprivkey1 export, no quotes, no seed phrase.");
  }
  if (!diagnostics.env_flags.SUI_ISSUANCE_CAP_OBJECT_ID_set) {
    hints.push("Set SUI_ISSUANCE_CAP_OBJECT_ID after npm run sui:mint-cap.");
  }
  if (!diagnostics.issuance_cap_length_ok && diagnostics.env_flags.SUI_ISSUANCE_CAP_OBJECT_ID_set) {
    hints.push(`SUI_ISSUANCE_CAP_OBJECT_ID length is ${diagnostics.issuance_cap_length}. Must be 66 chars (0x + 64 hex).`);
  }
  if (network === "mainnet" && !mainnetDeployed) {
    hints.push(
      "SUI_NETWORK=mainnet but Passport package is not published yet. Complete gate #2 audit, then CONFIRM_MAINNET=1 npm run sui:deploy:mainnet. Until then, set SUI_NETWORK=devnet in Vercel.",
    );
  }
  if (cap_lookup_error === "object_not_found_on_active_network") {
    hints.push(`IssuanceCap not found on ${network}. Mint cap on the active network or fix SUI_NETWORK.`);
  }
  if (diagnostics.issuer_fully_configured && capOwnerMatchesSponsor === false && capOwner) {
    hints.push("IssuanceCap owner does not match sponsor wallet. Mint a new cap from the sponsor address.");
  }

  return NextResponse.json({
    ...config,
    ...diagnostics,
    active_sui_network: network,
    mainnet_package_deployed: mainnetDeployed,
    configured,
    issuer_ready: configured && capOwnerMatchesSponsor !== false,
    cap_owner: capOwner,
    cap_owner_matches_sponsor: capOwnerMatchesSponsor,
    cap_lookup_error,
    fix_hints: hints,
    cutover_doc: "/docs/MAINNET_CUTOVER.md",
    note: config.cap_from_env
      ? "Using cap from SUI_ISSUANCE_CAP_OBJECT_ID."
      : "Set SUI_ISSUANCE_CAP_OBJECT_ID in Vercel after mint-cap.",
  });
}
