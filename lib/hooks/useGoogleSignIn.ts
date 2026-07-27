// FILE: lib/hooks/useGoogleSignIn.ts
// Shared Google sign-in handler — keeps button disabled through OAuth redirect.

import { useCallback, useState } from "react";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";

export function useGoogleSignIn() {
  const auth = useSuiAuthOptional();
  const [busy, setBusy] = useState(false);

  const signIn = useCallback(async (): Promise<boolean> => {
    if (busy || !auth?.signInWithGoogle) return false;
    setBusy(true);
    const redirected = await auth.signInWithGoogle();
    if (!redirected) setBusy(false);
    return redirected;
  }, [auth, busy]);

  return {
    signIn,
    busy,
    configured: auth?.isConfigured ?? false,
    disabled: busy || !auth?.isConfigured,
  };
}
