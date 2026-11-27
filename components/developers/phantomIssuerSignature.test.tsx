import { describe, expect, it, vi } from "vitest";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { signPhantomIssuerMessage } from "./phantomIssuerSignature";

const signer = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(7));
const issuer = new PublicKey(signer.publicKey);
const message = Uint8Array.from([65, 66, 82, 65, 88, 65, 83, 0, 255, 1]);

describe("Phantom issuer message compatibility", () => {
  it("requests hex display while preserving and verifying the exact binary bytes", async () => {
    const signMessage = vi.fn(async (bytes: Uint8Array, display: "hex") => ({
      signature: nacl.sign.detached(bytes, signer.secretKey),
    }));
    const signature = await signPhantomIssuerMessage(message, issuer,
      { isPhantom: true, publicKey: issuer, signMessage });
    expect(signMessage).toHaveBeenCalledWith(message, "hex");
    expect(nacl.sign.detached.verify(message, signature, issuer.toBytes())).toBe(true);
  });

  it("rejects another wallet before requesting a signature", async () => {
    const signMessage = vi.fn();
    await expect(signPhantomIssuerMessage(message, issuer, {
      isPhantom: true, publicKey: new PublicKey(new Uint8Array(32).fill(3)), signMessage,
    })).rejects.toThrow(/approved issuer/);
    expect(signMessage).not.toHaveBeenCalled();
  });

  it("rejects malformed, tampered and wrong-key signatures", async () => {
    for (const signature of [new Uint8Array(63),
      nacl.sign.detached(Uint8Array.from([...message, 2]), signer.secretKey),
      nacl.sign.detached(message, nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(8)).secretKey)]) {
      await expect(signPhantomIssuerMessage(message, issuer, {
        isPhantom: true, publicKey: issuer, signMessage: async () => ({ signature }),
      })).rejects.toThrow(/exact receipt bytes/);
    }
  });

  it("preserves wallet rejection without falling back to another signer", async () => {
    await expect(signPhantomIssuerMessage(message, issuer, {
      isPhantom: true, publicKey: issuer,
      signMessage: async () => { throw Error("User rejected the request"); },
    })).rejects.toThrow(/User rejected/);
  });
});
