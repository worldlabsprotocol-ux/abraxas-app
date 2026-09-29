// FILE: lib/partner/valueEvidence/retention.ts
// Repeat integration activity — not SaaS NRR/GRR.

import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import { filterByEnvironment, isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";

export type ActivityPeriod = "weekly" | "monthly";

function periodKey(iso: string, period: ActivityPeriod): string {
  const d = new Date(iso);
  if (period === "weekly") {
    const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getUTCDay() + 1) / 7);
    return `${d.getUTCFullYear()}-W${week}`;
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function computeRepeatIntegrationActivity(input: {
  events: IntegrationEventRow[];
  environment: "sandbox" | "production";
  period?: ActivityPeriod;
}): {
  periods_with_verification: number;
  periods_with_completed_flow: number;
  repeat_integration_activity: boolean;
  active_production_periods: number | null;
  label: string;
} {
  const period = input.period ?? "monthly";
  const scoped = filterByEnvironment(input.events.filter(isLiveEvent), input.environment);
  const verifyPeriods = new Set<string>();
  const flowPeriods = new Set<string>();

  for (const event of scoped) {
    if (event.event_type === "receipt_verification_succeeded") {
      verifyPeriods.add(periodKey(event.created_at, period));
    }
    if (event.event_type === "holder_flow_completed") {
      flowPeriods.add(periodKey(event.created_at, period));
    }
  }

  const periodsWithVerification = verifyPeriods.size;
  const periodsWithFlow = flowPeriods.size;
  const repeat = periodsWithVerification > 1 || periodsWithFlow > 1;

  return {
    periods_with_verification: periodsWithVerification,
    periods_with_completed_flow: periodsWithFlow,
    repeat_integration_activity: repeat,
    active_production_periods: input.environment === "production" ? periodsWithVerification : null,
    label: period === "weekly" ? "weekly_active_integration" : "monthly_active_integration",
  };
}
