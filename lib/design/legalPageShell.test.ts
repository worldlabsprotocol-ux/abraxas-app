import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("legal page shell", () => {
  it("does not nest a second RedesignPage shell", () => {
    const source = readFileSync(resolve(process.cwd(), "app/legal/terms/page.tsx"), "utf8");
    expect(source).not.toContain("RedesignPage");
    expect(source).toContain("PageHeader title=\"Terms of Service\"");
  });
});
