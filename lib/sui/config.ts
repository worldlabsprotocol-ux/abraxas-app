// FILE: lib/sui/config.ts
import devnetDeployment from "./deployment.devnet.json";
import mainnetDeployment from "./deployment.mainnet.json";
import { getSuiNetwork, type SuiNetwork } from "./network";

export interface SuiDeployment {
  network: string;
  rpcUrl: string;
  explorerBase: string;
  packageId: string;
  module: string;
  publishedAt: string | null;
  publishTxDigest: string | null;
  demoPassportObjectId: string;
  demoIssuanceCapObjectId: string;
  demoOwnerAddress: string;
  demoBootstrapTxDigest?: string;
}

/** @deprecated use getSuiDeployment() */
export const SUI_DEVNET = devnetDeployment as SuiDeployment;

export function isDeployedPackage(packageId: string | undefined): boolean {
  return Boolean(packageId?.startsWith("0x") && packageId.length > 10);
}

export type SuiDeploymentSource = "mainnet" | "devnet";

export interface ResolvedSuiDeployment {
  deployment: SuiDeployment;
  source: SuiDeploymentSource;
  /** SUI_NETWORK=mainnet but deployment.mainnet.json has no packageId yet */
  mainnetPackageMissing: boolean;
}

/** Resolve deployment without silently using devnet packageId on mainnet RPC. */
export function resolveSuiDeployment(): ResolvedSuiDeployment {
  const network = getSuiNetwork();
  if (network === "mainnet") {
    if (isDeployedPackage(mainnetDeployment.packageId)) {
      return {
        deployment: mainnetDeployment as SuiDeployment,
        source: "mainnet",
        mainnetPackageMissing: false,
      };
    }
    return {
      deployment: mainnetDeployment as SuiDeployment,
      source: "mainnet",
      mainnetPackageMissing: true,
    };
  }
  return {
    deployment: devnetDeployment as SuiDeployment,
    source: "devnet",
    mainnetPackageMissing: false,
  };
}

export function getSuiDeployment(): SuiDeployment {
  return resolveSuiDeployment().deployment;
}

export function requireDeployedPassportPackage(): SuiDeployment {
  const resolved = resolveSuiDeployment();
  if (!isDeployedPackage(resolved.deployment.packageId)) {
    const hint = resolved.mainnetPackageMissing
      ? "SUI_NETWORK=mainnet but deployment.mainnet.json packageId is empty — run sui:deploy:mainnet"
      : "Sui Passport package not deployed on active network";
    throw new Error(hint);
  }
  return resolved.deployment;
}

export function getActiveSuiNetwork(): SuiNetwork {
  const deployment = getSuiDeployment();
  if (deployment.network === "mainnet") return "mainnet";
  if (deployment.network === "testnet") return "testnet";
  return "devnet";
}

export function passportTypeFilter(): string {
  const deployment = requireDeployedPassportPackage();
  return `${deployment.packageId}::${deployment.module}::Passport`;
}

export function suiExplorerObject(objectId: string): string {
  return `${getSuiDeployment().explorerBase}/object/${objectId}`;
}

export function suiExplorerAddress(address: string): string {
  return `${getSuiDeployment().explorerBase}/account/${address}`;
}

export function suiExplorerTx(digest: string): string {
  return `${getSuiDeployment().explorerBase}/tx/${digest}`;
}

export function isSuiMainnetDeployed(): boolean {
  const resolved = resolveSuiDeployment();
  return resolved.source === "mainnet" && isDeployedPackage(resolved.deployment.packageId);
}
