import { describe, expect, it } from "vitest";
import { resolveBuilderJourneyView } from "@/lib/developers/builderIntegrationJourneyUi";

describe("builderIntegrationJourneyUi", () => {
  it("requires stack selection for website before file download", () => {
    const view = resolveBuilderJourneyView({
      platform: "website",
      platformLabel: "Website",
      integrationStack: null,
      filesReady: false,
      acceptancePhase: null,
      setupComplete: false,
    });
    expect(view.primaryAction).toBe("choose_stack");
    expect(view.primaryLabel).not.toMatch(/connect/i);
  });

  it("labels download as file preparation not connection verified", () => {
    const view = resolveBuilderJourneyView({
      platform: "website",
      platformLabel: "Website",
      integrationStack: "nextjs",
      filesReady: false,
      acceptancePhase: null,
      setupComplete: false,
    });
    expect(view.primaryAction).toBe("get_files");
    expect(view.primaryLabel).toBe("Get integration files");
    expect(view.connectionVerified).toBe(false);
  });

  it("does not mark complete when only files are ready", () => {
    const view = resolveBuilderJourneyView({
      platform: "application",
      platformLabel: "Application",
      integrationStack: null,
      filesReady: true,
      acceptancePhase: "integration_files_ready",
      setupComplete: false,
    });
    expect(view.connectionVerified).toBe(false);
    expect(view.headline).toBe("Add Abraxas to your site");
  });

  it("shows verified headline only with setup complete", () => {
    const view = resolveBuilderJourneyView({
      platform: "application",
      platformLabel: "Application",
      integrationStack: null,
      filesReady: true,
      acceptancePhase: "application_enforcement_confirmed",
      setupComplete: true,
    });
    expect(view.connectionVerified).toBe(true);
    expect(view.headline).toBe("Your application is verified");
  });
});
