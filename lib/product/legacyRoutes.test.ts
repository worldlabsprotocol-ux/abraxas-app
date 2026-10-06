// FILE: lib/product/legacyRoutes.test.ts

import { describe, expect, it } from "vitest";
import { LEGACY_ROUTE_CATALOG } from "@/lib/product/legacyRoutes";

describe("legacy route catalog", () => {
  it("classifies conflicting obsolete marketplace and build routes", () => {
    const marketplace = LEGACY_ROUTE_CATALOG.find((entry) => entry.path === "/marketplace");
    const build = LEGACY_ROUTE_CATALOG.find((entry) => entry.path === "/build");
    expect(marketplace?.class).toBe("conflicting_obsolete");
    expect(build?.class).toBe("conflicting_obsolete");
  });

  it("marks passport and verification as current product", () => {
    expect(LEGACY_ROUTE_CATALOG.find((entry) => entry.path === "/passport")?.class).toBe("current_product");
    expect(LEGACY_ROUTE_CATALOG.find((entry) => entry.path === "/verification")?.class).toBe("current_product");
  });
});
