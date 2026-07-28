// FILE: lib/sui/serverClient.ts
// Sui JSON-RPC client for API routes and server modules only — do not import from client components.

import { SuiClient } from "@mysten/sui/client";
import { getSuiRpcUrl } from "./network";

let cachedUrl: string | null = null;
let client: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  const url = getSuiRpcUrl();
  if (!client || cachedUrl !== url) {
    client = new SuiClient({ url });
    cachedUrl = url;
  }
  return client;
}

export function getSuiDevnetClient(): SuiClient {
  return getSuiClient();
}
