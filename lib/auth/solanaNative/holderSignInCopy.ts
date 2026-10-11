import { isSolanaNativeProductEnabledClient } from "@/lib/auth/solanaNative/clientFeatureFlag";

export const HOLDER_CONTINUE_SOLANA =
  "Connect your Phantom wallet to continue with Abraxas.";
export const HOLDER_CONTINUE_LEGACY =
  "Sign in to continue with Abraxas.";

export function holderContinueSignInMessage(solanaNative?: boolean): string {
  const native = solanaNative ?? isSolanaNativeProductEnabledClient();
  return native ? HOLDER_CONTINUE_SOLANA : HOLDER_CONTINUE_LEGACY;
}
