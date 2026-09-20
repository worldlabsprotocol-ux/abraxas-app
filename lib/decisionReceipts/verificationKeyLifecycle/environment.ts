// FILE: lib/decisionReceipts/verificationKeyLifecycle/environment.ts

import { isPublicDemoRuntime, isPublicProductProduction } from "@/lib/product/publicOrigin";
import type { ReceiptKeyEnvironment } from "./contract";

export function resolveReceiptKeyRuntimeEnvironment(
  env: Record<string, string | undefined> = process.env,
): ReceiptKeyEnvironment {
  if (isPublicProductProduction(env)) return "production";
  if (isPublicDemoRuntime(env)) return "demo";
  return "demo";
}
