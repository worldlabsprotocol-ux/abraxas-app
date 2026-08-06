// FILE: lib/iat/iatReport.ts
// Markdown and JSON report generation for automated IAT companion.

import type { ScenarioAEvidenceTemplate } from "@/lib/iat/iatScenarioAEvidence";
import type { IatAutomatedResult } from "@/lib/iat/iatAutomatedRunner";

export function formatIatAutomatedMarkdown(
  result: IatAutomatedResult,
  scenarioA: ScenarioAEvidenceTemplate,
): string {
  const lines: string[] = [
    "# Automated IAT Companion Report",
    "",
    "> **This report does NOT claim full IAT completion.**",
    "> Only read-only automated checks are executed. Scenario A–D browser flows require human execution.",
    "",
    "## Run metadata",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Generated (UTC) | ${result.generatedAt} |`,
    `| Base URL | ${result.options.baseUrl} |`,
    `| Partner ID | ${result.options.partnerId} |`,
    `| Policy ID | ${result.options.policyId} |`,
    `| Return URL | ${result.options.returnUrl} |`,
    `| Production mode | ${result.options.productionMode} |`,
    `| Automated exit code | ${result.exitCode} |`,
    `| IAT pass claimed | **No** |`,
    "",
    "## Automated check summary",
    "",
    `| Status | Count |`,
    `|--------|-------|`,
    `| PASS | ${result.summary.pass} |`,
    `| FAIL | ${result.summary.fail} |`,
    `| PENDING | ${result.summary.pending} |`,
    `| HUMAN_REQUIRED | ${result.summary.human_required} |`,
    "",
    "## Automated checks",
    "",
  ];

  for (const check of result.checks) {
    const icon =
      check.status === "pass"
        ? "PASS"
        : check.status === "fail"
          ? "FAIL"
          : check.status === "human_required"
            ? "HUMAN_REQUIRED"
            : "PENDING";
    lines.push(`### ${icon} — ${check.label}`);
    lines.push("");
    lines.push(`- **ID:** \`${check.id}\``);
    lines.push(`- **Evidence:** ${check.evidence}`);
    lines.push("");
  }

  lines.push("## Scenario A evidence template (human fill)");
  lines.push("");
  lines.push(
    "Fill after executing `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` Scenario A on production.",
  );
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| verification_request_id | ${scenarioA.fields.verification_request_id ?? "_pending_"} |`);
  lines.push(`| flow_trace_id | ${scenarioA.fields.flow_trace_id ?? "_pending_"} |`);
  lines.push(`| consent_recorded | ${scenarioA.fields.consent_recorded ?? "_pending_"} |`);
  lines.push(`| admin_approval_recorded | ${scenarioA.fields.admin_approval_recorded ?? "_pending_"} |`);
  lines.push(`| residency_country_in_claims | ${scenarioA.fields.residency_country_in_claims ?? "_pending_"} |`);
  lines.push(`| decision_id | ${scenarioA.fields.decision_id ?? "_pending_"} |`);
  lines.push(`| receipt_id | ${scenarioA.fields.receipt_id ?? "_pending_"} |`);
  lines.push(`| signature_valid | ${scenarioA.fields.signature_valid ?? "_pending_"} |`);
  lines.push(`| callback_url_captured | ${scenarioA.fields.callback_url_captured ?? "_pending_"} |`);
  lines.push(`| audit_rows | ${scenarioA.fields.audit_rows.length > 0 ? `${scenarioA.fields.audit_rows.length} rows` : "_pending_"} |`);
  lines.push("");
  lines.push("### Scenario A steps still requiring a human");
  lines.push("");
  for (const step of scenarioA.human_steps_required) {
    lines.push(`${step.step}. **${step.label}** — ${step.reason}`);
  }
  lines.push("");
  lines.push("## Related docs");
  lines.push("");
  lines.push("- `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`");
  lines.push("- `docs/PRODUCTION_WALKTHROUGH_RESULTS.md`");
  lines.push("- `docs/BETA_GATE_EVIDENCE.md`");
  lines.push("");

  return lines.join("\n");
}

export function formatIatAutomatedJson(
  result: IatAutomatedResult,
  scenarioA: ScenarioAEvidenceTemplate,
): string {
  return JSON.stringify(
    {
      disclaimer:
        "Automated read-only checks only. Does NOT claim full IAT completion or Scenario A pass.",
      iat_pass_claimed: false,
      generated_at: result.generatedAt,
      options: result.options,
      summary: result.summary,
      exit_code: result.exitCode,
      checks: result.checks,
      scenario_a_evidence_template: scenarioA,
    },
    null,
    2,
  );
}
