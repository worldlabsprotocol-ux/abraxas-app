"use client";
// FILE: lib/hooks/usePassportVerification.ts
// Polls identity status + syncs W3C credential from server after Veriff approve.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadStoredCredential,
  saveStoredCredential,
  type StoredCredential,
} from "@/lib/credentials/storage";

export type IdentityStampStatus = "not_started" | "pending" | "earned" | "declined";

export interface MeCredentialResponse {
  verified: boolean;
  status: string;
  credential_jti?: string;
  credential_jwt?: string;
  credential_hash?: string;
  jurisdiction?: string;
  document_type?: string;
  verification_level?: string;
  expires_at?: string;
  issued_at?: string;
  via?: string;
}

const POLL_MS = 5000;

export function usePassportVerification(
  suiAddress: string | null,
  email: string | null,
) {
  const [identityStatus, setIdentityStatus] = useState<IdentityStampStatus>("not_started");
  const [via, setVia] = useState<string | null>(null);
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncCredential = useCallback(async (addr: string): Promise<StoredCredential | null> => {
    const res = await fetch(`/api/credentials/me?sui=${encodeURIComponent(addr)}`);
    const data = await res.json() as MeCredentialResponse;
    if (!data.verified || !data.credential_jwt || !data.credential_jti || !data.expires_at) {
      return null;
    }
    const stored: StoredCredential = {
      jwt: data.credential_jwt,
      jti: data.credential_jti,
      expires_at: data.expires_at,
      jurisdiction: data.jurisdiction ?? "",
      level: data.verification_level ?? "standard",
      sui_address: addr,
      document_type: data.document_type,
    };
    saveStoredCredential(stored);
    setCredential(stored);
    return stored;
  }, []);

  const refresh = useCallback(async () => {
    if (!suiAddress && !email) {
      setIdentityStatus("not_started");
      setCredential(null);
      return;
    }

    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (suiAddress) params.set("sui_address", suiAddress);
      if (email) params.set("email", email);

      const res = await fetch(`/api/identity/status?${params}`);
      const data = await res.json() as { status?: string; via?: string };

      if (data.status === "approved") {
        setIdentityStatus("earned");
        setVia(data.via ?? null);
        if (suiAddress) await syncCredential(suiAddress);
      } else if (data.status === "pending") {
        setIdentityStatus("pending");
        setVia(data.via ?? null);
      } else if (data.status === "declined") {
        setIdentityStatus("declined");
      } else {
        setIdentityStatus("not_started");
        if (suiAddress) {
          const cached = loadStoredCredential(suiAddress);
          if (cached) {
            setCredential(cached);
            setIdentityStatus("earned");
          }
        }
      }
      setLastChecked(new Date());
    } catch {
      /* best-effort */
    } finally {
      setIsRefreshing(false);
    }
  }, [suiAddress, email, syncCredential]);

  useEffect(() => {
    if (suiAddress) {
      const cached = loadStoredCredential(suiAddress);
      if (cached) {
        setCredential(cached);
        setIdentityStatus("earned");
      }
    }
    refresh();
  }, [suiAddress, email, refresh]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (identityStatus === "pending" && (suiAddress || email)) {
      pollRef.current = setInterval(refresh, POLL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [identityStatus, suiAddress, email, refresh]);

  return {
    identityStatus,
    via,
    credential,
    isRefreshing,
    lastChecked,
    refresh,
    isPolling: identityStatus === "pending",
  };
}
