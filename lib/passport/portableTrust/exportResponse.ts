// FILE: lib/passport/portableTrust/exportResponse.ts

import type { HolderPortablePresentationExport } from "./contract";

/** Public export payload — no internal receipt fields beyond the documented bundle. */
export function toPortableExportResponse(bundle: HolderPortablePresentationExport) {
  return { bundle };
}
