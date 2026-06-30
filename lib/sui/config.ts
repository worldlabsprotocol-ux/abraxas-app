// FILE: lib/sui/config.ts
import deployment from "./deployment.devnet.json";

export const SUI_DEVNET = deployment;

export function passportTypeFilter(): string {
  return `${SUI_DEVNET.packageId}::${SUI_DEVNET.module}::Passport`;
}

export function suiExplorerObject(objectId: string): string {
  return `${SUI_DEVNET.explorerBase}/object/${objectId}`;
}

export function suiExplorerAddress(address: string): string {
  return `${SUI_DEVNET.explorerBase}/account/${address}`;
}

export function suiExplorerTx(digest: string): string {
  return `${SUI_DEVNET.explorerBase}/tx/${digest}`;
}
