// FILE: lib/credentials/useAbraxasID.ts
// React hook — manages credential state, issues + verifies from the frontend.
// Other protocols use the /verify API directly — this hook is for the Abraxas app.
"use client";

import { useState, useEffect, useCallback } from "react";
import type { VerificationResult, IssueCredentialInput } from "./types";

const STORAGE_KEY = "abraxas_credential_v1";

interface StoredCredential {
  jwt:         string;
  jti:         string;
  expires_at:  string;
  jurisdiction: string;
  level:       string;
  wallet:      string;
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

export function useAbraxasID(walletAddress?: string): UseAbraxasIDReturn {
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [status,     setStatus]     = useState<UseAbraxasIDReturn["status"]>("idle");
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (!walletAddress) return;
    const stored = localStorage.getItem(`${STORAGE_KEY}_${walletAddress}`);
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
  }, [walletAddress]);

  // Issue a new credential
  const issue = useCallback(async (input: IssueCredentialInput): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/credentials/issue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(input),
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
        wallet:       input.wallet_address,
      };
      localStorage.setItem(`${STORAGE_KEY}_${input.wallet_address}`, JSON.stringify(stored));
      setCredential(stored);
      setStatus("verified");
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to issue credential");
      return false;
    } finally { setIsLoading(false); }
  }, []);

  // Verify the stored credential against Abraxas backend
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

  // Clear credential
  const revoke = useCallback(() => {
    if (walletAddress) localStorage.removeItem(`${STORAGE_KEY}_${walletAddress}`);
    setCredential(null);
    setStatus("unverified");
  }, [walletAddress]);

  return { credential, status, issue, verify, revoke, isLoading, error };
}
