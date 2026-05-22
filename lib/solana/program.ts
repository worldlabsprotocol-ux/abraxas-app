"use client";
// FILE: lib/solana/program.ts
export const PROGRAM_ID_STRING =
  process.env.NEXT_PUBLIC_VERIFICATION_PROGRAM_ID ??
  "ABRAXASverify1111111111111111111111111111111";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IDL: any = {
  address: "ABRAXASverify1111111111111111111111111111111",
  version: "0.1.0",
  name: "abraxas_verification",
  instructions: [],
  accounts: [],
  types: [],
  errors: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProgram(provider?: any): Promise<any> {
  const anchor = await import("@coral-xyz/anchor");
  const { Connection, PublicKey } = await import("@solana/web3.js");

  const p = provider ?? new anchor.AnchorProvider(
    new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { publicKey: new PublicKey("11111111111111111111111111111111"), signTransaction: async (t: any) => t, signAllTransactions: async (t: any) => t } as any,
    {}
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (anchor.Program as any)(IDL, p);
}
