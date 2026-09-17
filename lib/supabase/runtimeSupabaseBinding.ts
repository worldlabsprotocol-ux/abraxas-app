// FILE: lib/supabase/runtimeSupabaseBinding.ts
// Server-runtime Supabase binding audit (project refs only; never emits secrets).

import {
  DEMO_SUPABASE_PROJECT_REF,
  isKnownProductionSupabaseRef,
  supabaseProjectRefFromUrl,
} from "@/lib/supabase/projectRefs";
import { supabaseJwtProjectRef } from "@/lib/supabase/supabaseKeyProjectRef";

export type RuntimeSupabaseBindingAudit = {
  vercel_env: string | null;
  deployment_sha: string | null;
  demo_project_ref: string;
  url_project_ref: string | null;
  anon_key_project_ref: string | null;
  service_role_key_project_ref: string | null;
  url_matches_demo: boolean;
  anon_key_matches_demo: boolean;
  service_role_matches_demo: boolean;
  all_match_demo: boolean;
  production_ref_detected: boolean;
  missing: string[];
};

function readRuntimeSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

export function auditRuntimeSupabaseBinding(
  env = readRuntimeSupabaseEnv(),
): RuntimeSupabaseBindingAudit {
  const urlRef = supabaseProjectRefFromUrl(env.url);
  const anonRef = supabaseJwtProjectRef(env.anonKey);
  const serviceRef = supabaseJwtProjectRef(env.serviceRoleKey);

  const missing: string[] = [];
  if (!env.url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!env.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  const urlMatches = urlRef === DEMO_SUPABASE_PROJECT_REF;
  const anonMatches = anonRef === DEMO_SUPABASE_PROJECT_REF;
  const serviceMatches = serviceRef === DEMO_SUPABASE_PROJECT_REF;

  const refs = [urlRef, anonRef, serviceRef];
  const productionRefDetected = refs.some((ref) => isKnownProductionSupabaseRef(ref));

  return {
    vercel_env: process.env.VERCEL_ENV ?? null,
    deployment_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    demo_project_ref: DEMO_SUPABASE_PROJECT_REF,
    url_project_ref: urlRef,
    anon_key_project_ref: anonRef,
    service_role_key_project_ref: serviceRef,
    url_matches_demo: urlMatches,
    anon_key_matches_demo: anonMatches,
    service_role_matches_demo: serviceMatches,
    all_match_demo: urlMatches && anonMatches && serviceMatches,
    production_ref_detected: productionRefDetected,
    missing,
  };
}
