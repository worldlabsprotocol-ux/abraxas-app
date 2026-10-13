#!/usr/bin/env npx tsx
// FILE: examples/institutional-relying-party/cli.ts
// Minimal external relying party CLI — synthetic sandbox, no Supabase.

import { readFileSync } from "node:fs";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546SampleRecord,
  build546PublicPartnerView,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";

function main() {
  Object.assign(process.env, build546TrustRegistryEnv());
  const args = process.argv.slice(2);
  const fixturePath = args[0];

  const record = fixturePath
    ? (JSON.parse(readFileSync(fixturePath, "utf8")) as ReturnType<typeof build546SampleRecord>)
    : build546SampleRecord();
  const pub = build546PublicPartnerView(record);

  const rp = new ExternalRelyingPartyHarness({
    partnerId: BUILD_546_PARTNER_ID,
    policyId: BUILD_546_POLICY_ID,
    env: build546TrustRegistryEnv(),
  });

  const decision = rp.decide({
    requestId: `cli-${Date.now()}`,
    signedRecord: record,
    publicReceipt: pub,
    now: BUILD_546_FIXTURE_NOW,
    revocationSource: { available: true, status: "active" },
  });

  console.log(JSON.stringify({ audit: decision, log: rp.getAuditLog() }, null, 2));
}

main();
