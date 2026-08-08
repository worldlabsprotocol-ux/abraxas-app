import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import {
  buildOpaqueCaptureStoragePath,
  buildOpaqueStampUploadPath,
  opaqueStoragePathHasNoPii,
} from "@/lib/idv/passportDocumentStoragePath";

const SESSION = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("passportDocumentStoragePath", () => {
  it("builds opaque capture paths without email or subject identifiers", () => {
    const path = buildOpaqueCaptureStoragePath({
      captureSessionId: SESSION,
      documentType: "id_front",
      contentType: "image/jpeg",
    });

    expect(path).toBe(`identity/v2/${SESSION}/id_front.jpg`);
    expect(path).not.toContain("@");
    expect(path).not.toContain("0x");
    expect(opaqueStoragePathHasNoPii(path, ["user@example.com", "0xabc"])).toBe(true);
  });

  it("rejects paths containing email-like strings or forbidden segments", () => {
    const path = buildOpaqueCaptureStoragePath({
      captureSessionId: SESSION,
      documentType: "selfie",
      contentType: "image/png",
    });

    expect(opaqueStoragePathHasNoPii(path)).toBe(true);
    expect(opaqueStoragePathHasNoPii("identity/user_example_com/session/selfie.jpg")).toBe(false);
    expect(opaqueStoragePathHasNoPii(path, ["holder@example.com"])).toBe(true);
    expect(opaqueStoragePathHasNoPii("identity/user_example_com/session/id_front.jpg", ["holder@example.com"])).toBe(false);
    expect(opaqueStoragePathHasNoPii(`identity/v2/${SESSION}/id_front.jpg`, ["a1b2c3d4"])).toBe(false);
  });

  it("builds opaque stamp upload paths with random session ids", () => {
    const uploadSessionId = randomUUID();
    const path = buildOpaqueStampUploadPath({
      stampId: "identity",
      uploadSessionId,
      originalFileName: "passport scan.jpg",
    });

    expect(path).toMatch(/^identity\/v2\/[0-9a-f-]{36}\/passport_scan\.jpg$/i);
    expect(opaqueStoragePathHasNoPii(path, ["user@example.com"])).toBe(true);
  });

  it("flags legacy email-based paths as non-opaque for new writes", () => {
    expect(opaqueStoragePathHasNoPii("identity/user_example_com/session/id_front.jpg")).toBe(false);
    expect(opaqueStoragePathHasNoPii("identity/v2/a1b2c3d4-e5f6-4789-a012-3456789abcde/id_front.jpg")).toBe(true);
  });
});
