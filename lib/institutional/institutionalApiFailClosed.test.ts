import { describe, expect, it } from "vitest";
import { institutionalApiFailClosedResponse, withInstitutionalApiFailClosed } from "@/lib/institutional/institutionalApiFailClosed";

describe("institutionalApiFailClosed", () => {
  it("returns structured JSON without stack traces", async () => {
    const res = institutionalApiFailClosedResponse({ code: "institutional_handler_error" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("institutional_handler_error");
    expect(JSON.stringify(body)).not.toMatch(/stack|Error:/);
  });

  it("wraps thrown handler errors", async () => {
    const res = await withInstitutionalApiFailClosed(async () => {
      throw new Error("secret-db-connection-string");
    });
    expect(res).toBeInstanceOf(Response);
    const json = await (res as Response).json();
    expect(json.code).toBe("institutional_handler_error");
    expect(JSON.stringify(json)).not.toContain("secret-db");
  });
});
