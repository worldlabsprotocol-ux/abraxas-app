import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

type PhantomMessageProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  signMessage(message: Uint8Array, display: "hex"): Promise<{ signature: Uint8Array }>;
};

/** Sign the exact on-chain issuer message. Hex changes Phantom's display, never the signed bytes. */
export async function signPhantomIssuerMessage(
  message: Uint8Array,
  expectedIssuer: PublicKey,
  provider: PhantomMessageProvider | undefined,
): Promise<Uint8Array> {
  if (!provider?.isPhantom || !provider.publicKey?.equals(expectedIssuer)) {
    throw new Error("The selected Phantom account is not the approved issuer");
  }
  const result = await provider.signMessage(message, "hex");
  const signature = result?.signature;
  if (!(signature instanceof Uint8Array) || signature.length !== 64 ||
      !nacl.sign.detached.verify(message, signature, expectedIssuer.toBytes())) {
    throw new Error("Phantom did not sign the exact receipt bytes with the approved issuer");
  }
  return signature;
}

export function injectedPhantom(): PhantomMessageProvider | undefined {
  return (window as Window & { phantom?: { solana?: PhantomMessageProvider } }).phantom?.solana;
}
