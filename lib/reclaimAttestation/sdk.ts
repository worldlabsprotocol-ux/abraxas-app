// FILE: lib/reclaimAttestation/sdk.ts
// Official @reclaimprotocol/js-sdk is imported only in this server module.

export interface ReclaimVerifyResult {
  isVerified: boolean;
  isTeeAttestationVerified: boolean;
  data: Array<{
    context?: { address?: string; message?: string };
    extractedParameters?: Record<string, string>;
  }>;
}

export interface ReclaimRequestInitResult {
  requestConfig: string;
  providerId: string;
  providerVersion: string;
}

export interface ReclaimSdkAdapter {
  createRequest(input: {
    appId: string;
    appSecret: string;
    providerId: string;
    callbackUrl: string;
    contextAddress: string;
    sessionRef: string;
  }): Promise<ReclaimRequestInitResult>;
  verifyProof(input: {
    proofs: unknown;
    providerId: string;
    providerVersion: string;
    appSecret: string;
  }): Promise<ReclaimVerifyResult>;
}

const officialAdapter: ReclaimSdkAdapter = {
  async createRequest(input) {
    const { ReclaimProofRequest } = await import("@reclaimprotocol/js-sdk");
    const request = await ReclaimProofRequest.init(input.appId, input.appSecret, input.providerId, {
      acceptTeeAttestation: true,
    });
    await request.setAppCallbackUrl(input.callbackUrl, true);
    await request.setContext(input.contextAddress, input.sessionRef);
    const version = await request.getProviderVersion();
    const requestConfig = await request.toJsonString();
    return {
      requestConfig,
      providerId: version.providerId,
      providerVersion: version.providerVersion,
    };
  },
  async verifyProof(input) {
    const { verifyProof } = await import("@reclaimprotocol/js-sdk");
    const result = await verifyProof(input.proofs as never, {
      providerId: input.providerId,
      providerVersion: input.providerVersion,
      teeAttestation: { appSecret: input.appSecret },
    });
    return {
      isVerified: Boolean(result?.isVerified),
      isTeeAttestationVerified: Boolean(
        (result as { isTeeAttestationVerified?: boolean } | undefined)?.isTeeAttestationVerified,
      ),
      data: Array.isArray(result?.data) ? result.data as ReclaimVerifyResult["data"] : [],
    };
  },
};

let activeAdapter: ReclaimSdkAdapter = officialAdapter;

export function setReclaimSdkAdapterForTests(adapter: ReclaimSdkAdapter | null): void {
  activeAdapter = adapter ?? officialAdapter;
}

export function reclaimSdk(): ReclaimSdkAdapter {
  return activeAdapter;
}
