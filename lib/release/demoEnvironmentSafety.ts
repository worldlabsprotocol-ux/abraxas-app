// Build #514 — hard safety gates for Demo deployment and preflight.

import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";
import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "@/scripts/demo/lib/knownProductionSupabaseProjectRefs";

export type DemoSafetyVerdict = "pass" | "fail";

export interface DemoSupabaseBindingCheck {
  verdict: DemoSafetyVerdict;
  observedRef: string | null;
  expectedDemoRef: typeof DEMO_SUPABASE_PROJECT_REF;
  isProductionRef: boolean;
  message: string;
}

export function supabaseProjectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function assertDemoSupabaseNotProduction(input: {
  supabaseUrl?: string;
  projectRef?: string | null;
}): DemoSupabaseBindingCheck {
  const expectedDemoRef = DEMO_SUPABASE_PROJECT_REF;
  const observedRef = input.projectRef?.trim()
    || supabaseProjectRefFromUrl(input.supabaseUrl ?? "");
  const isProductionRef = observedRef
    ? (KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS as readonly string[]).includes(observedRef)
    : false;

  if (!observedRef) {
    return {
      verdict: "fail",
      observedRef: null,
      expectedDemoRef,
      isProductionRef: false,
      message: "Supabase project ref could not be resolved from URL.",
    };
  }

  if (isProductionRef) {
    return {
      verdict: "fail",
      observedRef,
      expectedDemoRef,
      isProductionRef: true,
      message: "STOP: configured Supabase project is the production project. Abort deployment and preflight.",
    };
  }

  if (observedRef !== expectedDemoRef) {
    return {
      verdict: "fail",
      observedRef,
      expectedDemoRef,
      isProductionRef: false,
      message: `Supabase ref ${observedRef} is not the canonical Demo ref ${expectedDemoRef}.`,
    };
  }

  return {
    verdict: "pass",
    observedRef,
    expectedDemoRef,
    isProductionRef: false,
    message: `Demo Supabase ref ${observedRef} verified (non-production).`,
  };
}
