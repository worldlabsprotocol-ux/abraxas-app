// FILE: lib/sui/mainnetDeployPath.ts
// Honest Sui mainnet deploy checklist — gates #2 (audit) and #3 (deploy).

import { AUDIT_TRACKER } from "@/lib/securityProgram";
import mainnetDeployment from "./deployment.mainnet.json";
import { getSuiNetwork } from "./network";
import { isPassportIssuerConfigured } from "./passportIssuer";
import { isDeployedPackage, isSuiMainnetDeployed } from "./config";

export type SuiMainnetStepStatus = "complete" | "ready" | "blocked" | "action_required";

export interface SuiMainnetDeployStep {
  id: string;
  label: string;
  status: SuiMainnetStepStatus;
  detail: string;
  command?: string;
  env_vars?: string[];
}

export interface SuiMainnetDeployPath {
  summary: string;
  audit_complete: boolean;
  package_published: boolean;
  issuer_ready: boolean;
  production_network: boolean;
  ready_for_mainnet_cutover: boolean;
  steps: SuiMainnetDeployStep[];
  next_actions: string[];
  deploy_commands: {
    publish: string;
    mint_cap: string;
    vercel_env: string[];
  };
}

function auditComplete(): boolean {
  return AUDIT_TRACKER.find(a => a.id === "sui-passport")?.status === "complete";
}

export function getSuiMainnetDeployPath(): SuiMainnetDeployPath {
  const auditDone = auditComplete();
  const packagePublished = isDeployedPackage(mainnetDeployment.packageId);
  const network = getSuiNetwork();
  const productionNetwork = network === "mainnet";
  const hasSponsorKey = Boolean(
    process.env.SUI_SPONSOR_SECRET_KEY?.trim() || process.env.SUI_ISSUER_SECRET_KEY?.trim(),
  );
  const hasCapEnv = Boolean(process.env.SUI_ISSUANCE_CAP_OBJECT_ID?.trim());
  const issuerReady = isPassportIssuerConfigured() && productionNetwork && packagePublished;

  const steps: SuiMainnetDeployStep[] = [
    {
      id: "move-package",
      label: "Passport Move package built (anchor_authentication_proof included)",
      status: "complete",
      detail: "sui/abraxas_passport — run npm run sui:build before publish.",
      command: "npm run sui:build",
    },
    {
      id: "mainnet-audit",
      label: "Gate #2 — Sui Passport mainnet audit published",
      status: auditDone ? "complete" : "blocked",
      detail: auditDone
        ? "AUDIT_TRACKER sui-passport is complete."
        : "Third-party Move review must complete before mainnet publish. Track at /security.",
    },
    {
      id: "mainnet-publish",
      label: "Gate #3 — Publish package to Sui mainnet",
      status: packagePublished ? "complete" : auditDone ? "action_required" : "blocked",
      detail: packagePublished
        ? `packageId ${mainnetDeployment.packageId}`
        : auditDone
          ? "Run deploy script with CONFIRM_MAINNET=1 after funding sponsor wallet."
          : "Blocked until audit gate #2 completes.",
      command: "CONFIRM_MAINNET=1 npm run sui:deploy:mainnet",
    },
    {
      id: "mint-issuance-cap",
      label: "Mint IssuanceCap on mainnet package",
      status: packagePublished
        ? hasCapEnv || Boolean(mainnetDeployment.demoIssuanceCapObjectId)
          ? "complete"
          : "action_required"
        : "blocked",
      detail: packagePublished
        ? hasCapEnv
          ? `SUI_ISSUANCE_CAP_OBJECT_ID set`
          : "Mint cap for sponsor wallet, then set SUI_ISSUANCE_CAP_OBJECT_ID in Vercel."
        : "Publish mainnet package first.",
      command: "npm run sui:mint-cap -- mainnet",
    },
    {
      id: "sponsor-wallet",
      label: "Sponsor wallet funded + keys in Vercel",
      status: hasSponsorKey ? (productionNetwork ? "complete" : "ready") : "action_required",
      detail: hasSponsorKey
        ? productionNetwork
          ? "SUI_SPONSOR_SECRET_KEY configured."
          : "Key set locally — set SUI_NETWORK=mainnet in Vercel for production."
        : "Export suiprivkey from sponsor wallet → SUI_SPONSOR_SECRET_KEY.",
      env_vars: ["SUI_SPONSOR_SECRET_KEY", "SUI_ISSUANCE_CAP_OBJECT_ID"],
    },
    {
      id: "vercel-network",
      label: "Production SUI_NETWORK=mainnet",
      status: productionNetwork ? "complete" : "action_required",
      detail: productionNetwork
        ? "App reads mainnet deployment JSON (no devnet package fallback)."
        : "Set SUI_NETWORK=mainnet and redeploy after packageId is in deployment.mainnet.json.",
      env_vars: ["SUI_NETWORK", "NEXT_PUBLIC_SUI_NETWORK"],
    },
    {
      id: "issuer-live",
      label: "On-chain passport provision live on mainnet",
      status: issuerReady ? "complete" : packagePublished && hasSponsorKey ? "ready" : "blocked",
      detail: issuerReady
        ? "Veriff → POST /api/sui/passport/provision can stamp mainnet passports."
        : "Complete publish + cap + network env, then test GET /api/sui/passport/sponsor.",
    },
  ];

  const readyForCutover = isSuiMainnetDeployed() && issuerReady && auditDone;

  const nextActions: string[] = [];
  if (!auditDone) nextActions.push("Complete Sui Passport Move audit (gate #2) — /security");
  if (auditDone && !packagePublished) {
    nextActions.push("Fund mainnet sponsor wallet with SUI for gas");
    nextActions.push("CONFIRM_MAINNET=1 npm run sui:deploy:mainnet");
  }
  if (packagePublished && !hasCapEnv) nextActions.push("npm run sui:mint-cap -- mainnet → set SUI_ISSUANCE_CAP_OBJECT_ID");
  if (!hasSponsorKey) nextActions.push("Set SUI_SPONSOR_SECRET_KEY in Vercel");
  if (!productionNetwork) nextActions.push("Set SUI_NETWORK=mainnet in Vercel and redeploy");
  if (readyForCutover) nextActions.push("Gate #3 clears automatically — confirm /api/mainnet/readiness and /api/sui/mainnet/readiness");

  const completeCount = steps.filter(s => s.status === "complete").length;
  const summary = readyForCutover
    ? "Sui Passport mainnet path complete — gate #3 should be live."
    : auditDone
      ? `${completeCount}/${steps.length} steps done — publish + env cutover remain.`
      : `Audit in progress — ${completeCount}/${steps.length} prep steps done. Deploy blocked until gate #2.`;

  return {
    summary,
    audit_complete: auditDone,
    package_published: packagePublished,
    issuer_ready: issuerReady,
    production_network: productionNetwork,
    ready_for_mainnet_cutover: readyForCutover,
    steps,
    next_actions: nextActions,
    deploy_commands: {
      publish: "CONFIRM_MAINNET=1 npm run sui:deploy:mainnet",
      mint_cap: "npm run sui:mint-cap -- mainnet",
      vercel_env: [
        "SUI_NETWORK=mainnet",
        "NEXT_PUBLIC_SUI_NETWORK=mainnet",
        "SUI_SPONSOR_SECRET_KEY=suiprivkey1…",
        "SUI_ISSUANCE_CAP_OBJECT_ID=0x…",
      ],
    },
  };
}
