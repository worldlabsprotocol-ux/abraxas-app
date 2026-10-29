import { EXTERNAL_NODE_PARTNER_REFERENCE } from "@/lib/developers/integrationAdoptionPath";

export const REFERENCE_EXAMPLE_ORIGIN = EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase;

export const REFERENCE_EXAMPLE_HEALTH_URL = `${REFERENCE_EXAMPLE_ORIGIN}/health` as const;

export const REFERENCE_EXAMPLE_APP_URL = `${REFERENCE_EXAMPLE_ORIGIN}/` as const;

export type ReferenceExampleReachability = "reachable" | "unreachable" | "checking";

export async function probeReferenceExampleServer(
  signal?: AbortSignal,
): Promise<"reachable" | "unreachable"> {
  try {
    const res = await fetch(REFERENCE_EXAMPLE_HEALTH_URL, {
      method: "GET",
      cache: "no-store",
      signal: signal ?? AbortSignal.timeout(3500),
    });
    if (!res.ok) return "unreachable";
    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true ? "reachable" : "unreachable";
  } catch {
    return "unreachable";
  }
}

export const REFERENCE_EXAMPLE_START_COMMAND =
  "cd examples/external-node-partner && npm install && npm start" as const;
