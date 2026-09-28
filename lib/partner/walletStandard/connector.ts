// FILE: lib/partner/walletStandard/connector.ts
// Browser Wallet Standard connector. signMessage only. Phantom-compatible.

export const WALLET_STANDARD_SIGN_FEATURE = "solana:signMessage" as const;

type WalletPublicKey = {
  toBytes?: () => Uint8Array;
  toBuffer?: () => Uint8Array;
};

type SignMessageFeature = {
  signMessage: (input: { account: { publicKey: Uint8Array }; message: Uint8Array }) => Promise<Array<{ signature: Uint8Array }>>;
};

type StandardWallet = {
  features?: Record<string, unknown>;
  accounts?: Array<{ publicKey: Uint8Array }>;
};

type PhantomProvider = {
  isConnected?: boolean;
  connect?: () => Promise<unknown>;
  publicKey?: WalletPublicKey | null;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array; publicKey?: WalletPublicKey }>;
};

function bytesToBase64(value: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < value.length; index += 1) {
    binary += String.fromCharCode(value[index] ?? 0);
  }
  return btoa(binary);
}

function walletPublicKeyBytes(value: WalletPublicKey | null | undefined): Uint8Array | null {
  if (value?.toBytes) return value.toBytes();
  if (value?.toBuffer) return new Uint8Array(value.toBuffer());
  return null;
}

function asWalletList(): StandardWallet[] {
  const nav = globalThis.navigator as Navigator & { wallets?: { get?: () => StandardWallet[] } };
  const listed = nav.wallets?.get?.();
  return Array.isArray(listed) ? listed : [];
}

function phantomProvider(): PhantomProvider | null {
  return (globalThis as { phantom?: { solana?: PhantomProvider } }).phantom?.solana ?? null;
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
        signature: bytesToBase64(signature),
        publicKey: bytesToBase64(account.publicKey),
      };
    }
  }

  const phantom = phantomProvider();
  if (phantom?.signMessage) {
    if (!phantom.isConnected && phantom.connect) await phantom.connect();
    const signed = await phantom.signMessage(encoded);
    const publicKey = walletPublicKeyBytes(signed.publicKey ?? phantom.publicKey);
    if (!publicKey) return { ok: false, status: "unavailable" };
    return {
      ok: true,
      signature: bytesToBase64(signed.signature),
      publicKey: bytesToBase64(publicKey),
    };
  }

  return { ok: false, status: "unavailable" };
}
