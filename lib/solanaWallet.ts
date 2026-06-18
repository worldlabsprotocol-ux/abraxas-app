// FILE: lib/solanaWallet.ts
// Server-side Solana keypair generation + encryption. No EVM dependencies,
// no Privy, no permissionless/viem/ox chain. Uses @solana/web3.js only,
// which is already a dependency of this project.
import { Keypair } from "@solana/web3.js";
import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.WALLET_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY must be set in Vercel env vars (32+ char random string)"
    );
  }
  return crypto.createHash("sha256").update(key).digest();
}

export interface EncryptedSecret {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export function generateSolanaKeypair(): {
  publicKey: string;
  encryptedSecret: EncryptedSecret;
} {
  const keypair = Keypair.generate();
  const secretKeyBytes = Buffer.from(keypair.secretKey);

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secretKeyBytes), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    publicKey: keypair.publicKey.toBase58(),
    encryptedSecret: {
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    },
  };
}

export function decryptSolanaSecretKey(enc: EncryptedSecret): Uint8Array {
  const decipher = crypto.createDecipheriv(
    ALGO,
    getEncryptionKey(),
    Buffer.from(enc.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(enc.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(enc.ciphertext, "base64")),
    decipher.final(),
  ]);
  return new Uint8Array(plaintext);
}
