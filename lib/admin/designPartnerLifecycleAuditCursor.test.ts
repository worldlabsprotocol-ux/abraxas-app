// FILE: lib/admin/designPartnerLifecycleAuditCursor.test.ts

import { describe, expect, it } from "vitest";
import {
  canonicalizeLifecycleAuditIsoTimestamp,
  canonicalizeLifecycleAuditUuid,
  decodeDesignPartnerLifecycleAuditCursor,
  encodeDesignPartnerLifecycleAuditCursor,
  parseDesignPartnerLifecycleAuditLimit,
  validateDesignPartnerLifecycleAuditQuery,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_ENCODED_LENGTH,
} from "@/lib/admin/designPartnerLifecycleAuditCursor";

const APPLICATION_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_APPLICATION_ID = "00000000-0000-4000-8000-000000000002";
const OCCURRED_AT = "2026-01-01T00:00:00.000Z";
const ROW_ID = "10000000-0000-4000-8000-000000000003";

describe("parseDesignPartnerLifecycleAuditLimit", () => {
  it("defaults absent limit to 25", () => {
    expect(parseDesignPartnerLifecycleAuditLimit(null)).toBe(25);
  });

  it.each(["0", "26", "-1", "1.5", "+1", " 25", "25 ", "abc", "999", "05", ""])(
    "rejects invalid supplied limit %j",
    (value) => {
      expect(parseDesignPartnerLifecycleAuditLimit(value)).toBe("invalid");
    },
  );

  it.each(["1", "25"])("accepts valid supplied limit %j", (value) => {
    expect(parseDesignPartnerLifecycleAuditLimit(value)).toBe(Number(value));
  });
});

describe("encodeDesignPartnerLifecycleAuditCursor", () => {
  it("round-trips canonical cursor fields", () => {
    const encoded = encodeDesignPartnerLifecycleAuditCursor(APPLICATION_ID, OCCURRED_AT, ROW_ID);
    const decoded = decodeDesignPartnerLifecycleAuditCursor(encoded);
    expect(decoded).toEqual({
      version: 1,
      applicationId: APPLICATION_ID,
      occurredAt: OCCURRED_AT,
      id: ROW_ID,
    });
  });

  it("uses exact payload keys only", () => {
    const encoded = encodeDesignPartnerLifecycleAuditCursor(APPLICATION_ID, OCCURRED_AT, ROW_ID);
    const decodedJson = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Record<string, unknown>;
    expect(Object.keys(decodedJson).sort()).toEqual(["a", "i", "o", "v"]);
  });

  it("does not embed applicant PII in encoded cursor", () => {
    const encoded = encodeDesignPartnerLifecycleAuditCursor(APPLICATION_ID, OCCURRED_AT, ROW_ID);
    expect(encoded).not.toContain("@");
    expect(encoded).not.toContain("Acme");
    expect(encoded).not.toContain("ops@");
  });

  it("always emits canonical timestamp and lowercase uuid", () => {
    const encoded = encodeDesignPartnerLifecycleAuditCursor(
      APPLICATION_ID,
      OCCURRED_AT,
      ROW_ID,
    );
    const decoded = decodeDesignPartnerLifecycleAuditCursor(encoded);
    expect(decoded).not.toBe("invalid_cursor");
    if (decoded !== "invalid_cursor") {
      expect(decoded.occurredAt).toBe(OCCURRED_AT);
      expect(decoded.id).toBe(ROW_ID);
      expect(decoded.applicationId).toBe(APPLICATION_ID);
    }
  });
});

describe("decodeDesignPartnerLifecycleAuditCursor malformed cases", () => {
  it("rejects encoded strings over the length bound before decode", () => {
    const oversized = "a".repeat(DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_ENCODED_LENGTH + 1);
    expect(decodeDesignPartnerLifecycleAuditCursor(oversized)).toBe("invalid_cursor");
  });

  it("rejects malformed base64", () => {
    expect(decodeDesignPartnerLifecycleAuditCursor("%%%")).toBe("invalid_cursor");
  });

  it("rejects malformed JSON", () => {
    const encoded = Buffer.from("{not-json").toString("base64url");
    expect(decodeDesignPartnerLifecycleAuditCursor(encoded)).toBe("invalid_cursor");
  });

  it("rejects extra JSON keys", () => {
    const encoded = Buffer.from(JSON.stringify({
      v: 1,
      a: APPLICATION_ID,
      o: OCCURRED_AT,
      i: ROW_ID,
      extra: "nope",
    })).toString("base64url");
    expect(decodeDesignPartnerLifecycleAuditCursor(encoded)).toBe("invalid_cursor");
  });

  it("rejects tampered version", () => {
    const encoded = Buffer.from(JSON.stringify({
      v: 2,
      a: APPLICATION_ID,
      o: OCCURRED_AT,
      i: ROW_ID,
    })).toString("base64url");
    expect(decodeDesignPartnerLifecycleAuditCursor(encoded)).toBe("invalid_cursor");
  });

  it("rejects non-canonical timestamps", () => {
    const encoded = Buffer.from(JSON.stringify({
      v: 1,
      a: APPLICATION_ID,
      o: "2026-01-01T00:00:00Z",
      i: ROW_ID,
    })).toString("base64url");
    expect(decodeDesignPartnerLifecycleAuditCursor(encoded)).toBe("invalid_cursor");
  });

  it("rejects uppercase UUIDs in payload", () => {
    const encoded = Buffer.from(JSON.stringify({
      v: 1,
      a: APPLICATION_ID,
      o: OCCURRED_AT,
      i: "10000000-0000-4000-8000-00000000000a".toUpperCase(),
    })).toString("base64url");
    expect(decodeDesignPartnerLifecycleAuditCursor(encoded)).toBe("invalid_cursor");
  });
});

describe("validateDesignPartnerLifecycleAuditQuery", () => {
  it("binds cursor application id to path application id", () => {
    const cursor = encodeDesignPartnerLifecycleAuditCursor(OTHER_APPLICATION_ID, OCCURRED_AT, ROW_ID);
    const params = new URLSearchParams({ cursor });
    const result = validateDesignPartnerLifecycleAuditQuery(params, APPLICATION_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_cursor");
    }
  });

  it("rejects unknown and repeated query parameters", () => {
    const unknown = validateDesignPartnerLifecycleAuditQuery(
      new URLSearchParams("limit=25&status=submitted"),
      APPLICATION_ID,
    );
    expect(unknown.ok).toBe(false);

    const repeated = validateDesignPartnerLifecycleAuditQuery(
      new URLSearchParams("limit=25&limit=10"),
      APPLICATION_ID,
    );
    expect(repeated.ok).toBe(false);
  });

  it("accepts valid cursor for matching application", () => {
    const cursor = encodeDesignPartnerLifecycleAuditCursor(APPLICATION_ID, OCCURRED_AT, ROW_ID);
    const result = validateDesignPartnerLifecycleAuditQuery(
      new URLSearchParams({ cursor, limit: "10" }),
      APPLICATION_ID,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.limit).toBe(10);
      expect(result.value.cursor?.id).toBe(ROW_ID);
    }
  });
});

describe("canonical helpers", () => {
  it("canonicalizes lifecycle audit timestamps and uuids", () => {
    expect(canonicalizeLifecycleAuditIsoTimestamp(OCCURRED_AT)).toBe(OCCURRED_AT);
    expect(canonicalizeLifecycleAuditIsoTimestamp("2026-01-01T00:00:00Z")).toBeNull();
    expect(canonicalizeLifecycleAuditUuid(ROW_ID.toUpperCase())).toBe(ROW_ID);
  });
});
