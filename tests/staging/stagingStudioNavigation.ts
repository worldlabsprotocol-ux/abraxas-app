// FILE: tests/staging/stagingStudioNavigation.ts
// Integration Studio loads long-lived polling; never wait for networkidle on deployed staging.

import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

function withAdvancedStudioPath(path: string): string {
  if (path.includes("advanced=1") || !path.includes("/developers/integration-studio")) return path;
  const hashIndex = path.indexOf("#");
  const basePath = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
  const joiner = basePath.includes("?") ? "&" : "?";
  return `${basePath}${joiner}advanced=1${hash}`;
}

export async function gotoIntegrationStudio(
  page: Page,
  base: string,
  path = "/developers/integration-studio",
): Promise<void> {
  const normalized = path.startsWith("http") ? path : `${base.replace(/\/$/, "")}${path}`;
  const url = withAdvancedStudioPath(normalized);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 60_000 });
}

export async function completeHomeBuilderDiscovery(discovery: Locator): Promise<void> {
  await discovery.getByRole("radio", { name: /Website/i }).click();
  await discovery.getByRole("button", { name: /^Continue$/i }).click();
  await discovery.getByRole("radio", { name: /Wallet control eligibility/i }).click();
  await discovery.getByRole("button", { name: /Continue to builder/i }).click();
}