// FILE: lib/solana/pda.ts
// PDA derivation for Verification Certificate accounts.
// Import getCertificatePDA wherever you need the on-chain address.
import { PublicKey } from "@solana/web3.js";

export const VERIFICATION_PROGRAM_ID = new PublicKey(
  "ABRAXASverify1111111111111111111111111111111"
);

/** Derive the certificate PDA for a given asset PublicKey. */
export function getCertificatePDA(assetId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("certificate"), assetId.toBuffer()],
    VERIFICATION_PROGRAM_ID
  );
}