// FILE: lib/positioningLoop.ts
// Closed-loop asset positioning status — backend truth for investor demos.

import { createClient } from "@supabase/supabase-js";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { ASSET_POSITIONING_STEPS } from "@/lib/assetPositioning";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export type LoopStepState = "live" | "wired" | "pending";

export interface PositioningLoopStep {
  id: string;
  title: string;
  body: string;
  href: string;
  state: LoopStepState;
  detail: string;
}

export interface PositioningLoopStatus {
  headline: string;
  loopClosed: boolean;
  steps: PositioningLoopStep[];
  metrics: {
    registryAssets: number;
    submittedAssets: number;
    assetInquiries: number;
    tokenizationRequests: number;
    approvedExternalAssets: number;
  };
  updatedAt: string;
}

export async function getPositioningLoopStatus(): Promise<PositioningLoopStatus> {
  let submittedAssets = 0;
  let assetInquiries = 0;
  let tokenizationRequests = 0;
  let approvedExternalAssets = 0;

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

    const [submitted, inquiries, tokenization, external] = await Promise.all([
      sb.from("submitted_assets").select("id", { count: "exact", head: true }),
      sb.from("asset_inquiries").select("id", { count: "exact", head: true }),
      sb.from("tokenization_requests").select("id", { count: "exact", head: true }),
      sb
        .from("external_asset_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);

    submittedAssets = submitted.count ?? 0;
    assetInquiries = inquiries.count ?? 0;
    tokenizationRequests = tokenization.count ?? 0;
    approvedExternalAssets = external.count ?? 0;
  }

  const registryAssets = EXPLORE_ASSETS.length + approvedExternalAssets;
  const notifyConfigured = Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL);

  const steps: PositioningLoopStep[] = ASSET_POSITIONING_STEPS.map(step => {
    if (step.step === "1") {
      const live = submittedAssets > 0 || tokenizationRequests > 0;
      return {
        id: "register_verify",
        title: step.title,
        body: step.body,
        href: step.href,
        state: live ? "live" : "wired",
        detail: live
          ? `${submittedAssets} asset submissions · ${tokenizationRequests} tokenization requests`
          : "POST /api/assets/submit · POST /api/notify/tokenization",
      };
    }

    if (step.step === "2") {
      return {
        id: "registry_ready",
        title: step.title,
        body: step.body,
        href: step.href,
        state: registryAssets > 0 ? "live" : "wired",
        detail: `${registryAssets} on-registry assets · GET /api/registry/explore`,
      };
    }

    const transactLive = assetInquiries > 0;
    return {
      id: "transact_options",
      title: step.title,
      body: step.body,
      href: step.href,
      state: transactLive ? "live" : notifyConfigured ? "wired" : "pending",
      detail: transactLive
        ? `${assetInquiries} acquisition inquiries routed on-protocol`
        : "POST /api/assets/inquire · partner MLS lot-status push",
    };
  });

  const loopClosed = steps.every(s => s.state === "live");

  return {
    headline: "Position before the chain — closed-loop backend",
    loopClosed,
    steps,
    metrics: {
      registryAssets,
      submittedAssets,
      assetInquiries,
      tokenizationRequests,
      approvedExternalAssets,
    },
    updatedAt: new Date().toISOString(),
  };
}
