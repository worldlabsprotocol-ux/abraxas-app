// Binds one IAM identity to one KMS key. The sign method does not accept a key id or an algorithm.

import { GetPublicKeyCommand, KMSClient, SignCommand, type KMSClientConfig } from "@aws-sdk/client-kms";
import { AWS_KMS_ED25519, ed25519RawPublicKeyFromSpki } from "./awsKmsEd25519";
import { CustodyResponseError, type CustodyClient } from "./contract";

export type AwsKmsCommandClient = {
  send(command: GetPublicKeyCommand | SignCommand): Promise<{
    PublicKey?: Uint8Array;
    KeySpec?: string;
    Signature?: Uint8Array;
    SigningAlgorithm?: string;
  }>;
};

export function createAwsKmsSdkClient(input: { region: string; credentials?: KMSClientConfig["credentials"] }): KMSClient {
  return new KMSClient({ region: input.region, credentials: input.credentials });
}

export function bindAwsKmsEd25519Client(input: {
  identityId: string;
  keyId: string;
  kms: AwsKmsCommandClient;
}): CustodyClient {
  const identityId = input.identityId.trim();
  const keyId = input.keyId.trim();
  return {
    identityId,
    keyId,
    async getPublicKey() {
      const response = await input.kms.send(new GetPublicKeyCommand({ KeyId: keyId }));
      if (response.KeySpec !== AWS_KMS_ED25519.keySpec) {
        throw new CustodyResponseError("kms_key_spec_mismatch");
      }
      const raw = response.PublicKey ? ed25519RawPublicKeyFromSpki(response.PublicKey) : null;
      if (!raw) throw new CustodyResponseError("kms_public_key_mismatch");
      return { keySpec: response.KeySpec, publicKey: raw };
    },
    async signRawDigest(message) {
      const response = await input.kms.send(new SignCommand({
        KeyId: keyId,
        Message: message,
        MessageType: AWS_KMS_ED25519.messageType,
        SigningAlgorithm: AWS_KMS_ED25519.signingAlgorithm,
      }));
      if (response.SigningAlgorithm !== AWS_KMS_ED25519.signingAlgorithm || !(response.Signature instanceof Uint8Array)) {
        throw new CustodyResponseError("signature_material_invalid");
      }
      return response.Signature;
    },
  };
}
