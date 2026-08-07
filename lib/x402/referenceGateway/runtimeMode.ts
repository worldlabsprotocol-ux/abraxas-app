// FILE: lib/x402/referenceGateway/runtimeMode.ts
// Runtime safety: local-demo file store vs serverless vs durable fulfillment.

import { tmpdir } from "os";
import { join } from "path";
import { REFERENCE_GATEWAY_ENV } from "./config";
import { FileFulfillmentStore, type FulfillmentStore } from "./fulfillmentStore";

export const REFERENCE_GATEWAY_RUNTIME_ENV = {
  localDemoMode: "X402_REF_LOCAL_DEMO_MODE",
  durableStoreAdapter: "X402_REF_DURABLE_STORE_ADAPTER",
} as const;

export type FulfillmentStoreKind = "file-local-demo" | "durable" | "none";

export interface ReferenceGatewayRuntimeAssessment {
  /** Whether the route may handle any request (including 402 without settlement). */
  routeAllowed: boolean;
  /** Whether payment verify/settle may run (requires durable store on remote hosts). */
  settlementAllowed: boolean;
  storeKind: FulfillmentStoreKind;
  reason?: string;
  createFulfillmentStore?: () => FulfillmentStore;
}

export function isServerlessOrVercel(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(
    env.VERCEL
    || env.VERCEL_ENV
    || env.AWS_LAMBDA_FUNCTION_NAME
    || env.NETLIFY
    || env.FUNCTIONS_WORKER_RUNTIME
    || env.CF_PAGES
    || env.NOW_REGION,
  );
}

export function isLocalDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  return env[REFERENCE_GATEWAY_RUNTIME_ENV.localDemoMode]?.trim() === "true";
}

export function isDurableStoreAdapterConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env[REFERENCE_GATEWAY_RUNTIME_ENV.durableStoreAdapter]?.trim());
}

/**
 * Assess whether the reference gateway may run and whether settlement is permitted.
 *
 * Safety contract:
 * - FileFulfillmentStore is local-demo only; never used on serverless/Vercel.
 * - Remote/testnet gateways require a durable adapter before settlement (not implemented here).
 * - Serverless environments fail closed entirely (no file store, no settlement).
 */
export function assessReferenceGatewayRuntime(
  env: Record<string, string | undefined> = process.env,
): ReferenceGatewayRuntimeAssessment {
  const serverless = isServerlessOrVercel(env);
  const localDemo = isLocalDemoMode(env);

  if (serverless) {
    return {
      routeAllowed: false,
      settlementAllowed: false,
      storeKind: "none",
      reason: "serverless_file_store_rejected",
    };
  }

  if (localDemo) {
    const storePath = env[REFERENCE_GATEWAY_ENV.fulfillmentStorePath]?.trim()
      || join(tmpdir(), "abraxas-x402-ref-fulfillment-ledger.json");
    return {
      routeAllowed: true,
      settlementAllowed: true,
      storeKind: "file-local-demo",
      createFulfillmentStore: () => new FileFulfillmentStore({ filePath: storePath }),
    };
  }

  if (!isDurableStoreAdapterConfigured(env)) {
    return {
      routeAllowed: true,
      settlementAllowed: false,
      storeKind: "none",
      reason: "durable_fulfillment_store_required",
    };
  }

  return {
    routeAllowed: true,
    settlementAllowed: false,
    storeKind: "none",
    reason: "durable_fulfillment_store_not_implemented",
  };
}
