// FILE: lib/admin/designPartnerApplicationDetail.test.ts

import { describe, expect, it } from "vitest";
import {
  DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS,
  isDesignPartnerApplicationAdminDto,
  parseDesignPartnerApplicationListResponse,
} from "@/lib/admin/designPartnerApplicationDetailContract";
import {
  classifyDesignPartnerWebsiteDisplay,
  DESIGN_PARTNER_WEBSITE_INERT_WARNING,
  DESIGN_PARTNER_WEBSITE_SAFE_LINK_LABEL,
} from "@/lib/admin/designPartnerApplicationWebsiteDisplay";
import {
  mapDesignPartnerApplicationRow,
  mapDesignPartnerApplicationRows,
} from "@/lib/admin/designPartnerApplicationDetail";

const BASE_ROW = {
  id: "app-1",
  promoted_partner_id: null,
  reviewer_notes: null,
  company: "Acme",
  contact_name: "Ops",
  email: "ops@example.com",
  website: "https://example.com/path?x=1",
  integration_type: "passport_gate",
  use_case: "Sandbox",
  monthly_volume: "low",
  public_name_ok: false,
  status: "submitted",
  created_at: "2026-01-01T00:00:00.000Z",
  reviewed_at: null,
};

describe("mapDesignPartnerApplicationRow", () => {
  it("projects only allowlisted DTO fields", () => {
    const dto = mapDesignPartnerApplicationRow({
      ...BASE_ROW,
      proof_id: "secret-proof",
      extra: "nope",
    } as typeof BASE_ROW & Record<string, unknown>);
    expect(dto).not.toBeNull();
    expect(Object.keys(dto!).sort()).toEqual([...DESIGN_PARTNER_APPLICATION_ADMIN_DTO_KEYS].sort());
    expect(isDesignPartnerApplicationAdminDto(dto)).toBe(true);
  });

  it("parses strict list responses", () => {
    const response = parseDesignPartnerApplicationListResponse({
      applications: mapDesignPartnerApplicationRows([BASE_ROW]),
    });
    expect(response.applications).toHaveLength(1);
  });

  it("rejects list responses with extra keys", () => {
    expect(() => parseDesignPartnerApplicationListResponse({
      applications: [{ ...mapDesignPartnerApplicationRow(BASE_ROW)!, extra: true }],
    })).toThrow();
  });
});

describe("classifyDesignPartnerWebsiteDisplay", () => {
  it("allows syntactically allowed external HTTPS hostname with path and query", () => {
    const result = classifyDesignPartnerWebsiteDisplay("https://example.com/path?x=1");
    expect(result.mode).toBe("safe_link");
    expect(result.href).toBe("https://example.com/path?x=1");
  });

  it("allows internationalized hostname without claiming verification", () => {
    const result = classifyDesignPartnerWebsiteDisplay("https://xn--mnchen-3ya.de/partner");
    expect(result.mode).toBe("safe_link");
    expect(result.href).toMatch(/^https:\/\/xn--mnchen-3ya\.de\/partner/);
  });

  const inertCases: Array<{ name: string; input: string }> = [
    { name: "localhost", input: "https://localhost" },
    { name: "localhost dot", input: "https://localhost." },
    { name: "sub.localhost", input: "https://sub.localhost" },
    { name: "example.local", input: "https://example.local" },
    { name: "corp.internal", input: "https://corp.internal" },
    { name: "device.home", input: "https://device.home" },
    { name: "printer.lan", input: "https://printer.lan" },
    { name: "lab.test", input: "https://lab.test" },
    { name: "ipv4 dotted", input: "https://127.0.0.1" },
    { name: "decimal localhost", input: "https://2130706433" },
    { name: "hex localhost", input: "https://0x7f000001" },
    { name: "ipv6 loopback", input: "https://[::1]/" },
    { name: "ipv6 unique local", input: "https://[fc00::1]/" },
    { name: "ipv6 link local", input: "https://[fe80::1]/" },
    { name: "credentialed", input: "https://user:pass@example.com" },
    { name: "fragment", input: "https://example.com#frag" },
    { name: "control char", input: "https://exam\tple.com" },
    { name: "whitespace", input: "https://example .com" },
    { name: "javascript", input: "javascript:alert(1)" },
    { name: "http", input: "http://example.com" },
  ];

  it.each(inertCases)("marks $name as inert_unsafe", ({ input }) => {
    const result = classifyDesignPartnerWebsiteDisplay(input);
    expect(result.mode).toBe("inert_unsafe");
    expect(result.warning).toBe(DESIGN_PARTNER_WEBSITE_INERT_WARNING);
    expect(result.href).toBeUndefined();
  });

  it("uses fixed safe link label copy in component contract", () => {
    expect(DESIGN_PARTNER_WEBSITE_SAFE_LINK_LABEL).toBe("Open applicant-provided HTTPS website");
  });
});
