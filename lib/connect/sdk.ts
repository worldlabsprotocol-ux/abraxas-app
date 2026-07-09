// FILE: lib/connect/sdk.ts
// Minimal server SDK for Abraxas Connect (pilot).

const DEFAULT_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";

export interface AbraxasConnectClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface CreateAuthorizationInput {
  policyId: string;
  walletAddress?: string;
  chain?: "evm" | "sui";
  chainId?: number;
  requestedAction?: string;
  returnUrl: string;
  idempotencyKey?: string;
}

export class AbraxasConnectClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: AbraxasConnectClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE;
  }

  async createAuthorizationRequest(input: CreateAuthorizationInput) {
    const res = await fetch(`${this.baseUrl}/api/v1/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        policy_id: input.policyId,
        wallet_address: input.walletAddress,
        chain: input.chain ?? "evm",
        chain_id: input.chainId,
        requested_action: input.requestedAction,
        return_url: input.returnUrl,
        idempotency_key: input.idempotencyKey,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `Authorize failed: ${res.status}`);
    }
    return res.json() as Promise<{
      authorization_request_id: string;
      hosted_connect_url: string;
      expires_at: string;
      status: string;
    }>;
  }

  async getAuthorizationStatus(authorizationRequestId: string) {
    const res = await fetch(
      `${this.baseUrl}/api/v1/authorize/${authorizationRequestId}/status`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `Status failed: ${res.status}`);
    }
    return res.json();
  }
}
