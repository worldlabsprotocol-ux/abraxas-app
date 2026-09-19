import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_PRODUCT_ERROR_SURFACES,
  PUBLIC_PRODUCT_ROUTES,
  publicPageFile,
} from "./publicRouteManifest";

const RAW_VERCEL_500 = /500 Internal Server Error/;
const JUDGE_DEMO = /judge demo|Judge Demo|judge-demo product/i;
const DEMO_HIDE = /hide.*(passport|partner flow|integration studio)|DEMO.?hosting.*unavailable/i;

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("public product route reliability", () => {
  it("keeps the public-product route manifest on disk", () => {
    const missing = PUBLIC_PRODUCT_ROUTES.filter((route) => {
      try {
        read(publicPageFile(route));
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });

  it("renders branded Abraxas recoverable errors instead of raw Vercel 500 HTML", () => {
    for (const surface of PUBLIC_PRODUCT_ERROR_SURFACES) {
      const src = read(surface);
      expect(src, surface).toMatch(/Abraxas/);
      expect(src, surface).toMatch(/Try again/);
      expect(src, surface).not.toMatch(RAW_VERCEL_500);
      expect(src, surface).not.toMatch(/INTERNAL_SERVER_ERROR/);
    }
    const appError = read("app/error.tsx");
    expect(appError).toContain("AbxEmptyState");
    expect(appError).toContain("This page could not load");
    const nextConfig = read("next.config.js");
    expect(nextConfig).not.toContain("outputFileTracingIgnores");
    expect(nextConfig).toContain("outputFileTracingExcludes");
  });

  it("does not hide product capabilities or introduce judge-demo language on public routes", () => {
    for (const route of PUBLIC_PRODUCT_ROUTES) {
      const src = read(publicPageFile(route));
      expect(src, route).not.toMatch(JUDGE_DEMO);
      expect(src, route).not.toMatch(DEMO_HIDE);
    }
  });
});
