// FILE: lib/integrations/designPartnerApplicationIntake.test.ts

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  DESIGN_PARTNER_APPLY_HONEYPOT_FIELD,
  DESIGN_PARTNER_APPLY_MAX_BODY_BYTES,
  escapePostgrestIlikePattern,
  findRecentDuplicateDesignPartnerApplication,
  normalizeCompanyForDedupComparison,
  normalizeEmailForDedupComparison,
  normalizeEmailForStorage,
  parseDesignPartnerApplicationBody,
  parseDesignPartnerApplicationFields,
  readBoundedJsonBody,
  validateDesignPartnerApplicationEnvelope,
  validateOptionalWebsiteUrl,
} from "./designPartnerApplicationIntake";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    company: "Acme Protocol",
    email: "Partner@Example.COM",
    integration_type: "passport_gate",
    public_name_ok: false,
    ...overrides,
  };
}

describe("escapePostgrestIlikePattern", () => {
  it("escapes percent, underscore, and backslash", () => {
    expect(escapePostgrestIlikePattern("100% Labs")).toBe("100\\% Labs");
    expect(escapePostgrestIlikePattern("foo_bar")).toBe("foo\\_bar");
    expect(escapePostgrestIlikePattern("a\\b")).toBe("a\\\\b");
  });
});

describe("email normalization", () => {
  it("preserves local part and lowercases domain for storage", () => {
    expect(normalizeEmailForStorage("Partner+tag@Example.COM")).toBe("Partner+tag@example.com");
  });

  it("case-folds full address only for dedup comparison", () => {
    expect(normalizeEmailForDedupComparison("Partner+tag@Example.COM")).toBe("partner+tag@example.com");
  });
});

describe("parseDesignPartnerApplicationBody", () => {
  it("accepts required fields only with optional defaults", () => {
    const parsed = parseDesignPartnerApplicationBody(validPayload());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.action !== "insert") throw new Error("expected insert");
    expect(parsed.row.company).toBe("Acme Protocol");
    expect(parsed.row.email).toBe("Partner@example.com");
    expect(parsed.row.contact_name).toBeNull();
    expect(parsed.row.website).toBeNull();
    expect(parsed.row.use_case).toBeNull();
    expect(parsed.row.monthly_volume).toBeNull();
    expect(parsed.row.integration_type).toBe("passport_gate");
    expect(parsed.row.public_name_ok).toBe(false);
  });

  it("keeps optional fields optional when blank", () => {
    const parsed = parseDesignPartnerApplicationBody(validPayload({
      contact_name: "  ",
      website: "",
      use_case: "",
      monthly_volume: " ",
    }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.action !== "insert") throw new Error("expected insert");
    expect(parsed.row.contact_name).toBeNull();
    expect(parsed.row.website).toBeNull();
    expect(parsed.row.use_case).toBeNull();
    expect(parsed.row.monthly_volume).toBeNull();
  });

  it("validates optional fields when supplied", () => {
    const parsed = parseDesignPartnerApplicationBody(validPayload({
      contact_name: "Alex",
      website: "https://acme.example",
      use_case: "Age-gated checkout pilot",
      monthly_volume: "500 / month",
    }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.action !== "insert") throw new Error("expected insert");
    expect(parsed.row.contact_name).toBe("Alex");
    expect(parsed.row.website).toBe("https://acme.example/");
    expect(parsed.row.use_case).toBe("Age-gated checkout pilot");
    expect(parsed.row.monthly_volume).toBe("500 / month");
  });

  it("defaults integration_type when missing", () => {
    const body = validPayload();
    delete (body as { integration_type?: string }).integration_type;
    const parsed = parseDesignPartnerApplicationBody(body);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.action !== "insert") throw new Error("expected insert");
    expect(parsed.row.integration_type).toBe("passport_gate");
  });

  it("rejects unknown keys and invalid integration types", () => {
    expect(parseDesignPartnerApplicationBody({ ...validPayload(), extra: true }).ok).toBe(false);
    expect(parseDesignPartnerApplicationBody(validPayload({ integration_type: "unknown" })).ok).toBe(false);
    expect(parseDesignPartnerApplicationBody(validPayload({ public_name_ok: "true" })).ok).toBe(false);
  });

  it("discards honeypot submissions", () => {
    const parsed = parseDesignPartnerApplicationBody(validPayload({
      [DESIGN_PARTNER_APPLY_HONEYPOT_FIELD]: "filled",
    }));
    expect(parsed).toEqual({ ok: true, action: "discard" });
  });

  it("validates envelope before field parsing", () => {
    expect(validateDesignPartnerApplicationEnvelope({ extra: true })).toEqual({ ok: false });
    expect(validateDesignPartnerApplicationEnvelope(validPayload({
      [DESIGN_PARTNER_APPLY_HONEYPOT_FIELD]: "bot",
    }))).toEqual({ ok: true, action: "honeypot" });
    expect(validateDesignPartnerApplicationEnvelope(validPayload())).toEqual({ ok: true, action: "continue" });
    expect(parseDesignPartnerApplicationFields({ company: "A" })).toEqual({ ok: false });
  });

  it("normalizes dedup values without storing email_dedup column", () => {
    const parsed = parseDesignPartnerApplicationBody(validPayload({
      company: "  Acme   Protocol ",
      email: "Partner@Example.COM",
    }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.action !== "insert") throw new Error("expected insert");
    expect(parsed.emailDedupNorm).toBe("partner@example.com");
    expect(parsed.companyDedupNorm).toBe("acme protocol");
    expect(parsed.row.email).toBe("Partner@example.com");
  });

  it("escapes LIKE metacharacters in dedup norms for downstream query", () => {
    const company = "100% Wild_card Co";
    const parsed = parseDesignPartnerApplicationBody(validPayload({ company }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.action !== "insert") throw new Error("expected insert");
    expect(escapePostgrestIlikePattern(parsed.companyDedupNorm)).toBe("100\\% wild\\_card co");
  });
});

describe("validateOptionalWebsiteUrl", () => {
  it("rejects http outside localhost in production mode", () => {
    expect(validateOptionalWebsiteUrl("http://evil.com", { productionWebsite: true }).ok).toBe(false);
    expect(validateOptionalWebsiteUrl("https://acme.example", { productionWebsite: true }).ok).toBe(true);
  });

  it("allows localhost http in non-production mode", () => {
    expect(validateOptionalWebsiteUrl("http://localhost:3000", { productionWebsite: false }).ok).toBe(true);
  });
});

describe("readBoundedJsonBody", () => {
  it("rejects oversized Content-Length early", async () => {
    const req = new NextRequest("http://localhost/api/integrations/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(DESIGN_PARTNER_APPLY_MAX_BODY_BYTES + 1),
      },
      body: "{}",
    });
    const result = await readBoundedJsonBody(req);
    expect(result.ok).toBe(false);
  });

  it("rejects chunked body without Content-Length once cap exceeded", async () => {
    const chunkSize = 5000;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(chunkSize));
        controller.enqueue(new Uint8Array(chunkSize));
        controller.enqueue(new Uint8Array(chunkSize));
        controller.close();
      },
    });
    const req = {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: {
        getReader: () => stream.getReader(),
      },
    } as unknown as NextRequest;

    const result = await readBoundedJsonBody(req);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid UTF-8", async () => {
    const req = new NextRequest("http://localhost/api/integrations/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: new Uint8Array([0xff, 0xfe, 0xfd]),
    });
    const result = await readBoundedJsonBody(req);
    expect(result.ok).toBe(false);
  });
});

