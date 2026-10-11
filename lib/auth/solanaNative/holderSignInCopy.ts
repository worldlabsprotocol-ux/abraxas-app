import { isSolanaNativeProductEnabledClient } from "@/lib/auth/solanaNative/clientFeatureFlag";

export const HOLDER_CONTINUE_SOLANA =
  "Connect your Phantom wallet to continue with Abraxas.";
export const HOLDER_CONTINUE_LEGACY =
  "Sign in to continue with Abraxas.";

/** Server-safe disclosure for holder briefs (not Google zkLogin). */
export const HOLDER_WALLET_SIGNIN_ONLY =
  "Wallet sign-in opens your Passport session only. It is not identity verification or age proof.";

export function holderContinueSignInMessage(solanaNative?: boolean): string {
  const native = solanaNative ?? isSolanaNativeProductEnabledClient();
  return native ? HOLDER_CONTINUE_SOLANA : HOLDER_CONTINUE_LEGACY;
}
