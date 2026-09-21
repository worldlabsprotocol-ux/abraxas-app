#!/usr/bin/env npx tsx
import { main } from "../lib/partner/testnetGateDeploymentKit/cli";

void main(process.argv.slice(2)).then((code) => process.exit(code));
