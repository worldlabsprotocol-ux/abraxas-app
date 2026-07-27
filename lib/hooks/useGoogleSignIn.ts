// FILE: lib/hooks/useGoogleSignIn.ts
// Shared Google sign-in handler — keeps button disabled through OAuth redirect.

import { useCallback, useRef, useState } from "react";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";

export function useGoogleSignIn() {
  const auth = useSuiAuthOptional();
  const [busy, setBusy] = useState(false);
  const inFlightRef = useRef(false);

  const signIn = useCallback(async (): Promise<boolean> => {
    const signInFn = auth?.signInWithGoogle;
    if (!signInFn || inFlightRef.current) return false;

    inFlightRef.current = true;
    setBusy(true);
    try {
      const redirected = await signInFn();
      if (!redirected) {
        inFlightRef.current = false;
        setBusy(false);
      }
      return redirected;
    } catch {
      inFlightRef.current = false;
      setBusy(false);
      return false;
    }
  }, [auth?.signInWithGoogle]);

  return {
    signIn,
    busy,
    error: auth?.error ?? null,
    configured: auth?.isConfigured ?? false,
    disabled: busy || !auth?.isConfigured,
  };
}
