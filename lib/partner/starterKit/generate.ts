// FILE: lib/partner/starterKit/generate.ts
// Build a copyable starter kit. No live credentials. No archive path traversal.

import { studioPackContract } from "@/lib/partner/integrationStudio/catalog";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
import {
  STARTER_KIT_DOES_NOT_DO,
  STARTER_KIT_NOTICES,
  STARTER_KIT_VERSION,
} from "./contract";
import { buildStarterKitFiles } from "./files";
import type { ValidStarterKitSelection } from "./validate";

export interface StarterKitResult {
  ok: true;
  version: typeof STARTER_KIT_VERSION;
  filename: string;
  pack_id: string;
  path: string;
  runtime: string;
  capabilities: string[];
  files: Array<{ path: string; contents: string }>;
  bundle: string;
  does_not_do: typeof STARTER_KIT_DOES_NOT_DO;
  notices: typeof STARTER_KIT_NOTICES;
  disclosed_result: string;
}

export function generateStarterKit(selection: ValidStarterKitSelection): StarterKitResult | { ok: false; code: "redacted" } {
  const pack = studioPackContract(selection.pack_id);
  if (!pack) return { ok: false, code: "redacted" };
  const files = buildStarterKitFiles(selection);
  const filename = `abraxas-starter-${selection.path}-${selection.runtime}.txt`;
  const bundle = files
    .map((file) => `===== ${file.path} =====\n${file.contents}`)
    .join("\n");
  const result: StarterKitResult = {
    ok: true,
    version: STARTER_KIT_VERSION,
    filename,
    pack_id: selection.pack_id,
    path: selection.path,
    runtime: selection.runtime,
    capabilities: [...selection.capabilities],
    files,
    bundle,
    does_not_do: STARTER_KIT_DOES_NOT_DO,
    notices: STARTER_KIT_NOTICES,
    disclosed_result: pack.disclosed_result,
  };
  if (studioPayloadLeaks(result).length > 0) {
    return { ok: false, code: "redacted" };
  }
  return result;
}

