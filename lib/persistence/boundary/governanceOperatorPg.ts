// Next.js server boundary — governance operator DB must not load on receipt runtime or in the browser.
// Standalone institutional worker must never set ABRAXAS_GOVERNANCE_OPERATOR_PG_URL.

import "server-only";

export * from "./governanceOperatorPg.runtime";
