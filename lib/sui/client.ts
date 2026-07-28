// FILE: lib/sui/client.ts
// Browser must never call Sui JSON-RPC (CORS). Use /api/zklogin/prepare and server APIs.

export class BrowserSuiRpcError extends Error {
  constructor(context = "sign-in") {
    super(
      `Direct Sui RPC from the browser is blocked during ${context} (CORS). `
      + "Use GET /api/zklogin/prepare for zkLogin. Hard-refresh if you still see rpc-devnet requests.",
    );
    this.name = "BrowserSuiRpcError";
  }
}

/** @deprecated Browser cannot use Sui JSON-RPC. Import getSuiClient from @/lib/sui/serverClient in API routes only. */
export function getSuiClient(): never {
  throw new BrowserSuiRpcError();
}

/** @deprecated */
export function getSuiDevnetClient(): never {
  throw new BrowserSuiRpcError();
}
