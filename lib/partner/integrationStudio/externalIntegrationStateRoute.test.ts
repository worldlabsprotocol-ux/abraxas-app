import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetIntegrationEventsForTests, recordIntegrationEvent } from "@/lib/partner/integrationObservability/record";

const resolveSessionMock = vi.fn();
const getAppMock = vi.fn();

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));

describe("external-integration-state route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetIntegrationEventsForTests();
    resolveSessionMock.mockResolvedValue({ partnerId: "studio-acme", apiKeyId: "key-1", environment: "sandbox" });
    getAppMock.mockResolvedValue({
      id: "app-1",
      partner_id: "studio-acme",
      policy_id: "studio-acme-wallet_control-v1",
      policy_version: 1,
      allowed_return_urls: ["https://example.com/callback"],
    });
  });

  it("returns enforcement confirmed when live permit events exist", async () => {
    const base = {
      partnerId: "studio-acme",
      applicationId: "app-1",
      environment: "sandbox" as const,
      receiptId: "dr_live_abc",
    };
    await recordIntegrationEvent({ ...base, eventType: "hosted_handoff_created", lifecycleStage: "request" });
    await recordIntegrationEvent({ ...base, eventType: "receipt_issued", lifecycleStage: "receipt" });
    await recordIntegrationEvent({
      ...base,
      eventType: "receipt_verification_succeeded",
      lifecycleStage: "verification",
    });
    await recordIntegrationEvent({
      ...base,
      eventType: "access_decision_permit",
      lifecycleStage: "decision",
    });
    const { GET } = await import("@/app/api/developers/integration-studio/external-integration-state/route");
    const req = new NextRequest(
      "http://localhost/api/developers/integration-studio/external-integration-state?application_id=app-1&harness_ok=1&files_ready=1&server_ack=1",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json() as { acceptance: { phase: string } };
    expect(json.acceptance.phase).toBe("application_enforcement_confirmed");
  });
});
