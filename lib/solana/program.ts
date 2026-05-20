// FILE: lib/solana/program.ts
// Anchor program client for Abraxas Verification Certificate.
// Uses minimal inline IDL — swap for generated IDL after anchor build.
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey }         from "@solana/web3.js";
import type { Wallet }                   from "@coral-xyz/anchor/dist/cjs/provider";

export const PROGRAM_ID = new PublicKey(
  "ABRAXASverify1111111111111111111111111111111"
);

export const IDL: Idl = {
  version:  "0.1.0",
  name:     "abraxas_verification",
  instructions: [
    {
      name: "mintCertificate",
      accounts: [
        { name:"certificate",   isMut:true,  isSigner:false },
        { name:"payer",         isMut:true,  isSigner:true  },
        { name:"verifier",      isMut:false, isSigner:true  },
        { name:"systemProgram", isMut:false, isSigner:false },
      ],
      args: [{ name:"params", type:{ defined:"CertificateParams" } }],
    },
    {
      name: "revokeCertificate",
      accounts: [
        { name:"certificate", isMut:true,  isSigner:false },
        { name:"verifier",    isMut:false, isSigner:true  },
      ],
      args: [{ name:"reason", type:"string" }],
    },
    {
      name: "updateRiskScore",
      accounts: [
        { name:"certificate", isMut:true,  isSigner:false },
        { name:"verifier",    isMut:false, isSigner:true  },
      ],
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
          { name:"assetId",          type:"publicKey"        },
          { name:"verifier",         type:"publicKey"        },
          { name:"provenanceRoot",   type:{ array:["u8",32] }},
          { name:"custodyRef",       type:{ array:["u8",32] }},
          { name:"collateralScore",  type:"u8"               },
          { name:"fraudRisk",        type:"u8"               },
          { name:"issuedAt",         type:"i64"              },
          { name:"validUntil",       type:"i64"              },
          { name:"revoked",          type:"bool"             },
          { name:"revokedAt",        type:{ option:"i64" }   },
          { name:"revocationReason", type:"string"           },
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
          { name:"assetId",         type:"publicKey"        },
          { name:"provenanceRoot",  type:{ array:["u8",32] }},
          { name:"custodyRef",      type:{ array:["u8",32] }},
          { name:"collateralScore", type:"u8"               },
          { name:"fraudRisk",       type:"u8"               },
          { name:"validUntil",      type:{ option:"i64" }   },
        ],
      },
    },
  ],
  events: [
    { name:"CertificateMinted",
      fields:[
        {name:"certificateId",  type:"publicKey", index:false},
        {name:"assetId",        type:"publicKey", index:false},
        {name:"verifier",       type:"publicKey", index:false},
        {name:"collateralScore",type:"u8",        index:false},
      ]
    },
    { name:"CertificateRevoked",
      fields:[
        {name:"certificateId", type:"publicKey", index:false},
        {name:"reason",        type:"string",    index:false},
      ]
    },
  ],
  errors: [{ code:6000, name:"Unauthorized", msg:"Unauthorized" }],
};

export function getProgram(provider?: AnchorProvider): Program {
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com"
  );
  const p = provider ?? new AnchorProvider(connection, {} as Wallet, {});
  return new Program(IDL, PROGRAM_ID, p);
}