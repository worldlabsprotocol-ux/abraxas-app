// FILE: scripts/demo/lib/demoRestClient.ts
// PostgREST-only read client for Partner Sandbox REST validation.

import { PostgrestClient } from "@supabase/postgrest-js";

export interface DemoRestProbeClient {
  from: PostgrestClient["from"];
}

export function createDemoRestReadClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): DemoRestProbeClient {
  const restBaseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
  const rest = new PostgrestClient(restBaseUrl, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  return {
    from: (relation) => rest.from(relation),
  };
}
