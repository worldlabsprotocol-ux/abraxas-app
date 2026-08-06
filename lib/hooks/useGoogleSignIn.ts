// FILE: lib/hooks/useGoogleSignIn.ts
// Shared Google sign-in handler — keeps button disabled through OAuth redirect.

import { useCallback, useRef, useState } from "react";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { clearStaleLoginInFlight } from "@/lib/sui/zklogin/startLogin";

export function useGoogleSignIn() {
  const auth = useSuiAuthOptional();
  const [busy, setBusy] = useState(false);
  const [legacyBusy, setLegacyBusy] = useState(false);
  const inFlightRef = useRef(false);

  const runSignIn = useCallback(async (
    signInFn: (() => Promise<boolean>) | undefined,
    setBusyState: (v: boolean) => void,
  ): Promise<boolean> => {
    if (!signInFn) return false;
    if (inFlightRef.current) return false;

    clearStaleLoginInFlight();
    inFlightRef.current = true;
    setBusyState(true);
    try {
      const redirected = await signInFn();
      if (!redirected) {
        inFlightRef.current = false;
        setBusyState(false);
      }
      return redirected;
    } catch {
      inFlightRef.current = false;
      setBusyState(false);
      return false;
    }
  }, []);

  const signIn = useCallback(
    () => runSignIn(auth?.signInWithGoogle, setBusy),
    [auth?.signInWithGoogle, runSignIn],
  );

  const signInExistingAccount = useCallback(
    () => runSignIn(auth?.signInWithExistingAccount, setLegacyBusy),
    [auth?.signInWithExistingAccount, runSignIn],
  );

  return {
    signIn,
    signInExistingAccount,
    busy,
    legacyBusy,
    error: auth?.error ?? null,
    configured: auth?.isConfigured ?? false,
    legacyRecoveryConfigured: auth?.isLegacyRecoveryConfigured ?? false,
    disabled: busy || legacyBusy || !auth?.isConfigured,
    legacyDisabled: legacyBusy || busy || !auth?.isLegacyRecoveryConfigured,
  };
}
