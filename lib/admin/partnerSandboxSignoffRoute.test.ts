// FILE: lib/admin/partnerSandboxSignoffRoute.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";
import {
  applyChecklistCasFilter,
  defaultSandboxPilotSignoff,
  defaultWebhookTrackGates,
  describeChecklistCasFilter,
} from "@/lib/admin/partnerSandboxSignoff";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

const checkProductionSensitiveAdminAccessMock = vi.fn();
const resolveBrowserSessionMock = vi.fn();
const maybeSingleMock = vi.fn();

type TableHandler = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function createChain(): TableHandler {
  const chain: TableHandler = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: maybeSingleMock,
    single: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  return chain;
}

const designPartnersChain = createChain();
const partnersChain = createChain();
const tableChains: Record<string, TableHandler> = {
  design_partners: designPartnersChain,
  partners: partnersChain,
};

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => resolveBrowserSessionMock(...args),
}));

vi.mock("@/lib/adminAuth", () => ({
  checkProductionSensitiveAdminAccess: (...args: unknown[]) =>
    checkProductionSensitiveAdminAccessMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => tableChains[table] ?? createChain()),
  })),
}));

import { GET, PATCH } from "@/app/api/admin/partners/sandbox-signoff/route";
import { PATCH as designPartnersPATCH } from "@/app/api/admin/design-partners/route";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const PARTNER_ID = "acme-v1";
const APP_ID = "11111111-1111-1111-1111-111111111111";

function getRequest(partnerId = PARTNER_ID) {
  return new NextRequest(
    `http://localhost/api/admin/partners/sandbox-signoff?partner_id=${encodeURIComponent(partnerId)}`,
  );
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/partners/sandbox-signoff", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function designPartnerPatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/design-partners", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function productionEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("ADMIN_PIN", "test-admin-pin");
}

function setupPromotedPartner(row: {
  onboarding_checklist: unknown;
  updated_at?: string;
}) {
  designPartnersChain.maybeSingle.mockResolvedValueOnce({
    data: {
      id: APP_ID,
      status: "onboarded",
      promoted_partner_id: PARTNER_ID,
      reviewer_notes: "existing note",
    },
    error: null,
  });
  partnersChain.maybeSingle.mockResolvedValueOnce({
    data: {
      partner_id: PARTNER_ID,
      onboarding_checklist: row.onboarding_checklist,
      updated_at: row.updated_at ?? "2026-01-01T00:00:00.000Z",
    },
    error: null,
  });
}

