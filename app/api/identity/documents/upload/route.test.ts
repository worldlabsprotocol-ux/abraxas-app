import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { suiAddress: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" },
  })),
}));

const uploadMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "sui_zklogin_identities") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { email: "holder@example.com" } }),
        };
      }
      if (table === "passport_documents") {
        return {
          insert: insertMock,
        };
      }
      return { select: vi.fn() };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
      })),
    },
  })),
}));

describe("POST /api/identity/documents/upload error sanitization", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    uploadMock.mockResolvedValue({ error: null });
    insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn(),
      }),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...env };
    vi.clearAllMocks();
  });

  it("does not expose storage bucket errors to the browser", async () => {
    uploadMock.mockResolvedValue({
      error: {
        message: 'Bucket not found: passport-documents SQLSTATE 42P01 relation "storage.objects"',
      },
    });

    const form = new FormData();
    form.set("file", new File(["bytes"], "id.jpg", { type: "image/jpeg" }));
    form.set("stampId", "identity");

    const res = await POST(new NextRequest("http://localhost/api/identity/documents/upload", {
      method: "POST",
      body: form,
    }));
    const body = await res.json();
    const serialized = JSON.stringify(body);

    expect(res.status).toBe(500);
    expect(body.error).toBe("document_upload_failed");
    expect(serialized).not.toMatch(/passport-documents|SQLSTATE|supabase/i);
  });

  it("does not expose metadata persistence errors to the browser", async () => {
    insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'insert into "passport_documents" violates foreign key SQLSTATE 23503',
          },
        }),
      }),
    });

    const form = new FormData();
    form.set("file", new File(["bytes"], "id.jpg", { type: "image/jpeg" }));
    form.set("stampId", "identity");

    const res = await POST(new NextRequest("http://localhost/api/identity/documents/upload", {
      method: "POST",
      body: form,
    }));
    const body = await res.json();
    const serialized = JSON.stringify(body);

    expect(res.status).toBe(500);
    expect(body.error).toBe("document_metadata_persistence_failed");
    expect(serialized).not.toMatch(/passport_documents|SQLSTATE|supabase/i);
  });
});
