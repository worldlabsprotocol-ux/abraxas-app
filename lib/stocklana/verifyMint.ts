// FILE: lib/stocklana/verifyMint.ts
// On-chain Solana mint verification for Stocklana catalog assets.

import { Connection, PublicKey } from "@solana/web3.js";
import { getStocklanaAsset } from "@/lib/stocklana/catalog";

const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export interface MintVerificationResult {
  ok: boolean;
  mint: string;
  ownerProgram: string | null;
  dataLength: number | null;
  matchesCatalog: boolean;
  detail: string;
}

export async function verifyStocklanaMintOnChain(input: {
  mint: string;
  assetId?: string;
  rpcUrl?: string;
}): Promise<MintVerificationResult> {
  const catalogAsset = input.assetId ? getStocklanaAsset(input.assetId) : null;
  const expectedMint = catalogAsset?.mint ?? input.mint;

  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(input.mint);
  } catch {
    return {
      ok: false,
      mint: input.mint,
      ownerProgram: null,
      dataLength: null,
      matchesCatalog: false,
      detail: "invalid_mint_address",
    };
  }

  if (catalogAsset && catalogAsset.mint !== input.mint) {
    return {
      ok: false,
      mint: input.mint,
      ownerProgram: null,
      dataLength: null,
      matchesCatalog: false,
      detail: "mint_catalog_mismatch",
    };
  }

  const connection = new Connection(
    input.rpcUrl ?? process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com",
    "confirmed",
  );

  const account = await connection.getAccountInfo(pubkey);
  if (!account) {
    return {
      ok: false,
      mint: input.mint,
      ownerProgram: null,
      dataLength: null,
      matchesCatalog: input.mint === expectedMint,
      detail: "mint_account_missing",
    };
  }

  const ownerProgram = account.owner.toBase58();
  const token2022Ok = ownerProgram === TOKEN_2022_PROGRAM_ID;

  return {
    ok: token2022Ok && input.mint === expectedMint,
    mint: input.mint,
    ownerProgram,
    dataLength: account.data.length,
    matchesCatalog: input.mint === expectedMint,
    detail: token2022Ok ? "token_2022_mint_verified" : "unexpected_owner_program",
  };
}