describe("sandbox-signoff route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    designPartnersChain.maybeSingle.mockReset();
    partnersChain.maybeSingle.mockReset();
    partnersChain.eq.mockImplementation(() => partnersChain);
    partnersChain.is.mockImplementation(() => partnersChain);
    partnersChain.update.mockImplementation(() => partnersChain);
    designPartnersChain.eq.mockImplementation(() => designPartnersChain);
    designPartnersChain.update.mockImplementation(() => designPartnersChain);
    designPartnersChain.select.mockImplementation(() => designPartnersChain);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when production PIN-only access is rejected", async () => {
    productionEnv();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(false);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("allows allowlisted browser session", async () => {
    setupPromotedPartner({ onboarding_checklist: null });
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
  });

  it("returns generic 404 for unknown partner", async () => {
    designPartnersChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const res = await GET(getRequest("missing-partner"));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Partner not found");
  });

  it("GET never exposes onboarding_checklist or CAS snapshot fields", async () => {
    setupPromotedPartner({
      onboarding_checklist: {
        future_key: 1,
        sandbox_pilot_signoff: defaultSandboxPilotSignoff(APP_ID),
      },
    });
    const res = await GET(getRequest());
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("onboarding_checklist");
    expect(body).not.toHaveProperty("expected_onboarding_checklist");
    expect(body).not.toHaveProperty("expected_checklist_for_cas");
    expect(body).toHaveProperty("signoff");
    expect(body.reviewer_notes).toBe("existing note");
  });

  it("PATCH rejects expected_onboarding_checklist from client", async () => {
    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      expected_onboarding_checklist: {},
    }));
    expect(res.status).toBe(400);
  });

  it("PATCH rejects onboarding_checklist from client", async () => {
    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      onboarding_checklist: {},
    }));
    expect(res.status).toBe(400);
  });

  it("PATCH 200 never exposes onboarding_checklist", async () => {
    const raw = { future_key: 1 };
    setupPromotedPartner({ onboarding_checklist: raw });
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "onboarded",
        promoted_partner_id: PARTNER_ID,
        reviewer_notes: null,
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        partner_id: PARTNER_ID,
        onboarding_checklist: raw,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: { partner_id: PARTNER_ID, updated_at: "2026-01-02T00:00:00.000Z" },
      error: null,
    });

    const eqCalls: Array<[string, unknown]> = [];
    partnersChain.eq.mockImplementation((col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return partnersChain;
    });

    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      gates: { configured: { operator_ack: true } },
    }));
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("onboarding_checklist");
    const checklistEq = eqCalls.find(([col]) => col === "onboarding_checklist");
    expect(checklistEq?.[1]).toBe(JSON.stringify(raw));
  });

  it("uses is(onboarding_checklist, null) CAS for SQL NULL checklist", async () => {
    setupPromotedPartner({ onboarding_checklist: null });
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "onboarded",
        promoted_partner_id: PARTNER_ID,
        reviewer_notes: null,
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        partner_id: PARTNER_ID,
        onboarding_checklist: null,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: { partner_id: PARTNER_ID, updated_at: "2026-01-02T00:00:00.000Z" },
      error: null,
    });

    const isCalls: Array<[string, null]> = [];
    partnersChain.is.mockImplementation((col: string, val: null) => {
      isCalls.push([col, val]);
      return partnersChain;
    });

    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      gates: { configured: { operator_ack: true } },
    }));
    expect(res.status).toBe(200);
    expect(isCalls).toContainEqual(["onboarding_checklist", null]);
    const updatePayload = partnersChain.update.mock.calls[0]?.[0] as { onboarding_checklist: Record<string, unknown> };
    expect(updatePayload.onboarding_checklist.sandbox_pilot_signoff).toBeTruthy();
  });

  it("returns 409 checklist_conflict when CAS matches zero rows", async () => {
    const raw = { future_key: 1 };
    setupPromotedPartner({ onboarding_checklist: raw });
    partnersChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      gates: { configured: { operator_ack: true } },
    }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("checklist_conflict");
  });

  it("rejects secret-like evidence in PATCH body", async () => {
    setupPromotedPartner({ onboarding_checklist: {} });
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "onboarded",
        promoted_partner_id: PARTNER_ID,
        reviewer_notes: null,
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        partner_id: PARTNER_ID,
        onboarding_checklist: {},
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      evidence: { receipt_id: "abx_test_leaked" },
    }));
    expect(res.status).toBe(400);
  });

  it("PATCH persists webhook_track gates with event_id", async () => {
    const raw = { future_key: 1 };
    setupPromotedPartner({ onboarding_checklist: raw });
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "onboarded",
        promoted_partner_id: PARTNER_ID,
        reviewer_notes: null,
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        partner_id: PARTNER_ID,
        onboarding_checklist: raw,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: { partner_id: PARTNER_ID, updated_at: "2026-01-02T00:00:00.000Z" },
      error: null,
    });

    const eventId = "11111111-1111-4111-8111-111111111111";
    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      evidence: { event_id: eventId },
      gates: {
        webhook_track: {
          queued: { operator_ack: true },
        },
      },
    }));
    const body = await res.json() as { signoff: { gates: { webhook_track?: { queued: { operator_ack: boolean } } }; evidence: { event_id?: string } } };
    expect(res.status).toBe(200);
    expect(body.signoff.gates.webhook_track?.queued.operator_ack).toBe(true);
    expect(body.signoff.evidence.event_id).toBe(eventId);
  });

  it("PATCH rejects webhook queued without event_id", async () => {
    setupPromotedPartner({ onboarding_checklist: {} });
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "onboarded",
        promoted_partner_id: PARTNER_ID,
        reviewer_notes: null,
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        partner_id: PARTNER_ID,
        onboarding_checklist: {},
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      gates: { webhook_track: { queued: { operator_ack: true } } },
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("webhook_event_id_required");
  });

  it("PATCH rejects event_id change while webhook gates acknowledged", async () => {
    const eventId = "11111111-1111-4111-8111-111111111111";
    const priorSignoff = defaultSandboxPilotSignoff(APP_ID);
    priorSignoff.evidence.event_id = eventId;
    priorSignoff.gates.webhook_track = defaultWebhookTrackGates();
    priorSignoff.gates.webhook_track.queued.operator_ack = true;
    priorSignoff.gates.webhook_track.queued.acknowledged_at = "t";
    const raw = { sandbox_pilot_signoff: priorSignoff };
    setupPromotedPartner({ onboarding_checklist: raw });
    designPartnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: APP_ID,
        status: "onboarded",
        promoted_partner_id: PARTNER_ID,
        reviewer_notes: null,
      },
      error: null,
    });
    partnersChain.maybeSingle.mockResolvedValueOnce({
      data: {
        partner_id: PARTNER_ID,
        onboarding_checklist: raw,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const res = await PATCH(patchRequest({
      partner_id: PARTNER_ID,
      evidence: { event_id: "22222222-2222-4222-8222-222222222222" },
      gates: {
        webhook_track: {
          queued: { operator_ack: true },
        },
      },
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("webhook_event_change_requires_gate_reset");
  });
});

describe("design-partners PATCH reviewer_notes clobber fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    designPartnersChain.single = vi.fn();
    designPartnersChain.select.mockReturnValue(designPartnersChain);
    designPartnersChain.update.mockReturnValue(designPartnersChain);
    designPartnersChain.eq.mockReturnValue(designPartnersChain);
  });

  it("omits reviewer_notes when field not present", async () => {
    designPartnersChain.single.mockResolvedValueOnce({
      data: { id: APP_ID, status: "approved", reviewer_notes: "keep me" },
      error: null,
    });

    await designPartnersPATCH(designPartnerPatchRequest({ id: APP_ID, status: "approved" }));

    const payload = designPartnersChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("reviewer_notes");
    expect(payload.status).toBe("approved");
  });

  it("clears reviewer_notes when empty string provided", async () => {
    designPartnersChain.single.mockResolvedValueOnce({
      data: { id: APP_ID, status: "approved", reviewer_notes: null },
      error: null,
    });

    await designPartnersPATCH(designPartnerPatchRequest({
      id: APP_ID,
      status: "approved",
      reviewer_notes: "",
    }));

    const payload = designPartnersChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.reviewer_notes).toBeNull();
  });
});

describe("checklist CAS filter chain", () => {
  it("serializes exact server-read JSONB for non-null eq filter", () => {
    const raw = { future_key: 9 };
    const filter = describeChecklistCasFilter(raw);
    const chain = createChain();
    applyChecklistCasFilter(chain, filter);
    expect(chain.eq).toHaveBeenCalledWith("onboarding_checklist", JSON.stringify(raw));
    expect(chain.is).not.toHaveBeenCalled();
    expect(filter.value).toBe(raw);
  });
});
