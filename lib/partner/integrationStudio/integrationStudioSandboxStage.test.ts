import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INTEGRATION_STUDIO_CALLBACK_FIELD_HELP,
  INTEGRATION_STUDIO_CREATE_SANDBOX_BUTTON,
  INTEGRATION_STUDIO_SANDBOX_STAGE_TITLE,
} from "@/lib/partner/integrationStudio/contract";

const ROOT = process.cwd();

describe("Integration Studio sandbox stage", () => {
  it("uses a single clear heading and primary CTA", () => {
    expect(INTEGRATION_STUDIO_SANDBOX_STAGE_TITLE).toBe("Create your sandbox");
    expect(INTEGRATION_STUDIO_CREATE_SANDBOX_BUTTON).toBe("Create sandbox");
    expect(INTEGRATION_STUDIO_CALLBACK_FIELD_HELP.toLowerCase()).toContain("redirect");
  });

  it("binds provision to selected policy pack and advances after create", () => {
    const client = readFileSync(
      join(ROOT, "app/developers/integration-studio/IntegrationStudioClient.tsx"),
      "utf8",
    );
    expect(client).toContain("policy_template_id: packId");
    expect(client).toContain("data.application.policy_template_id !== packId");
    expect(client).toContain('integrationStudioStageHref("configuration")');
    expect(client).not.toContain("Create ·");
    expect(client).toContain("INTEGRATION_STUDIO_SANDBOX_STAGE_TITLE");
  });
});
