// FILE: lib/credentials/useAbraxasID.ts
// React hook — credential state keyed by Sui address (zkLogin holder).

"use client";

import { useState, useEffect, useCallback } from "react";
import type { VerificationResult, IssueCredentialInput } from "./types";
import { resolveHolderAddress } from "./types";

const STORAGE_KEY = "abraxas_credential_v1";

interface StoredCredential {
  jwt:         string;
  jti:         string;
  expires_at:  string;
  jurisdiction: string;
  level:       string;
  sui_address: string;
}

interface UseAbraxasIDReturn {
  credential:        StoredCredential | null;
  status:            "idle" | "checking" | "verified" | "unverified" | "expired";
  issue:             (input: IssueCredentialInput) => Promise<boolean>;
  verify:            () => Promise<VerificationResult | null>;
  revoke:            () => void;
  isLoading:         boolean;
  error:             string | null;
}

export function useAbraxasID(suiAddress?: string | null): UseAbraxasIDReturn {
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [status,     setStatus]     = useState<UseAbraxasIDReturn["status"]>("idle");
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!suiAddress) {
      setStatus("unverified");
      setCredential(null);
      return;
    }
    const stored = localStorage.getItem(`${STORAGE_KEY}_${suiAddress}`);
    if (!stored) { setStatus("unverified"); return; }
    try {
      const cred: StoredCredential = JSON.parse(stored);
      if (new Date(cred.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }
      setCredential(cred);
      setStatus("verified");
    } catch {
      setStatus("unverified");
    }
  }, [suiAddress]);

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
      localStorage.setItem(`${STORAGE_KEY}_${holder}`, JSON.stringify(stored));
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
    if (suiAddress) localStorage.removeItem(`${STORAGE_KEY}_${suiAddress}`);
    setCredential(null);
    setStatus("unverified");
  }, [suiAddress]);

  return { credential, status, issue, verify, revoke, isLoading, error };
}
