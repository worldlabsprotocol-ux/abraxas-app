// FILE: app/api/passport/spec/route.ts
// Machine-readable Passport root spec for integrators (Sui-native + zkLogin).

import { NextResponse } from "next/server";
import {
  PASSPORT_FORMAT_VERSION,
  PASSPORT_SERIALIZED_SIZE,
  STAMP_BIT_ORDER,
  STAMP_BITS,
} from "@/lib/passport/stamps";
import { SUI_DEVNET } from "@/lib/sui/config";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    name: "Abraxas Passport Root",
    status: "sui-devnet",
    primary_chain: "sui",
    auth: {
      method: "zklogin",
      providers: ["google"],
      callback: "/auth/zklogin/callback",
      register_api: "/api/auth/zklogin/register",
      setup_guide: "/docs/zklogin-setup",
    },
    format_version: PASSPORT_FORMAT_VERSION,
    serialized_size_bytes: PASSPORT_SERIALIZED_SIZE,
    serialization: "little-endian fixed layout",
    layout: [
      { offset: 0, size: 1, field: "version", type: "u8" },
      { offset: 1, size: 2, field: "stamps", type: "u16 bitmask" },
      { offset: 3, size: 32, field: "authority", type: "bytes" },
      { offset: 35, size: 8, field: "expires_at", type: "u64 unix seconds, 0 = none" },
      { offset: 43, size: 1, field: "revoked", type: "u8 0|1" },
      { offset: 44, size: 8, field: "nonce", type: "u64" },
    ],
    signing_domain: "abraxas-passport-v1",
    stamp_bits: STAMP_BITS,
    stamp_order: STAMP_BIT_ORDER,
    proof_types: {
      0: "Ed25519 signature over domain || serialized_root",
      1: "Sui zkLogin ZK presentation (holder address)",
    },
    chains: {
      solana: {
        status: "deprecated",
        note: "Not used for Abraxas verification layer",
      },
      sui: {
        status: "primary-devnet",
        module_path: "sui/abraxas_passport/sources/passport.move",
        object: "Passport shared/owned object per subject",
        zklogin: "https://docs.sui.io/concepts/cryptography/zklogin",
        devnet: {
          rpc: SUI_DEVNET.rpcUrl,
          package_id: SUI_DEVNET.packageId,
          demo_passport_object_id: SUI_DEVNET.demoPassportObjectId,
          api: "/api/sui/passport",
        },
      },
    },
    docs: "/docs/passport-spec",
  });
}
