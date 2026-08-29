// FILE: lib/admin/designPartnerLifecycleAuditContract.test.ts

import { describe, expect, it } from "vitest";
import {
  buildDesignPartnerLifecycleAuditResponse,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_FORBIDDEN_RESPONSE_KEYS,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS,
  lifecycleAuditResponseContainsForbiddenKeys,
  mapOperatorCategoryToLabel,
  mapRpcEventToDto,
  parseDesignPartnerLifecycleAuditRpcEnvelope,
  serializeDesignPartnerLifecycleAuditResponse,
} from "@/lib/admin/designPartnerLifecycleAuditContract";
import {
  PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID,
  PRODUCTION_LIFECYCLE_AUDIT_APPROVED_DTO_EVENT,
  PRODUCTION_LIFECYCLE_AUDIT_APPROVED_RPC_ENVELOPE,
} from "@/lib/admin/designPartnerLifecycleAuditProductionFixture";

const APPLICATION_ID = "00000000-0000-4000-8000-000000000001";

function validRpcEvent(overrides: Record<string, unknown> = {}) {
  return {
    event_type: "admin.design_partner.approved",
    application_id: APPLICATION_ID,
    from_status: "submitted",
    to_status: "approved",
    promoted_partner_id: null,
    occurred_at: "2026-01-01T00:00:00.000Z",
    operator_category: "admin_authorized_email",
    ...overrides,
  };
}

describe("parseDesignPartnerLifecycleAuditRpcEnvelope", () => {
  it("accepts strict allowlisted RPC envelopes", () => {
    const envelope = parseDesignPartnerLifecycleAuditRpcEnvelope({
      events: [validRpcEvent()],
      next_cursor: {
        occurred_at: "2026-01-01T00:00:00.000Z",
        id: "10000000-0000-4000-8000-000000000003",
      },
    });
    expect(envelope.events).toHaveLength(1);
    expect(envelope.next_cursor?.id).toBe("10000000-0000-4000-8000-000000000003");
  });

  it("rejects unknown envelope keys", () => {
    expect(() => parseDesignPartnerLifecycleAuditRpcEnvelope({
      events: [],
      next_cursor: null,
      extra: true,
    })).toThrow("invalid_rpc_envelope");
  });

  it("rejects unknown event keys", () => {
    expect(() => parseDesignPartnerLifecycleAuditRpcEnvelope({
      events: [{ ...validRpcEvent(), metadata: {} }],
      next_cursor: null,
    })).toThrow("invalid_rpc_event");
  });

  it("rejects invalid enums", () => {
    expect(() => parseDesignPartnerLifecycleAuditRpcEnvelope({
      events: [validRpcEvent({ event_type: "admin.design_partner.unknown" })],
      next_cursor: null,
    })).toThrow("invalid_rpc_event");

    expect(() => parseDesignPartnerLifecycleAuditRpcEnvelope({
      events: [validRpcEvent({ from_status: "draft" })],
      next_cursor: null,
    })).toThrow("invalid_rpc_event");
  });

  it("accepts the exact Production v2 approved RPC envelope", () => {
    const envelope = parseDesignPartnerLifecycleAuditRpcEnvelope(
      PRODUCTION_LIFECYCLE_AUDIT_APPROVED_RPC_ENVELOPE,
    );
    expect(envelope.events).toHaveLength(1);
    expect(envelope.events[0]).toEqual({
      ...PRODUCTION_LIFECYCLE_AUDIT_APPROVED_RPC_ENVELOPE.events[0],
      application_id: PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID,
    });
    expect(envelope.next_cursor).toBeNull();
    expect(mapRpcEventToDto(envelope.events[0]!, PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID))
      .toEqual(PRODUCTION_LIFECYCLE_AUDIT_APPROVED_DTO_EVENT);
  });
});

describe("mapOperatorCategoryToLabel", () => {
  it("maps operator categories to public labels", () => {
    expect(mapOperatorCategoryToLabel("admin_authorized_email")).toBe("Authorized operator");
    expect(mapOperatorCategoryToLabel("admin_pin")).toBe("PIN session");
    expect(mapOperatorCategoryToLabel("admin_unknown")).toBe("Unknown operator");
    expect(mapOperatorCategoryToLabel(null)).toBe("Unknown operator");
  });
});

describe("mapRpcEventToDto", () => {
  it("never exposes operator_category in DTO mapping", () => {
    const dto = mapRpcEventToDto(validRpcEvent() as never, APPLICATION_ID);
    expect(Object.keys(dto).sort()).toEqual([...DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS].sort());
    expect(dto.operator_label).toBe("Authorized operator");
    expect(dto).not.toHaveProperty("operator_category");
  });
});

describe("serializeDesignPartnerLifecycleAuditResponse", () => {
  it("serializes strict API response allowlists only", () => {
    const response = buildDesignPartnerLifecycleAuditResponse(
      APPLICATION_ID,
      [mapRpcEventToDto(validRpcEvent() as never, APPLICATION_ID)],
      null,
    );
    const serialized = serializeDesignPartnerLifecycleAuditResponse(response);
    expect(Object.keys(serialized).sort()).toEqual([...DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS].sort());
    expect(serialized.events[0]).not.toHaveProperty("operator_category");
  });

  it("detects forbidden response keys in serialized payloads", () => {
    const polluted = {
      application_id: APPLICATION_ID,
      events: [],
      next_cursor: null,
      operator_category: "admin_pin",
    };
    expect(lifecycleAuditResponseContainsForbiddenKeys(polluted)).toBe(true);
    for (const forbidden of DESIGN_PARTNER_LIFECYCLE_AUDIT_FORBIDDEN_RESPONSE_KEYS) {
      expect(lifecycleAuditResponseContainsForbiddenKeys({
        application_id: APPLICATION_ID,
        events: [],
        next_cursor: null,
        [forbidden]: "leak",
      })).toBe(true);
    }
  });
});
