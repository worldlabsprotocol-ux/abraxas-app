// FILE: lib/sui/client.ts
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { SUI_DEVNET } from "./config";

let client: SuiClient | null = null;

export function getSuiDevnetClient(): SuiClient {
  if (!client) {
    client = new SuiClient({ url: SUI_DEVNET.rpcUrl || getFullnodeUrl("devnet") });
  }
  return client;
}
