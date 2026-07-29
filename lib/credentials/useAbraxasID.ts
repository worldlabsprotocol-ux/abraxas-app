// FILE: lib/credentials/useAbraxasID.ts
// React hook — credential state keyed by Sui address (syncs from server + local cache).

"use client";

import { useState, useEffect, useCallback } from "react";
import type { VerificationResult, IssueCredentialInput } from "./types";
import { resolveHolderAddress } from "./types";
import {
  loadStoredCredential,
  saveStoredCredential,
  type StoredCredential,
} from "./storage";

interface UseAbraxasIDReturn {
  credential:        StoredCredential | null;
  status:            "idle" | "checking" | "verified" | "unverified" | "expired";
  issue:             (input: IssueCredentialInput) => Promise<boolean>;
  verify:            () => Promise<VerificationResult | null>;
  revoke:            () => void;
  refreshFromServer: () => Promise<void>;
  isLoading:         boolean;
  error:             string | null;
}

export function useAbraxasID(suiAddress?: string | null): UseAbraxasIDReturn {
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [status,     setStatus]     = useState<UseAbraxasIDReturn["status"]>("idle");
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const refreshFromServer = useCallback(async () => {
    if (!suiAddress) {
      setStatus("unverified");
      setCredential(null);
      return;
    }
    setStatus("checking");
    try {
      const res = await fetch(`/api/credentials/me?sui=${encodeURIComponent(suiAddress)}`, {
        credentials: "include",
      });
      const data = await res.json() as {
        verified?: boolean;
        credential_jwt?: string;
        credential_jti?: string;
        expires_at?: string;
        jurisdiction?: string;
        verification_level?: string;
        document_type?: string;
      };
      if (data.verified && data.credential_jwt && data.credential_jti && data.expires_at) {
        const stored: StoredCredential = {
          jwt: data.credential_jwt,
          jti: data.credential_jti,
          expires_at: data.expires_at,
          jurisdiction: data.jurisdiction ?? "",
          level: data.verification_level ?? "standard",
          sui_address: suiAddress,
          document_type: data.document_type,
        };
        saveStoredCredential(stored);
        setCredential(stored);
        setStatus("verified");
        return;
      }
      const cached = loadStoredCredential(suiAddress);
      if (cached) {
        setCredential(cached);
        setStatus("verified");
      } else {
        setCredential(null);
        setStatus("unverified");
      }
    } catch {
      const cached = loadStoredCredential(suiAddress);
      if (cached) {
        setCredential(cached);
        setStatus("verified");
      } else {
        setStatus("unverified");
      }
    }
  }, [suiAddress]);

  useEffect(() => {
    if (!suiAddress) {
      setStatus("unverified");
      setCredential(null);
      return;
    }
    const cached = loadStoredCredential(suiAddress);
    if (cached) {
      setCredential(cached);
      setStatus("verified");
    }
    refreshFromServer();
  }, [suiAddress, refreshFromServer]);

  const issue = useCallback(async (input: IssueCredentialInput): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const holder = resolveHolderAddress(input);
    if (!holder) {
      setError("sui_address required");
      setIsLoading(false);
      return false;
    }
    try {
      const res  = await fetch("/api/credentials/issue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...input, sui_address: holder }),
      });
      const data = await res.json() as {
        credential_jwt?: string; credential_jti?: string;
        expires_at?: string; jurisdiction?: string; level?: string; error?: string;
      };
      if (!res.ok || data.error) throw new Error(data.error ?? "Issuance failed");

      const stored: StoredCredential = {
        jwt:          data.credential_jwt!,
        jti:          data.credential_jti!,
        expires_at:   data.expires_at!,
        jurisdiction: data.jurisdiction!,
        level:        data.level!,
        sui_address:  holder,
      };
      saveStoredCredential(stored);
      setCredential(stored);
      setStatus("verified");
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to issue credential");
      return false;
    } finally { setIsLoading(false); }
  }, []);

  const verify = useCallback(async (): Promise<VerificationResult | null> => {
    if (!credential) return null;
    setIsLoading(true);
    try {
      const res  = await fetch("/api/credentials/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          credential_jwt: credential.jwt,
          verifier_id:    "abraxas-self-check",
        }),
      });
      const result = await res.json() as VerificationResult;
      setStatus(result.verified ? "verified" : "unverified");
      return result;
    } catch {
      return null;
    } finally { setIsLoading(false); }
  }, [credential]);

  const revoke = useCallback(() => {
    if (suiAddress) {
      localStorage.removeItem(`abraxas_credential_v1_${suiAddress}`);
    }
    setCredential(null);
    setStatus("unverified");
  }, [suiAddress]);

  return { credential, status, issue, verify, revoke, refreshFromServer, isLoading, error };
}
