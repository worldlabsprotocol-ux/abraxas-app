// FILE: lib/sui/client.ts
import { SuiClient } from "@mysten/sui/client";
import { getSuiRpcUrl } from "./network";

let cachedUrl: string | null = null;
let client: SuiClient | null = null;

/** Primary Sui client — respects SUI_NETWORK / SUI_RPC_URL. */
export function getSuiClient(): SuiClient {
  const url = getSuiRpcUrl();
  if (!client || cachedUrl !== url) {
    client = new SuiClient({ url });
    cachedUrl = url;
  }
  return client;
}

/** @deprecated use getSuiClient() — name kept for existing imports. */
export function getSuiDevnetClient(): SuiClient {
  return getSuiClient();
}
