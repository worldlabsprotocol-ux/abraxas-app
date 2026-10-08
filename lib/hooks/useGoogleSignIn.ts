// FILE: lib/hooks/useGoogleSignIn.ts
// Shared Google sign-in handler — keeps button disabled through OAuth redirect.

import { useCallback, useEffect, useRef, useState } from "react";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { clearStaleLoginInFlight } from "@/lib/sui/zklogin/startLogin";
import { NATIVE_HANDOFF_SETTLED_EVENT } from "@/lib/sui/zklogin/nativeHandoffClient";
import { isNativeHolderApp } from "@/lib/sui/zklogin/holderPlatform";

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

  useEffect(() => {
    const resetBusy = () => {
      inFlightRef.current = false;
      setBusy(false);
      setLegacyBusy(false);
    };

    const onHandoffSettled = () => resetBusy();
    window.addEventListener(NATIVE_HANDOFF_SETTLED_EVENT, onHandoffSettled);

    const onVisibility = () => {
      if (!isNativeHolderApp() || document.visibilityState !== "visible") return;
      if (auth?.isAuthenticated) resetBusy();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener(NATIVE_HANDOFF_SETTLED_EVENT, onHandoffSettled);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [auth?.isAuthenticated]);

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
