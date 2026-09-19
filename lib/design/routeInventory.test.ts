// FILE: lib/design/routeInventory.test.ts

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pendingRoutes } from "./routeInventory";

const ROOT = join(__dirname, "..", "..");

const SHELL_MARKERS = [
  "AbxPageShell",
  "AbxSectionLayout",
  "RedesignPage",
  "RedesignShell",
  "RedesignHome",
  "PartnerJourneyLayout",
  "PartnerVerifyShell",
  "PartnerContinueClient",
  "PassportPageClient",
  "VerificationDashboard",
  "PartnerEnterClient",
  "PartnerLaunchpadClient",
  "AdminShell",
];

function walkPages(dir: string, files: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "node_modules" || e === ".next") continue;
      walkPages(p, files);
    } else if (e === "page.tsx") files.push(p);
  }
  return files;
}

function hasShellInTree(pagePath: string): boolean {
  const pageSrc = readFileSync(pagePath, "utf8");
  if (/\bredirect\s*\(/.test(pageSrc) && !pageSrc.includes("return (") && !pageSrc.includes("return(")) {
    return true;
  }
  if (SHELL_MARKERS.some((m) => pageSrc.includes(m))) return true;

  let dir = join(pagePath, "..");
  const appRoot = join(ROOT, "app");
  while (dir.startsWith(appRoot)) {
    const layoutPath = join(dir, "layout.tsx");
    try {
      const layoutSrc = readFileSync(layoutPath, "utf8");
      if (layoutSrc.includes("AbxSectionLayout") || layoutSrc.includes("AdminShell")) return true;
    } catch {
      // no layout
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

describe("routeInventory", () => {
  it("covers the full route inventory", () => {
    const pages = walkPages(join(ROOT, "app"));
    expect(pages.length).toBeGreaterThanOrEqual(153);
  });

  it("has no pending routes in the inventory manifest", () => {
    expect(pendingRoutes()).toEqual([]);
  });

  it("every page.tsx has a premium shell in page or parent layout", () => {
    const pages = walkPages(join(ROOT, "app"));
    const unmigrated: string[] = [];
    for (const p of pages) {
      if (!hasShellInTree(p)) {
        unmigrated.push(relative(ROOT, p));
      }
    }
    if (unmigrated.length > 0) {
      expect.fail(`Routes missing shell:\n${unmigrated.join("\n")}`);
    }
    expect(unmigrated).toEqual([]);
  });
});
