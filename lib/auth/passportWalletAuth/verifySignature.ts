// FILE: lib/auth/passportWalletAuth/verifySignature.ts

import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { encodePassportWalletMessage } from "./message";

export async function verifyPassportWalletPersonalMessage(input: {
  message: string;
  signature: string;
  walletAddress: string;
}): Promise<boolean> {
  const address = normalizeSuiAddress(input.walletAddress);
  const bytes = encodePassportWalletMessage(input.message);
  try {
    const publicKey = await verifyPersonalMessageSignature(bytes, input.signature.trim(), { address });
    return normalizeSuiAddress(publicKey.toSuiAddress()) === address;
  } catch {
    return false;
  }
}
