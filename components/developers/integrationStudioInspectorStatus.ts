// FILE: components/developers/integrationStudioInspectorStatus.ts

export type IntegrationInspectorLoadState =
  | "no_application"
  | "auth_required"
  | "loading"
  | "health_error"
  | "data_unavailable"
  | "loaded";

export function resolveIntegrationInspectorLoadState(input: {
  applicationId: string | null;
  signedIn: boolean;
  loading: boolean;
  healthError: string;
  health: unknown | null;
}): IntegrationInspectorLoadState {
  if (!input.applicationId) return "no_application";
  if (!input.signedIn) return "auth_required";
  if (input.loading) return "loading";
  if (input.healthError) return "health_error";
  if (input.health) return "loaded";
  return "data_unavailable";
}

export function integrationInspectorStatusMessage(state: IntegrationInspectorLoadState): string | null {
  switch (state) {
    case "no_application":
      return "No sandbox application selected. Create or resume an application in the workspace to load backend diagnostics.";
    case "auth_required":
      return "Sandbox API key sign-in required before live integration health can load.";
    case "loading":
      return "Loading integration health from Launchpad…";
    case "health_error":
      return null;
    case "data_unavailable":
      return "Integration health data unavailable. Retry after sign-in or select a sandbox application.";
    case "loaded":
      return "Live integration health loaded from Launchpad.";
    default:
      return null;
  }
}
