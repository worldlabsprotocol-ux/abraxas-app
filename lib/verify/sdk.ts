// FILE: lib/verify/sdk.ts
// Abraxas Verify server SDK — permission-based trust requests.

const DEFAULT_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";

export interface AbraxasVerifyClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface RequestTrustInput {
  permission: string;
  redirectUri: string;
  state?: string;
  permissionVersion?: string;
}

export interface TrustDecisionResponse {
  decision_id: string;
  approved: boolean;
  decision: "approved" | "denied" | "manual_review";
  permission: string | null;
  permission_version: string | null;
  trust_level: number | null;
  valid_until: string | null;
  reason_codes: string[];
  status: string;
  decided_at: string;
  policy_id: string;
  policy_version: number;
  relying_party_id: string;
  proof: {
    receipt_id: string;
    schema_version: string;
    signature: string;
    signing_key_id: string;
    payload_hash: string;
    verify_url: string;
  } | null;
}

export class AbraxasVerifyClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: AbraxasVerifyClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE;
  }

  /** Start a trust request — returns hosted authorization URL for the holder. */
  async requestTrust(input: RequestTrustInput) {
    const res = await fetch(`${this.baseUrl}/api/v1/verify/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        permission: input.permission,
        redirect_uri: input.redirectUri,
        state: input.state,
        permission_version: input.permissionVersion,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `requestTrust failed: ${res.status}`);
    }
    return res.json() as Promise<{
      trust_request_id: string;
      authorization_url: string;
      permission: string;
      permission_version: string;
      policy_id: string;
      expires_at: string;
      state: string | null;
    }>;
  }

  /** Retrieve a Trust Decision by decision ID. */
  async getDecision(decisionId: string): Promise<TrustDecisionResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/verify/decisions/${decisionId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `getDecision failed: ${res.status}`);
    }
    return res.json() as Promise<TrustDecisionResponse>;
  }
}
