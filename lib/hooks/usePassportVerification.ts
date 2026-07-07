"use client";
// FILE: lib/hooks/usePassportVerification.ts
// Polls identity status + syncs W3C credential + auto-verifies + auto-provisions on-chain.
// Server state via React Query; local credential cache preserved.

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadStoredCredential,
  saveStoredCredential,
  type StoredCredential,
} from "@/lib/credentials/storage";
import type { VerificationResult } from "@/lib/credentials/types";
import {
  fetchIdentityStatus,
  fetchOnChainPassportStatus,
  fetchCredentialMe,
  meResponseToStoredCredential,
  passportQueryKeys,
  provisionOnChainPassport,
  syncVeriffDecision,
  verifyCredentialSelf,
  type IdentityStatusResponse,
} from "@/lib/api/passport";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import { computePassportSetupState, resolveCredentialStatus, resolveIdentityVerificationStatus } from "@/lib/idv/identityVerificationStates";

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

interface PipelineResult {
  identityStatus: IdentityStampStatus;
  via: string | null;
  credential: StoredCredential | null;
  verifyState: CredentialVerifyState;
  verifyResult: VerificationResult | null;
  onChain: OnChainPassportStatus | null;
  syncMessage: string | null;
  setup: PassportSetupState | null;
  veriffConfigured: boolean;
  walletBindingL3: boolean;
}

async function runIdentityPipeline(
  suiAddress: string | null,
  email: string | null,
  verifiedJti: string | null,
): Promise<PipelineResult> {
  let syncMessage: string | null = null;
  let identityStatus: IdentityStampStatus = "not_started";
  let via: string | null = null;
  let credential: StoredCredential | null = null;
  let verifyState: CredentialVerifyState = "idle";
  let verifyResult: VerificationResult | null = null;
  let onChain: OnChainPassportStatus | null = null;
  let setup: PassportSetupState | null = null;
  let veriffConfigured = false;
  let walletBindingL3 = false;

  if (!suiAddress && !email) {
    return { identityStatus, via, credential, verifyState, verifyResult, onChain, syncMessage, setup, veriffConfigured, walletBindingL3 };
  }

  let data: IdentityStatusResponse = await fetchIdentityStatus(suiAddress, email);
  veriffConfigured = data.veriff_configured ?? false;
  walletBindingL3 = data.wallet_binding_l3 ?? false;
  setup = data.setup ?? null;

  if (data.status === "pending" && suiAddress) {
    const sync = await syncVeriffDecision(suiAddress);
    syncMessage = sync.message ?? null;
    data = await fetchIdentityStatus(suiAddress, email);
  }

  if (data.status === "approved" && suiAddress) {
    identityStatus = "earned";
    via = data.via ?? null;
    const me = await fetchCredentialMe(suiAddress);
    credential = meResponseToStoredCredential(suiAddress, me);
    if (credential) saveStoredCredential(credential);

    if (!verifiedJti || verifiedJti !== credential?.jti) {
      try {
        verifyState = "checking";
        const vr = await verifyCredentialSelf(suiAddress);
        verifyResult = vr;
        verifyState = vr.verified ? "valid" : "invalid";
      } catch {
        verifyState = "invalid";
      }
    }

    onChain = await fetchOnChainPassportStatus(suiAddress);
    if (onChain?.needs_provision) {
      try {
        const provisioned = await provisionOnChainPassport(suiAddress);
        if (provisioned.object_id) onChain = provisioned;
      } catch {
        /* best-effort */
      }
    }
  } else if (data.status === "pending") {
    identityStatus = "pending";
    via = data.via ?? null;
  } else if (data.status === "declined") {
    identityStatus = "declined";
  } else if (suiAddress) {
    const cached = loadStoredCredential(suiAddress);
    if (cached) {
      credential = cached;
      identityStatus = "earned";
      try {
        const vr = await verifyCredentialSelf(suiAddress);
        verifyResult = vr;
        verifyState = vr.verified ? "valid" : "invalid";
      } catch {
        verifyState = "invalid";
      }
      onChain = await fetchOnChainPassportStatus(suiAddress);
    }
  }

  return { identityStatus, via, credential, verifyState, verifyResult, onChain, syncMessage, setup, veriffConfigured, walletBindingL3 };
}

