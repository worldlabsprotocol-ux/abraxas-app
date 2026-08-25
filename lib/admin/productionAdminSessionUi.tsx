// FILE: lib/admin/productionAdminSessionUi.tsx
// Client helpers for Production-only browser-session admin UX (no PIN on canonical Production).

"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  isProductionAppOrigin,
  resolveConfiguredAppOrigin,
} from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";
import { adminFetch } from "@/lib/admin/adminFetch";

export const ADMIN_PIN_STORAGE_KEY = "abraxas_admin_pin";
export const PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE = "Sign in with an authorized Google account.";
export const PRODUCTION_ADMIN_AUTHORIZED_LABEL = "Signed in · authorized";

export function resolveRuntimeBrowserOrigin(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.location.origin;
}

export function shouldUseProductionBrowserSessionAdminUi(
  env: Record<string, string | undefined> = process.env,
  runtimeOrigin?: string | null,
): boolean {
  if (runtimeOrigin) {
    return isProductionAppOrigin(runtimeOrigin);
  }

  const configured = resolveConfiguredAppOrigin(env);
  if (!configured) return false;
  return isProductionAppOrigin(configured);
}

export async function fetchProductionAdminAccessState(): Promise<{
  authorized: boolean;
  method: string | null;
}> {
  try {
    const res = await fetch("/api/admin/access", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json() as { authorized?: boolean; method?: string | null };
    return {
      authorized: data.authorized === true,
      method: data.method ?? null,
    };
  } catch {
    return {
      authorized: false,
      method: null,
    };
  }
}

export interface ProductionAdminSessionGate {
  usePinUnlock: boolean;
  loading: boolean;
  authorized: boolean;
  pin: string;
  setPin: (value: string) => void;
  unlockWithPin: () => void;
  unauthorizedMessage: string;
  authorizedLabel: string;
  adminRequest: ProductionAdminRequest;
}

export type ProductionAdminRequest = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function useProductionBrowserSessionAdminUiMode(): {
  resolved: boolean;
  useBrowserSession: boolean;
  usePinUnlock: boolean;
} {
  const [resolved, setResolved] = useState(false);
  const [useBrowserSession, setUseBrowserSession] = useState(false);

  useEffect(() => {
    const runtimeOrigin = resolveRuntimeBrowserOrigin();
    const browserSession = shouldUseProductionBrowserSessionAdminUi(process.env, runtimeOrigin);
    setUseBrowserSession(browserSession);
    setResolved(true);
  }, []);

  return {
    resolved,
    useBrowserSession,
    usePinUnlock: resolved ? !useBrowserSession : true,
  };
}

export function useProductionAdminSessionGate(): ProductionAdminSessionGate {
  const [modeResolved, setModeResolved] = useState(false);
  const [usePinUnlock, setUsePinUnlock] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sessionAuthorized, setSessionAuthorized] = useState(false);
  const [pin, setPin] = useState("");
  const [pinAuthed, setPinAuthed] = useState(false);

  useEffect(() => {
    const runtimeOrigin = resolveRuntimeBrowserOrigin();
    const browserSession = shouldUseProductionBrowserSessionAdminUi(process.env, runtimeOrigin);
    setUsePinUnlock(!browserSession);
    setModeResolved(true);
  }, []);

  useEffect(() => {
    if (!modeResolved) {
      return;
    }

    let cancelled = false;

    if (usePinUnlock) {
      try {
        const saved = sessionStorage.getItem(ADMIN_PIN_STORAGE_KEY);
        if (saved) {
          setPin(saved);
          setPinAuthed(true);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setLoading(false);
      }
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void (async () => {
      try {
        const access = await fetchProductionAdminAccessState();
        if (!cancelled) {
          setSessionAuthorized(access.authorized);
        }
      } catch {
        if (!cancelled) {
          setSessionAuthorized(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [modeResolved, usePinUnlock]);

  const unlockWithPin = useCallback(() => {
    sessionStorage.setItem(ADMIN_PIN_STORAGE_KEY, pin);
    setPinAuthed(true);
  }, [pin]);

  const adminRequest = useCallback<ProductionAdminRequest>(async (input, init) => {
    if (usePinUnlock) {
      const headers = new Headers(init?.headers);
      if (pin) {
        headers.set("x-admin-pin", pin);
      }
      return fetch(input, {
        ...init,
        credentials: "include",
        headers,
      });
    }
    return adminFetch(input, init);
  }, [pin, usePinUnlock]);

  return {
    usePinUnlock,
    loading,
    authorized: usePinUnlock ? pinAuthed && Boolean(pin) : sessionAuthorized,
    pin,
    setPin,
    unlockWithPin,
    unauthorizedMessage: PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
    authorizedLabel: PRODUCTION_ADMIN_AUTHORIZED_LABEL,
    adminRequest,
  };
}

export function ProductionAdminSessionStatus({
  gate,
  style,
}: {
  gate: Pick<ProductionAdminSessionGate, "usePinUnlock" | "loading" | "authorized" | "authorizedLabel" | "unauthorizedMessage">;
  style?: CSSProperties;
}) {
  if (gate.usePinUnlock) return null;

  if (gate.loading) {
    return (
      <p style={style}>
        Checking admin session…
      </p>
    );
  }

  if (gate.authorized) {
    return (
      <p style={style}>
        {gate.authorizedLabel}
      </p>
    );
  }

  return (
    <p role="alert" style={style}>
      {gate.unauthorizedMessage}
    </p>
  );
}
