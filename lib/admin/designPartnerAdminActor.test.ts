// FILE: lib/admin/designPartnerAdminActor.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  hasOnlyAllowlistedKeys,
  recordContainsForbiddenClientMutationFields,
  resolveDesignPartnerAdminActorCategory,
} from "@/lib/admin/designPartnerAdminActor";

const resolveAdminAccessMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  resolveAdminAccess: (...args: unknown[]) => resolveAdminAccessMock(...args),
}));

describe("resolveDesignPartnerAdminActorCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps authorized email access to admin_authorized_email", async () => {
    resolveAdminAccessMock.mockResolvedValue({ authorized: true, method: "email" });
    const category = await resolveDesignPartnerAdminActorCategory(new NextRequest("http://localhost"));
    expect(category).toBe("admin_authorized_email");
  });

  it("maps pin access to admin_pin", async () => {
    resolveAdminAccessMock.mockResolvedValue({ authorized: true, method: "pin_header" });
    const category = await resolveDesignPartnerAdminActorCategory(new NextRequest("http://localhost"));
    expect(category).toBe("admin_pin");
  });

  it("maps unknown access to admin_unknown", async () => {
    resolveAdminAccessMock.mockResolvedValue({ authorized: false, method: null });
    const category = await resolveDesignPartnerAdminActorCategory(new NextRequest("http://localhost"));
    expect(category).toBe("admin_unknown");
  });
});

describe("recordContainsForbiddenClientMutationFields", () => {
  it("rejects client-supplied actor and audit fields", () => {
    expect(recordContainsForbiddenClientMutationFields({
      id: "app-1",
      status: "approved",
      actor_category: "admin_pin",
    })).toBe(true);
    expect(recordContainsForbiddenClientMutationFields({
      application_id: "app-1",
      audit_event_id: "evt-1",
    })).toBe(true);
  });

  it("allows allowlisted mutation body keys only", () => {
    expect(recordContainsForbiddenClientMutationFields({
      id: "app-1",
      status: "approved",
    })).toBe(false);
  });
});

describe("hasOnlyAllowlistedKeys", () => {
  it("rejects unknown parsed object keys", () => {
    expect(hasOnlyAllowlistedKeys(
      { id: "app-1", status: "approved", company: "Acme" },
      ["id", "status"],
    )).toBe(false);
  });

  it("accepts exact allowlisted key sets", () => {
    expect(hasOnlyAllowlistedKeys(
      { id: "app-1", status: "approved" },
      ["id", "status", "reviewer_notes"],
    )).toBe(true);
  });
});
