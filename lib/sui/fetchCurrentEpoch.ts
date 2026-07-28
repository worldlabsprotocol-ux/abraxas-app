// FILE: lib/sui/fetchCurrentEpoch.ts
// Fetch current Sui epoch — JSON-RPC first, GraphQL fallback (public JSON-RPC deprecated Jul 2026).

import { getSuiClient } from "./serverClient";
import { getSuiGraphqlUrl, getSuiNetwork } from "./network";

export type EpochSource = "json_rpc" | "graphql";

export interface FetchEpochResult {
  epoch: number;
  source: EpochSource;
  detail?: string;
}

async function fetchEpochViaGraphql(): Promise<number> {
  const url = getSuiGraphqlUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ epoch { epochId } }" }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GraphQL ${url} returned HTTP ${res.status}`);
  }

  const body = (await res.json()) as {
    data?: { epoch?: { epochId?: number } };
    errors?: Array<{ message?: string }>;
  };

  if (body.errors?.length) {
    throw new Error(body.errors[0]?.message ?? "GraphQL epoch query failed");
  }

  const epoch = body.data?.epoch?.epochId;
  if (typeof epoch !== "number" || !Number.isFinite(epoch)) {
    throw new Error("GraphQL response missing epoch.epochId");
  }

  return epoch;
}

export async function fetchCurrentSuiEpoch(): Promise<FetchEpochResult> {
  try {
    const client = getSuiClient();
    const { epoch } = await client.getLatestSuiSystemState();
    const epochNum = Number(epoch);
    if (!Number.isFinite(epochNum)) {
      throw new Error(`Invalid epoch from JSON-RPC: ${String(epoch)}`);
    }
    return { epoch: epochNum, source: "json_rpc" };
  } catch (rpcError) {
    const rpcMsg = rpcError instanceof Error ? rpcError.message : "JSON-RPC failed";
    try {
      const epoch = await fetchEpochViaGraphql();
      return {
        epoch,
        source: "graphql",
        detail: `JSON-RPC unavailable (${rpcMsg}); used GraphQL on ${getSuiNetwork()}`,
      };
    } catch (gqlError) {
      const gqlMsg = gqlError instanceof Error ? gqlError.message : "GraphQL failed";
      throw new Error(
        `Could not read Sui epoch on ${getSuiNetwork()}. JSON-RPC: ${rpcMsg}. GraphQL: ${gqlMsg}. `
        + "Update SUI_RPC_URL in Vercel or confirm GraphQL is reachable.",
      );
    }
  }
}
