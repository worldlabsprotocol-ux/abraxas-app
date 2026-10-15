#!/usr/bin/env npx tsx
// FILE: scripts/build-582/production-activation-boundary-report.ts

import { buildProductionActivationBoundaryReport } from "@/lib/passport/build582/productionActivationBoundary";

console.log(JSON.stringify(buildProductionActivationBoundaryReport(process.env), null, 2));
