// FILE: lib/partner/integrationStudio/index.ts

export {
  INTEGRATION_STUDIO_PATH,
  INTEGRATION_STUDIO_PATHS,
  INTEGRATION_STUDIO_CHECKLIST,
  INTEGRATION_STUDIO_PROVISION,
  INTEGRATION_STUDIO_GOOGLE,
  isIntegrationStudioPathId,
  type IntegrationStudioPathId,
} from "@/lib/partner/integrationStudio/contract";

export {
  studioPackContract,
  listStudioPackSummaries,
  studioPublicCatalog,
  type StudioPackContract,
} from "@/lib/partner/integrationStudio/catalog";

export { studioSnippetForPath, studioSnippetForApplication } from "@/lib/partner/integrationStudio/snippets";
export { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
