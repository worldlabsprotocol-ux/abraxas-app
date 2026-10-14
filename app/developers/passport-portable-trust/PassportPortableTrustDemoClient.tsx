"use client";

import { useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546SampleRecord,
} from "@/lib/institutionalCertification/build546/fixtures";
import { composeHolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { buildHolderPortableExport } from "@/lib/passport/portableTrust/presentationBundle";

const FONT = ABRAXAS_FONT_SANS;
const OTHER_PARTNER = "other-independent-rp";

export function PassportPortableTrustDemoClient() {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function push(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function runDemo() {
    setBusy(true);
    setLog([]);
    const signed = build546SampleRecord(undefined, { id: "dr_build565_demo" });
    const exported = buildHolderPortableExport({ record: signed });
    if (!exported.ok) {
      push(`Export failed: ${exported.code}`);
      setBusy(false);
      return;
    }
    push("1. Holder received signed authorization receipt (synthetic).");
    push("2. Passport composed policy-scoped presentation (no ID documents).");
    const verifyRes = await fetch("/api/passport/portable-trust/independent-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bundle: exported.bundle,
        request_id: "req_build565_demo",
      }),
    });
    const verify = (await verifyRes.json()) as { outcome?: string; failure_codes?: string[] };
    push(`3. Partner A independent verify → ${verify.outcome ?? "error"}`);
    const wrongAudience = composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: OTHER_PARTNER,
    });
    const badRes = await fetch("/api/passport/portable-trust/independent-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bundle: { ...exported.bundle, presentation: wrongAudience },
        request_id: "req_build565_wrong_audience",
      }),
    });
    const bad = (await badRes.json()) as { outcome?: string; failure_codes?: string[] };
    push(`4. Wrong audience reuse blocked → ${bad.outcome} (${(bad.failure_codes ?? []).join(", ")})`);
    push(`Bound partner: ${BUILD_546_PARTNER_ID} · policy ${BUILD_546_POLICY_ID}`);
    setBusy(false);
  }

  return (
    <div style={{ fontFamily: FONT, maxWidth: "42rem" }}>
      <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
        Synthetic demonstration: verified holder → portable presentation → independent relying party
        (#563 + #564). No Abraxas identity database at authorization time.
      </p>
      <Btn size="lg" loading={busy} onClick={() => void runDemo()}>
        Run isolated demo
      </Btn>
      <ol style={{ marginTop: "1rem", fontSize: "0.82rem", lineHeight: 1.55 }}>
        {log.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
