// FILE: lib/admin/designPartnerApplicationQueueCursor.test.ts

import { describe, expect, it } from "vitest";
import {
  buildDesignPartnerQueueKeysetOrFilter,
  canonicalizeQueueIsoTimestamp,
  canonicalizeQueueUuid,
  decodeDesignPartnerQueueCursor,
  encodeDesignPartnerQueueCursor,
  parseDesignPartnerQueueLimit,
  validateDesignPartnerQueueQuery,
} from "@/lib/admin/designPartnerApplicationQueueCursor";

const CREATED_AT = "2026-01-01T00:00:00.000Z";
const ROW_ID = "00000000-0000-4000-8000-000000000001";

describe("parseDesignPartnerQueueLimit", () => {
  it("defaults absent limit to 25", () => {
    expect(parseDesignPartnerQueueLimit(null)).toBe(25);
  });

  it.each(["0", "-1", "1.5", "+1", " 25", "25 ", "abc", "51", "999", "05", ""])(
    "rejects invalid supplied limit %j",
    (value) => {
      expect(parseDesignPartnerQueueLimit(value)).toBe("invalid");
    },
  );

  it.each(["1", "25", "50"])("accepts valid supplied limit %j", (value) => {
    expect(parseDesignPartnerQueueLimit(value)).toBe(Number(value));
  });
});

describe("encodeDesignPartnerQueueCursor", () => {
  it("round-trips canonical cursor fields", () => {
    const encoded = encodeDesignPartnerQueueCursor("submitted", CREATED_AT, ROW_ID);
    const decoded = decodeDesignPartnerQueueCursor(encoded);
    expect(decoded).toEqual({
      version: 1,
      filter: "submitted",
      createdAt: CREATED_AT,
      id: ROW_ID,
    });
  });

  it("does not embed applicant PII in encoded cursor", () => {
    const encoded = encodeDesignPartnerQueueCursor("submitted", CREATED_AT, ROW_ID);
    expect(encoded).not.toContain("@");
    expect(encoded).not.toContain("Acme");
    expect(encoded).not.toContain("ops@");
  });

  it("always emits canonical timestamp and lowercase uuid", () => {
    const encoded = encodeDesignPartnerQueueCursor(
      "approved",
      CREATED_AT,
      "00000000-0000-4000-8000-000000000001".toUpperCase(),
    );
    const decoded = decodeDesignPartnerQueueCursor(encoded);
    expect(decoded).not.toBe("invalid_cursor");
    if (decoded !== "invalid_cursor") {
      expect(decoded.createdAt).toBe(CREATED_AT);
      expect(decoded.id).toBe(ROW_ID);
    }
  });
});

describe("decodeDesignPartnerQueueCursor malformed cases", () => {
  it("rejects malformed base64", () => {
    expect(decodeDesignPartnerQueueCursor("%%%")).toBe("invalid_cursor");
  });

  it("rejects malformed JSON", () => {
    const encoded = Buffer.from("{not-json").toString("base64url");
    expect(decodeDesignPartnerQueueCursor(encoded)).toBe("invalid_cursor");
  });

  it("rejects extra JSON keys", () => {
    const encoded = Buffer.from(JSON.stringify({
      v: 1,
      f: "submitted",
      c: CREATED_AT,
      i: ROW_ID,
      extra: true,
    })).toString("base64url");
    expect(decodeDesignPartnerQueueCursor(encoded)).toBe("invalid_cursor");
  });

  it("rejects loose timestamp forms", () => {
    const encoded = Buffer.from(JSON.stringify({
      v: 1,
      f: "submitted",
      c: "2026-01-01 00:00:00.000Z",
      i: ROW_ID,
    })).toString("base64url");
    expect(decodeDesignPartnerQueueCursor(encoded)).toBe("invalid_cursor");
  });

  it("rejects invalid UUID values", () => {
    const encoded = Buffer.from(JSON.stringify({
      v: 1,
      f: "submitted",
      c: CREATED_AT,
      i: "not-a-uuid",
    })).toString("base64url");
    expect(decodeDesignPartnerQueueCursor(encoded)).toBe("invalid_cursor");
  });

  it("rejects version mismatch", () => {
    const encoded = Buffer.from(JSON.stringify({
      v: 2,
      f: "submitted",
      c: CREATED_AT,
      i: ROW_ID,
    })).toString("base64url");
    expect(decodeDesignPartnerQueueCursor(encoded)).toBe("invalid_cursor");
  });

  it("accepts structurally valid modified ordering values as an unsigned position token", () => {
    const modified = encodeDesignPartnerQueueCursor(
      "submitted",
      "2025-12-31T23:59:59.999Z",
      "00000000-0000-4000-8000-000000000099",
    );
    const decoded = decodeDesignPartnerQueueCursor(modified);
    expect(decoded).not.toBe("invalid_cursor");
    if (decoded !== "invalid_cursor") {
      expect(decoded.createdAt).toBe("2025-12-31T23:59:59.999Z");
      expect(decoded.id).toBe("00000000-0000-4000-8000-000000000099");
    }
  });
});

describe("validateDesignPartnerQueueQuery", () => {
  it("rejects unknown query parameters", () => {
    const params = new URLSearchParams("status=submitted&company=Acme");
    expect(validateDesignPartnerQueueQuery(params)).toEqual({ ok: false, code: "invalid_input" });
  });

  it("rejects repeated limit parameters", () => {
    const params = new URLSearchParams("status=submitted&limit=25&limit=25");
    expect(validateDesignPartnerQueueQuery(params)).toEqual({ ok: false, code: "invalid_input" });
  });

  it("rejects cursor filter mismatch", () => {
    const cursor = encodeDesignPartnerQueueCursor("submitted", CREATED_AT, ROW_ID);
    const params = new URLSearchParams(`status=approved&cursor=${cursor}`);
    expect(validateDesignPartnerQueueQuery(params)).toEqual({ ok: false, code: "invalid_cursor" });
  });

  it("accepts first-page query without cursor", () => {
    const params = new URLSearchParams("status=rejected");
    const result = validateDesignPartnerQueueQuery(params);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.limit).toBe(25);
      expect(result.value.cursor).toBeNull();
    }
  });
});

describe("buildDesignPartnerQueueKeysetOrFilter", () => {
  it("builds the exact PostgREST keyset expression", () => {
    expect(buildDesignPartnerQueueKeysetOrFilter(CREATED_AT, ROW_ID)).toBe(
      'created_at.lt."2026-01-01T00:00:00.000Z",and(created_at.eq."2026-01-01T00:00:00.000Z",id.lt."00000000-0000-4000-8000-000000000001")',
    );
  });

  it("canonicalizes helpers consistently", () => {
    expect(canonicalizeQueueIsoTimestamp(CREATED_AT)).toBe(CREATED_AT);
    expect(canonicalizeQueueUuid(ROW_ID.toUpperCase())).toBe(ROW_ID);
  });
});
