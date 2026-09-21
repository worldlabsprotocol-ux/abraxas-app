import { readFileSync } from "node:fs";
import { evaluateConformance, evaluateVectorConformance, rejectBrowserConformanceMark } from "./verify";
import { serializeConformanceReport } from "./report";

export interface ConformanceCliResult {
  ok: boolean;
  command: string;
  reason?: string;
  report?: ReturnType<typeof serializeConformanceReport>;
  live: false;
}

function readManifest(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export function runAbraxasConformance(argv: string[], env: NodeJS.ProcessEnv = process.env): ConformanceCliResult {
  const command = argv[0] ?? "";
  if (env.ABRAXAS_CONFORMANCE_FROM_BROWSER === "1") {
    return { ok: false, command, reason: rejectBrowserConformanceMark({ from_browser: true }).reason, live: false };
  }
  if (command === "vectors") {
    const result = evaluateVectorConformance();
    return { ok: result.ok, command, report: serializeConformanceReport("vectors", result), live: false };
  }
  const file = argv[1];
  if ((command === "evm" || command === "solana" || command === "report") && !file) {
    return { ok: false, command, reason: "invalid", live: false };
  }
  if (command === "evm" || command === "solana" || command === "report") {
    const result = evaluateConformance({
      raw: readManifest(file),
      institutionalRequired: command !== "report" ? undefined : undefined,
    });
    if (result.file_kind === "plan_envelope") {
      return { ok: false, command, reason: "plan_envelope", report: serializeConformanceReport(command, result), live: false };
    }
    if (command !== "report" && result.gate_type !== "unknown" && result.gate_type !== command) {
      return { ok: false, command, reason: "binding_mismatch", report: serializeConformanceReport(command, result), live: false };
    }
    return { ok: result.ok, command, reason: result.ok ? undefined : result.reasons[0], report: serializeConformanceReport(command, result), live: false };
  }
  return { ok: false, command: command || "unknown", reason: "invalid", live: false };
}

export async function main(): Promise<void> {
  const result = runAbraxasConformance(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
