// FILE: lib/solana/program.ts
// Anchor program client — IDL uses v0.30+ field names (writable/signer).
// Lazy-loaded only on the server — never bundled for the browser.
import type { Idl, AnchorProvider } from "@coral-xyz/anchor";

export const PROGRAM_ID_STRING = 
  process.env.NEXT_PUBLIC_VERIFICATION_PROGRAM_ID ??
  "ABRAXASverify1111111111111111111111111111111";

// IDL uses Anchor v0.30+ format: writable/signer instead of isMut/isSigner
export const IDL: Idl = {
  version: "0.1.0",
  name:    "abraxas_verification",
  instructions: [
    {
      name: "mintCertificate",
      accounts: [
        { name:"certificate",   writable:true  },
        { name:"payer",         writable:true,  signer:true },
        { name:"verifier",      signer:true },
        { name:"systemProgram" },
      ] as Idl["instructions"][0]["accounts"],
      args: [{ name:"params", type:{ defined:"CertificateParams" } }],
    },
    {
      name: "revokeCertificate",
      accounts: [
        { name:"certificate", writable:true },
        { name:"verifier",    signer:true },
      ] as Idl["instructions"][0]["accounts"],
      args: [{ name:"reason", type:"string" }],
    },
    {
      name: "updateRiskScore",
      accounts: [
        { name:"certificate", writable:true },
        { name:"verifier",    signer:true },
      ] as Idl["instructions"][0]["accounts"],
      args: [
        { name:"newCollateralScore", type:"u8" },
        { name:"newFraudRisk",       type:"u8" },
      ],
    },
  ],
  accounts: [
    {
      name: "VerificationCertificate",
      type: {
        kind: "struct",
        fields: [
          { name:"assetId",          type:"publicKey" },
          { name:"verifier",         type:"publicKey" },
          { name:"provenanceRoot",   type:{ array:["u8",32] } },
          { name:"custodyRef",       type:{ array:["u8",32] } },
          { name:"collateralScore",  type:"u8" },
          { name:"fraudRisk",        type:"u8" },
          { name:"issuedAt",         type:"i64" },
          { name:"validUntil",       type:"i64" },
          { name:"revoked",          type:"bool" },
          { name:"revokedAt",        type:{ option:"i64" } },
          { name:"revocationReason", type:"string" },
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
          { name:"assetId",         type:"publicKey" },
          { name:"provenanceRoot",  type:{ array:["u8",32] } },
          { name:"custodyRef",      type:{ array:["u8",32] } },
          { name:"collateralScore", type:"u8" },
          { name:"fraudRisk",       type:"u8" },
          { name:"validUntil",      type:{ option:"i64" } },
        ],
      },
    },
  ],
  events: [
    {
      name: "CertificateMinted",
      fields: [
        { name:"certificateId",   type:"publicKey", index:false },
        { name:"assetId",         type:"publicKey", index:false },
        { name:"verifier",        type:"publicKey", index:false },
        { name:"collateralScore", type:"u8",        index:false },
      ],
    },
    {
      name: "CertificateRevoked",
      fields: [
        { name:"certificateId", type:"publicKey", index:false },
        { name:"reason",        type:"string",    index:false },
      ],
    },
  ],
  errors: [{ code:6000, name:"Unauthorized", msg:"Unauthorized" }],
};

// Server-side only — lazy load to avoid browser bundle issues
export async function getProgram(provider?: AnchorProvider) {
  const { Program, AnchorProvider: AP, web3 } =
    await import("@coral-xyz/anchor");
  const { Connection, PublicKey } = web3;

  const programId = new PublicKey(PROGRAM_ID_STRING);

  if (provider) {
    return new Program(IDL, programId, provider);
  }

  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com"
  );
  const defaultProvider = new AP(connection, {} as never, {});
  return new Program(IDL, programId, defaultProvider);
}