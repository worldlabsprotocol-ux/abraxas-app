// FILE: lib/wallet/detectEvmProvider.ts
// Client-side EVM wallet detection — do not equate "not connected" with "not installed".

type EthereumProvider = {
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
};

type InjectableWindow = Window & {
  ethereum?: EthereumProvider;
};

export function detectEvmInjectable(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as InjectableWindow).ethereum;
  return Boolean(eth && typeof eth.request === "function");
}

export function detectMetaMaskInjectable(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as InjectableWindow).ethereum;
  return Boolean(eth?.isMetaMask && typeof eth.request === "function");
}

export const METAMASK_INSTALL_URL = "https://metamask.io/download/";
