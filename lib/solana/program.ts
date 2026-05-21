// FILE: lib/solana/program.ts
// Anchor v0.30+: new Program(idl, provider) — no programId argument.
// programId lives in idl.address. All dynamic imports = zero browser errors.
"use client";

export const PROGRAM_ID_STRING =
  process.env.NEXT_PUBLIC_VERIFICATION_PROGRAM_ID ??
  "ABRAXASverify1111111111111111111111111111111";

// IDL includes address — required by Anchor v0.30+
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IDL: any = {
  address: "ABRAXASverify1111111111111111111111111111111",
  version: "0.1.0",
  name:    "abraxas_verification",
  instructions: [
    {
      name: "mintCertificate",
      accounts: [
        { name: "certificate",   writable: true              },
        { name: "payer",         writable: true, signer: true },
        { name: "verifier",                      signer: true },
        { name: "systemProgram"                               },
      ],
      args: [{ name: "params", type: { defined: { name: "CertificateParams" } } }],
    },
    {
      name: "revokeCertificate",
      accounts: [
        { name: "certificate", writable: true              },
        { name: "verifier",                   signer: true },
      ],
      args: [{ name: "reason", type: "string" }],
    },
    {
      name: "updateRiskScore",
      accounts: [
        { name: "certificate", writable: true              },
        { name: "verifier",                   signer: true },
      ],
      args: [
        { name: "newCollateralScore", type: "u8" },
        { name: "newFraudRisk",       type: "u8" },
      ],
    },
  ],
  accounts: [
    {
      name: "VerificationCertificate",
      type: {
        kind: "struct",
        fields: [
          { name: "assetId",          type: "publicKey"           },
          { name: "verifier",         type: "publicKey"           },
          { name: "provenanceRoot",   type: { array: ["u8", 32] } },
          { name: "custodyRef",       type: { array: ["u8", 32] } },
          { name: "collateralScore",  type: "u8"                  },
          { name: "fraudRisk",        type: "u8"                  },
          { name: "issuedAt",         type: "i64"                 },
          { name: "validUntil",       type: "i64"                 },
          { name: "revoked",          type: "bool"                },
          { name: "revokedAt",        type: { option: "i64" }     },
          { name: "revocationReason", type: "string"              },
        ],
      },
    },
  ],
  types: [
    {
      name: "CertificateParams",
      type: {
        kind: "struct",
        fields: [
          { name: "assetId",         type: "publicKey"           },
          { name: "provenanceRoot",  type: { array: ["u8", 32] } },
          { name: "custodyRef",      type: { array: ["u8", 32] } },
          { name: "collateralScore", type: "u8"                  },
          { name: "fraudRisk",       type: "u8"                  },
          { name: "validUntil",      type: { option: "i64" }     },
        ],
      },
    },
  ],
  errors: [{ code: 6000, name: "Unauthorized", msg: "Unauthorized" }],
};

// Server-side only. Never imported statically — zero browser bundle impact.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProgram(provider?: any): Promise<any> {
  const anchor           = await import("@coral-xyz/anchor");
  const { Connection }   = await import("@solana/web3.js");

  // Anchor v0.30: Program(idl, provider) — programId comes from idl.address
  if (provider) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (anchor.Program as any)(IDL, provider);
  }

  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com"
  );

  const { PublicKey } = await import("@solana/web3.js");

  const readOnly = new anchor.AnchorProvider(
    connection,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {
      publicKey:           new PublicKey("11111111111111111111111111111111"),
      signTransaction:     async (tx: unknown) => tx,
      signAllTransactions: async (txs: unknown) => txs,
    } as Parameters<typeof anchor.AnchorProvider>[1],
    { commitment: "confirmed" }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (anchor.Program as any)(IDL, readOnly);
}