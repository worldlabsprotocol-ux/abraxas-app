import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/judge-demo/environment/route";

describe("GET /api/judge-demo/environment", () => {
  it("is retired on every host", async () => {
    const res = await GET(new NextRequest("https://demo.abraxasworld.xyz/api/judge-demo/environment"));
    expect(res.status).toBe(404);
    const body = await res.json() as { error?: string };
    expect(body.error).toBe("not_found");
    expect(JSON.stringify(body).toLowerCase()).not.toContain("judge");
  });
});
