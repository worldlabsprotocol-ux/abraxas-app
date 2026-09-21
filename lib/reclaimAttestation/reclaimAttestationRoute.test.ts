import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as callbackPost } from "@/app/api/reclaim/callback/route";
import { GET as availabilityGet } from "@/app/api/reclaim/availability/route";
import { POST as startPost } from "@/app/api/reclaim/start/route";
import { reclaimPayloadLeaks, resetReclaimSessionsForTests } from "@/lib/reclaimAttestation";

describe("reclaim routes", () => {
  beforeEach(() => {
    resetReclaimSessionsForTests();
  });

  it("retires the generic start picker and keeps availability free of secrets", async () => {
    const retired = await startPost();
    expect(retired.status).toBe(410);
    const available = await availabilityGet(new NextRequest("http://localhost/api/reclaim/availability?policy_id=partner-age_21_retail-v1"));
    const json = await available.json() as Record<string, unknown>;
    expect(json.google_is_eligibility).toBe(false);
    expect(json.issued_receipt).toBe(false);
    expect(reclaimPayloadLeaks(json)).toEqual([]);
  });

  it("callback fails closed without a valid session and never returns raw proof", async () => {
    const res = await callbackPost(new NextRequest("http://localhost/api/reclaim/callback", {
      method: "POST",
      body: JSON.stringify({ proofs: { extractedParameters: { email: "a@b.com" } } }),
    }));
    const json = await res.json() as Record<string, unknown>;
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(json.issued_receipt).toBe(false);
    expect(JSON.stringify(json)).not.toMatch(/a@b.com|extractedParameters/);
  });
});
