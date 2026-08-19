// FILE: scripts/demo/lib/demoRestClient.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createDemoRestReadClient } from "./demoRestClient";

describe("demoRestClient", () => {
  it("imports PostgREST only and does not pull in supabase-js createClient", () => {
    const source = readFileSync(resolve(import.meta.dirname, "demoRestClient.ts"), "utf8");
    expect(source).toContain("@supabase/postgrest-js");
    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toContain("createClient");
    expect(source).not.toContain("Realtime");
    expect(source).not.toContain("WebSocket");
    expect(source).not.toMatch(/\bws\b/);
  });

  it("exposes only the from() probe surface", () => {
    const client = createDemoRestReadClient(
      "https://demo-ref.supabase.co",
      "service-role-key-placeholder",
    );

    expect(Object.keys(client).sort()).toEqual(["from"]);
    expect(typeof client.from).toBe("function");
  });
});
