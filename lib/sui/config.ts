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

function isDeployedPackage(packageId: string | undefined): boolean {
  return Boolean(packageId?.startsWith("0x") && packageId.length > 10);
}

export function getSuiDeployment(): SuiDeployment {
  const network = getSuiNetwork();
  if (network === "mainnet" && isDeployedPackage(mainnetDeployment.packageId)) {
    return mainnetDeployment as SuiDeployment;
  }
  return devnetDeployment as SuiDeployment;
}

export function getActiveSuiNetwork(): SuiNetwork {
  const deployment = getSuiDeployment();
  if (deployment.network === "mainnet") return "mainnet";
  if (deployment.network === "testnet") return "testnet";
  return "devnet";
}

export function passportTypeFilter(): string {
  const deployment = getSuiDeployment();
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
  return getActiveSuiNetwork() === "mainnet" && isDeployedPackage(getSuiDeployment().packageId);
}
