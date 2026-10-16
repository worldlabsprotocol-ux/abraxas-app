// FILE: lib/institutionalVerification/sdkReleaseHelpers.ts

import { readFileSync } from "node:fs";
import path from "node:path";

export function readPackageVersionFromEnv(env: Record<string, string | undefined> = process.env): string {
  const override = env.INSTITUTIONAL_SDK_PACKAGE_VERSION?.trim();
  if (override) return override;
  try {
    const pkgPath = path.join(process.cwd(), "packages/abraxas-institutional-verification/package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return typeof parsed.version === "string" ? parsed.version : "0.1.0";
  } catch {
    return "0.1.0";
  }
}
