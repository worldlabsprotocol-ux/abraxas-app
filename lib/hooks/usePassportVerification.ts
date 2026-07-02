"use client";
// FILE: lib/hooks/usePassportVerification.ts
// Polls identity status + syncs W3C credential + auto-verifies + auto-provisions on-chain.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadStoredCredential,
  saveStoredCredential,
  type StoredCredential,
} from "@/lib/credentials/storage";
import type { VerificationResult } from "@/lib/credentials/types";

export type IdentityStampStatus = "not_started" | "pending" | "earned" | "declined";
export type CredentialVerifyState = "idle" | "checking" | "valid" | "invalid";

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

export interface OnChainPassportStatus {
  provisioned: boolean;
  object_id: string | null;
  stamp_bitmask: number;
  stamp_ids: string[];
  stamps_complete: boolean;
  issuer_configured: boolean;
  eligible_for_provision?: boolean;
  needs_provision?: boolean;
  explorer_object: string | null;
  create_tx_digest: string | null;
  stamps_tx_digest: string | null;
}

const POLL_MS = 5000;

export function usePassportVerification(
  suiAddress: string | null,
  email: string | null,
) {
  const [identityStatus, setIdentityStatus] = useState<IdentityStampStatus>("not_started");
  const [via, setVia] = useState<string | null>(null);
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [verifyState, setVerifyState] = useState<CredentialVerifyState>("idle");
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [onChain, setOnChain] = useState<OnChainPassportStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifiedJtiRef = useRef<string | null>(null);
  const provisioningRef = useRef(false);

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

  const autoVerify = useCallback(async (addr: string, jti?: string) => {
    if (jti && verifiedJtiRef.current === jti && verifyState === "valid") return;
    setVerifyState("checking");
    try {
      const res = await fetch(`/api/credentials/verify-self?sui=${encodeURIComponent(addr)}`);
      const data = await res.json() as VerificationResult;
      if (data.verified) {
        verifiedJtiRef.current = data.credential_jti ?? jti ?? null;
        setVerifyResult(data);
        setVerifyState("valid");
      } else {
        setVerifyResult(data);
        setVerifyState("invalid");
      }
    } catch {
      setVerifyState("invalid");
    }
  }, [verifyState]);

  const fetchOnChainStatus = useCallback(async (addr: string): Promise<OnChainPassportStatus | null> => {
    const res = await fetch(`/api/sui/passport/provision?sui=${encodeURIComponent(addr)}`);
    if (!res.ok) return null;
    return res.json() as Promise<OnChainPassportStatus>;
  }, []);

  const autoProvision = useCallback(async (addr: string, status: OnChainPassportStatus) => {
    if (!status.needs_provision || provisioningRef.current) return status;
    provisioningRef.current = true;
    setIsProvisioning(true);
    setProvisionError(null);
    try {
      const res = await fetch("/api/sui/passport/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: addr }),
      });
      const data = await res.json() as OnChainPassportStatus & { error?: string };
      if (!res.ok) {
        setProvisionError(data.error ?? "On-chain provision failed");
        return status;
      }
      setOnChain(data);
      return data;
    } catch {
      setProvisionError("On-chain provision failed");
      return status;
    } finally {
      provisioningRef.current = false;
      setIsProvisioning(false);
    }
  }, []);

  const syncOnChain = useCallback(async (addr: string) => {
    try {
      let status = await fetchOnChainStatus(addr);
      if (!status) return;
      if (status.needs_provision) {
        status = await autoProvision(addr, status) ?? status;
      }
      setOnChain(status);
    } catch {
      /* best-effort */
    }
  }, [fetchOnChainStatus, autoProvision]);

  const syncVeriffDecision = useCallback(async (addr: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/idv/sync-decision?sui=${encodeURIComponent(addr)}`);
      const data = await res.json() as {
        status?: string;
        synced?: boolean;
        message?: string;
      };
      setSyncMessage(data.message ?? null);
      return data.status === "approved" || data.synced === true;
    } catch {
      setSyncMessage("Could not reach Veriff sync endpoint");
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!suiAddress && !email) {
      setIdentityStatus("not_started");
      setCredential(null);
      setVerifyState("idle");
      setVerifyResult(null);
      setOnChain(null);
      setProvisionError(null);
      return;
    }

    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (suiAddress) params.set("sui_address", suiAddress);
      if (email) params.set("email", email);

      const res = await fetch(`/api/identity/status?${params}`);
      let data = await res.json() as { status?: string; via?: string };

      if (data.status === "pending" && suiAddress) {
        await syncVeriffDecision(suiAddress);
        const res2 = await fetch(`/api/identity/status?${params}`);
        data = await res2.json() as { status?: string; via?: string };
      }

      if (data.status === "approved") {
        setIdentityStatus("earned");
        setVia(data.via ?? null);
        if (suiAddress) {
          const stored = await syncCredential(suiAddress);
          await autoVerify(suiAddress, stored?.jti);
          await syncOnChain(suiAddress);
        }
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
            await autoVerify(suiAddress, cached.jti);
            await syncOnChain(suiAddress);
          }
        }
      }
      setLastChecked(new Date());
    } catch {
      /* best-effort */
    } finally {
      setIsRefreshing(false);
    }
  }, [suiAddress, email, syncCredential, autoVerify, syncOnChain, syncVeriffDecision]);

  useEffect(() => {
    if (suiAddress) {
      const cached = loadStoredCredential(suiAddress);
      if (cached) {
        setCredential(cached);
        setIdentityStatus("earned");
        autoVerify(suiAddress, cached.jti);
        syncOnChain(suiAddress);
      }
    }
    refresh();
  }, [suiAddress, email, refresh, autoVerify, syncOnChain]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const shouldPoll =
      (identityStatus === "pending" || (identityStatus === "earned" && onChain?.needs_provision)) &&
      (suiAddress || email);
    if (shouldPoll) {
      pollRef.current = setInterval(refresh, POLL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [identityStatus, suiAddress, email, onChain?.needs_provision, refresh]);

  const retryProvision = useCallback(async () => {
    if (!suiAddress) return;
    const status = await fetchOnChainStatus(suiAddress);
    if (status) await autoProvision(suiAddress, { ...status, needs_provision: true });
    await syncOnChain(suiAddress);
  }, [suiAddress, fetchOnChainStatus, autoProvision, syncOnChain]);

  return {
    identityStatus,
    via,
    credential,
    verifyState,
    verifyResult,
    onChain,
    isRefreshing,
    isProvisioning,
    provisionError,
    syncMessage,
    lastChecked,
    refresh,
    retryProvision,
    isPolling: identityStatus === "pending" || Boolean(onChain?.needs_provision),
  };
}
