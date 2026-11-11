export const WORKER_SCOPES = [
  "institutional:status:publish",
  "institutional:issuer:publish",
  "institutional:authority:change",
  "institutional:health:read",
] as const;

export type WorkerScope = (typeof WORKER_SCOPES)[number];

export const WORKER_ROUTE_SCOPES = {
  "/v1/authoritative/receipt-status": "institutional:status:publish",
  "/v1/authoritative/recorded-issuer-authority-statement": "institutional:issuer:publish",
  "/v1/authoritative/authority-change-approval": "institutional:authority:change",
  "/v1/health": "institutional:health:read",
} as const;

export type WorkerPrivilegedRoute = keyof typeof WORKER_ROUTE_SCOPES;

export const WORKER_PRIVILEGED_ROUTES = Object.keys(WORKER_ROUTE_SCOPES) as WorkerPrivilegedRoute[];

export type WorkerPrincipal = {
  identityId: string;
  environment: "demo" | "production";
  scopes: readonly [WorkerScope];
  partnerId?: string;
  tenantId?: string;
  notAfter?: string;
};
