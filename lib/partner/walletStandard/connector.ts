// FILE: lib/partner/walletStandard/connector.ts
// Browser Wallet Standard connector. SignMessage only. Phantom-compatible.

export const WALLET_STANDARD_SIGN_FEATURE = "solana:signMessage" as const;

type SignMessageFeature = {
  signMessage: (input: { account: { publicKey: Uint8Array }; message: Uint8Array }) => Promise<Array<{ signature: Uint8Array }>>;
};

type StandardWallet = {
  features?: Record<string, unknown>;
  accounts?: Array<{ publicKey: Uint8Array }>;
};

function asWalletList(): StandardWallet[] {
  const nav = globalThis.navigator as Navigator & { wallets?: { get?: () => StandardWallet[] } };
  const listed = nav.wallets?.get?.();
  return Array.isArray(listed) ? listed : [];
}

function phantomSignMessage(): ((message: Uint8Array) => Promise<{ signature: Uint8Array; publicKey?: { toBytes?: () => Uint8Array } }>) | null {
  const phantom = (globalThis as { phantom?: { solana?: { signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }> } } }).phantom?.solana;
  return phantom?.signMessage ?? null;
}

export async function signWalletStandardChallenge(message: string): Promise<
  { ok: true; signature: string; publicKey: string } | { ok: false; status: "unavailable" }
> {
  const encoded = new TextEncoder().encode(message);
  const standard = asWalletList().find((wallet) => wallet.features?.[WALLET_STANDARD_SIGN_FEATURE]);
  if (standard) {
    const feature = standard.features?.[WALLET_STANDARD_SIGN_FEATURE] as SignMessageFeature | undefined;
    const account = standard.accounts?.[0];
    if (feature && account) {
      const signed = await feature.signMessage({ account, message: encoded });
      const signature = signed[0]?.signature;
      if (!signature) return { ok: false, status: "unavailable" };
      return {
        ok: true,
        signature: Buffer.from(signature).toString("base64"),
        publicKey: Buffer.from(account.publicKey).toString("base64"),
      };
    }
  }
  const phantom = phantomSignMessage();
  if (phantom) {
    const signed = await phantom(encoded);
    return {
      ok: true,
      signature: Buffer.from(signed.signature).toString("base64"),
      publicKey: signed.publicKey?.toBytes
        ? Buffer.from(signed.publicKey.toBytes()).toString("base64")
        : "",
    };
  }
  return { ok: false, status: "unavailable" };
}
