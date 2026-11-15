// FILE: app/api/developers/verification-first/synthetic-bundle/route.test.ts

import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/developers/verification-first/synthetic-bundle", () => {
  it("returns labeled synthetic portable bundle", async () => {
    const res = await GET();
    const json = (await res.json()) as {
      ok: boolean;
      label: string;
      not_for_production: boolean;
      bundle: { schema: string };
    };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.label).toBe("synthetic_teaching_fixture");
    expect(json.not_for_production).toBe(true);
    expect(json.bundle.schema).toBe("abraxas_portable_verification_bundle/1.0.0");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
  });
});