export function usePassportVerification(
  suiAddress: string | null,
  email: string | null,
) {
  const queryClient = useQueryClient();
  const verifiedJtiRef = useRef<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const provisioningRef = useRef(false);

  const pipelineQuery = useQuery({
    queryKey: passportQueryKeys.identity(suiAddress, email),
    queryFn: async () => {
      const result = await runIdentityPipeline(suiAddress, email, verifiedJtiRef.current);
      if (result.verifyResult?.verified && result.credential?.jti) {
        verifiedJtiRef.current = result.credential.jti;
      }
      if (suiAddress) {
        void queryClient.invalidateQueries({ queryKey: passportQueryKeys.trust(suiAddress) });
      }
      return result;
    },
    enabled: Boolean(suiAddress || email),
    refetchInterval: query => {
      const d = query.state.data;
      if (!d) return false;
      if (d.identityStatus === "pending" || d.onChain?.needs_provision) return POLL_MS;
      return false;
    },
  });

  useEffect(() => {
    if (suiAddress) {
      const cached = loadStoredCredential(suiAddress);
      if (cached && !pipelineQuery.data?.credential) {
        queryClient.setQueryData(
          passportQueryKeys.identity(suiAddress, email),
          (old: PipelineResult | undefined) =>
            old ? { ...old, credential: cached, identityStatus: "earned" as const } : old,
        );
      }
    }
  }, [suiAddress, email, pipelineQuery.data?.credential, queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: passportQueryKeys.identity(suiAddress, email),
    });
  }, [queryClient, suiAddress, email]);

  const retryProvision = useCallback(async () => {
    if (!suiAddress || provisioningRef.current) return;
    provisioningRef.current = true;
    setIsProvisioning(true);
    setProvisionError(null);
    try {
      const status = await fetchOnChainPassportStatus(suiAddress);
      if (status?.needs_provision) {
        const data = await provisionOnChainPassport(suiAddress);
        if (data.error) setProvisionError(data.error);
        queryClient.setQueryData(
          passportQueryKeys.identity(suiAddress, email),
          (old: PipelineResult | undefined) =>
            old ? { ...old, onChain: data.object_id ? data : old.onChain } : old,
        );
      }
      await refresh();
    } catch {
      setProvisionError("On-chain provision failed");
    } finally {
      provisioningRef.current = false;
      setIsProvisioning(false);
    }
  }, [suiAddress, email, queryClient, refresh]);

  const data = pipelineQuery.data;
  const identityStatus = data?.identityStatus ?? "not_started";
  const isPolling = identityStatus === "pending" || Boolean(data?.onChain?.needs_provision);

  const setup = data?.setup ?? (suiAddress ? computePassportSetupState({
    walletDone: Boolean(suiAddress),
    identityStatus: resolveIdentityVerificationStatus(
      data?.identityStatus === "earned" ? { status: "approved", credential_jti: data?.credential?.jti } : null,
    ),
    credentialStatus: resolveCredentialStatus(
      data?.identityStatus === "earned" ? { status: "approved", credential_jti: data?.credential?.jti } : null,
    ),
    walletBindingL3: data?.walletBindingL3 ?? false,
  }) : null);

  return {
    identityStatus,
    via: data?.via ?? null,
    credential: data?.credential ?? null,
    verifyState: data?.verifyState ?? "idle",
    verifyResult: data?.verifyResult ?? null,
    onChain: data?.onChain ?? null,
    isRefreshing: pipelineQuery.isFetching && !pipelineQuery.isLoading,
    isProvisioning,
    provisionError,
    syncMessage: data?.syncMessage ?? null,
    lastChecked: pipelineQuery.dataUpdatedAt ? new Date(pipelineQuery.dataUpdatedAt) : null,
    refresh,
    retryProvision,
    isPolling,
    isLoading: pipelineQuery.isLoading,
    setup,
    veriffConfigured: data?.veriffConfigured ?? false,
    walletBindingL3: data?.walletBindingL3 ?? false,
  };
}
