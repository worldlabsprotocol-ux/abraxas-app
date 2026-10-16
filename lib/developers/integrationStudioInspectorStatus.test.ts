// FILE: lib/developers/integrationStudioInspectorStatus.test.ts

import { describe, expect, it } from "vitest";
import {
  integrationInspectorStatusMessage,
  resolveIntegrationInspectorLoadState,
} from "@/components/developers/integrationStudioInspectorStatus";

describe("integrationStudioInspectorStatus", () => {
  it("distinguishes empty, auth, loading, error, and loaded states", () => {
    expect(
      resolveIntegrationInspectorLoadState({
        applicationId: null,
        signedIn: false,
        loading: false,
        healthError: "",
        health: null,
      }),
    ).toBe("no_application");

    expect(
      resolveIntegrationInspectorLoadState({
        applicationId: "app_123",
        signedIn: false,
        loading: false,
        healthError: "",
        health: null,
      }),
    ).toBe("auth_required");

    expect(
      resolveIntegrationInspectorLoadState({
        applicationId: "app_123",
        signedIn: true,
        loading: true,
        healthError: "",
        health: null,
      }),
    ).toBe("loading");

    expect(
      resolveIntegrationInspectorLoadState({
        applicationId: "app_123",
        signedIn: true,
        loading: false,
        healthError: "denied",
        health: null,
      }),
    ).toBe("health_error");

    expect(
      resolveIntegrationInspectorLoadState({
        applicationId: "app_123",
        signedIn: true,
        loading: false,
        healthError: "",
        health: { checks: [] },
      }),
    ).toBe("loaded");

    expect(
      resolveIntegrationInspectorLoadState({
        applicationId: "app_123",
        signedIn: true,
        loading: false,
        healthError: "",
        health: null,
      }),
    ).toBe("data_unavailable");
  });

  it("does not claim live connectivity before loaded", () => {
    expect(integrationInspectorStatusMessage("loaded")).toMatch(/loaded from Launchpad/i);
    expect(integrationInspectorStatusMessage("no_application")).not.toMatch(/live/i);
  });
});
