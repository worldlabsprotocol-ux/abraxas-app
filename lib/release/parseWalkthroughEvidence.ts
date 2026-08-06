// FILE: lib/release/parseWalkthroughEvidence.ts
// Parse IAT walkthrough results — never claims pass without concrete artifact IDs.

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const RECEIPT_ID_RE = /\bdr_[a-z0-9_]+\b/i;
const FLOW_TRACE_RE = /\bft_(?:vr|rc)_[a-z0-9_-]+\b/i;

export type ScenarioLetter = "A" | "B" | "C" | "D";

export interface ScenarioEvidenceSnapshot {
  scenario: ScenarioLetter;
  markedPass: boolean;
  decisionId: string | null;
  receiptId: string | null;
  flowTraceId: string | null;
  signatureValidProof: boolean;
  callbackProof: boolean;
}

export interface WalkthroughEvidenceAssessment {
  automatedCompanionRecorded: boolean;
  scenarios: ScenarioEvidenceSnapshot[];
  scenarioAComplete: boolean;
  fullIatComplete: boolean;
  missingForScenarioA: string[];
  missingForFullIat: string[];
}

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return true;
  if (/^_(.+)_$/i.test(trimmed)) return true;
  if (/pass\s*\/\s*fail/i.test(trimmed)) return true;
  if (/pending/i.test(trimmed)) return true;
  if (/^n\/a$/i.test(trimmed)) return true;
  if (/^dr_\*?$/i.test(trimmed)) return true;
  if (/^ft_vr_/i.test(trimmed) && trimmed.includes("{")) return true;
  return false;
}

function extractTableValue(block: string, label: string): string | null {
  const re = new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*([^|]+)\\|`, "i");
  const match = block.match(re);
  return match?.[1]?.trim() ?? null;
}

function parseScenarioBlock(markdown: string, scenario: ScenarioLetter): ScenarioEvidenceSnapshot {
  const heading = new RegExp(
    `### Scenario ${scenario} —[\\s\\S]*?(?=\\n### Scenario |\\n## |$)`,
    "i",
  );
  const block = markdown.match(heading)?.[0] ?? "";

  const passField = extractTableValue(block, "Pass\\?");
  const markedPass = Boolean(passField && /\bpass\b/i.test(passField) && !/\bfail\b/i.test(passField));

  const decisionRaw = extractTableValue(block, "Decision ID");
  const receiptRaw = extractTableValue(block, "Receipt ID");
  const flowRaw = extractTableValue(block, "Flow trace ID");

  const decisionId =
    decisionRaw && !isPlaceholder(decisionRaw) && UUID_RE.test(decisionRaw)
      ? decisionRaw.match(UUID_RE)![0]
      : null;
  const receiptId =
    receiptRaw && !isPlaceholder(receiptRaw) && RECEIPT_ID_RE.test(receiptRaw)
      ? receiptRaw.match(RECEIPT_ID_RE)![0]
      : null;
  const flowTraceId =
    flowRaw && !isPlaceholder(flowRaw) && FLOW_TRACE_RE.test(flowRaw)
      ? flowRaw.match(FLOW_TRACE_RE)![0]
      : null;

  const signatureValidProof =
    /signature_valid\s*:\s*true/i.test(block)
    || /signature_valid\s*===\s*true/i.test(block);

  const callbackProof =
    /callback/i.test(block)
    && (
      /callback url/i.test(block)
      || /redirect to/i.test(block)
      || /enter-callback/i.test(block)
      || /callback params/i.test(block)
    )
    && !isPlaceholder(extractTableValue(block, "Evidence") ?? "");

  return {
    scenario,
    markedPass,
    decisionId,
    receiptId,
    flowTraceId,
    signatureValidProof,
    callbackProof,
  };
}

function scenarioARequirements(snapshot: ScenarioEvidenceSnapshot): string[] {
  const missing: string[] = [];
  if (!snapshot.markedPass) missing.push("Scenario A marked PASS");
  if (!snapshot.decisionId) missing.push("decision_id UUID");
  if (!snapshot.receiptId) missing.push("receipt_id (dr_*)");
  if (!snapshot.flowTraceId) missing.push("flow_trace_id (ft_vr_* or ft_rc_*)");
  if (!snapshot.signatureValidProof) missing.push("signature_valid=true evidence");
  if (!snapshot.callbackProof) missing.push("callback proof");
  if (
    snapshot.decisionId
    && snapshot.flowTraceId
    && snapshot.flowTraceId.startsWith("ft_vr_")
    && !snapshot.flowTraceId.includes(snapshot.decisionId)
    && !snapshot.flowTraceId.replace(/^ft_vr_/, "").includes(
      snapshot.flowTraceId.replace(/^ft_vr_/, "").slice(0, 8),
    )
  ) {
    // Soft note only when both present but obviously unrelated placeholders
  }
  return missing;
}

export function assessWalkthroughEvidence(markdown: string): WalkthroughEvidenceAssessment {
  const automatedCompanionRecorded =
    /npm run iat:automated/i.test(markdown)
    && /Automated IAT companion/i.test(markdown)
    && /Full IAT claimed.*\*\*No\*\*/i.test(markdown);

  const scenarios = (["A", "B", "C", "D"] as const).map(s => parseScenarioBlock(markdown, s));
  const scenarioA = scenarios.find(s => s.scenario === "A")!;
  const missingForScenarioA = scenarioARequirements(scenarioA);

  const missingForFullIat: string[] = [];
  for (const snapshot of scenarios) {
    if (!snapshot.markedPass) {
      missingForFullIat.push(`Scenario ${snapshot.scenario} not marked PASS`);
    }
  }
  if (missingForScenarioA.length > 0) {
    missingForFullIat.push(...missingForScenarioA.map(m => `Scenario A: ${m}`));
  }

  const scenarioAComplete = missingForScenarioA.length === 0;
  const fullIatComplete =
    scenarios.every(s => s.markedPass)
    && scenarioAComplete
    && scenarios.slice(1).every(s => s.decisionId || s.receiptId || s.scenario === "D");

  return {
    automatedCompanionRecorded,
    scenarios,
    scenarioAComplete,
    fullIatComplete,
    missingForScenarioA,
    missingForFullIat,
  };
}
