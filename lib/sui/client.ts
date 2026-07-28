// FILE: lib/sui/client.ts
import { SuiClient } from "@mysten/sui/client";
import { getSuiRpcUrl } from "./network";

let cachedUrl: string | null = null;
let client: SuiClient | null = null;

export class BrowserSuiRpcError extends Error {
  constructor() {
    super(
      "Direct Sui RPC from the browser is blocked (CORS). "
      + "Sign-in must use GET /api/zklogin/prepare. "
      + "If you see this during login, production is running an outdated bundle.",
    );
    this.name = "BrowserSuiRpcError";
  }
}

export interface SuiClientOptions {
  /** @deprecated Browser RPC is blocked by default. Use server API routes instead. */
  allowBrowser?: boolean;
}

/** Primary Sui client — server-side only unless `allowBrowser` is explicitly set. */
export function getSuiClient(options?: SuiClientOptions): SuiClient {
  if (typeof window !== "undefined" && !options?.allowBrowser) {
    throw new BrowserSuiRpcError();
  }

  const url = getSuiRpcUrl();
  if (!client || cachedUrl !== url) {
    client = new SuiClient({ url });
    cachedUrl = url;
  }
  return client;
}

/** @deprecated use getSuiClient() — name kept for existing imports. */
export function getSuiDevnetClient(options?: SuiClientOptions): SuiClient {
  return getSuiClient(options);
}
