// FILE: lib/passport/passportWalletDeepLink.ts
// Shared deep link into Passport wallet-add flow with return path.

export function passportWalletAddHref(returnPath: string): string {
  const params = new URLSearchParams({ tab: "wallets" });
  if (returnPath) params.set("return", returnPath);
  return `/passport?${params.toString()}`;
}