describe("findRecentDuplicateDesignPartnerApplication", () => {
  it("queries existing columns with escaped ilike patterns and minimal select", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "app-1" }, error: null });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });
    const ilikeCompany = vi.fn().mockReturnValue({ order });
    const ilikeEmail = vi.fn().mockReturnValue({ ilike: ilikeCompany });
    const gte = vi.fn().mockReturnValue({ ilike: ilikeEmail });
    const inStatus = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ in: inStatus });
    const from = vi.fn().mockReturnValue({ select });

    const sb = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await findRecentDuplicateDesignPartnerApplication(sb, {
      emailDedupNorm: "partner+tag@example.com",
      companyDedupNorm: "100% wild_card co",
      windowHours: 168,
      nowMs: Date.parse("2026-01-08T00:00:00.000Z"),
    });

    expect(from).toHaveBeenCalledWith("design_partners");
    expect(select).toHaveBeenCalledWith("id");
    expect(inStatus).toHaveBeenCalledWith("status", ["submitted", "approved", "onboarded"]);
    expect(gte).toHaveBeenCalledWith("created_at", "2026-01-01T00:00:00.000Z");
    expect(ilikeEmail).toHaveBeenCalledWith("email", "partner+tag@example.com");
    expect(ilikeCompany).toHaveBeenCalledWith("company", "100\\% wild\\_card co");
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toEqual({ duplicate: true, id: "app-1" });
  });

  it("treats query errors as non-duplicate best-effort", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });
    const ilikeCompany = vi.fn().mockReturnValue({ order });
    const ilikeEmail = vi.fn().mockReturnValue({ ilike: ilikeCompany });
    const gte = vi.fn().mockReturnValue({ ilike: ilikeEmail });
    const inStatus = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ in: inStatus });
    const from = vi.fn().mockReturnValue({ select });
    const sb = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await findRecentDuplicateDesignPartnerApplication(sb, {
      emailDedupNorm: "a@b.com",
      companyDedupNorm: "acme",
    });
    expect(result).toEqual({ duplicate: false });
  });
});

describe("normalizeCompanyForDedupComparison", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeCompanyForDedupComparison("  Foo   Bar  ")).toBe("foo bar");
  });
});
