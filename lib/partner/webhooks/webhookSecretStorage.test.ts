import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptWebhookSigningSecret,
  encryptWebhookSigningSecret,
} from "@/lib/partner/webhooks/webhookSecretStorage";

describe("webhook secret storage", () => {
  const prevMasterKey = process.env.ABRAXAS_WEBHOOK_MASTER_KEY;
  const prevSigningKey = process.env.ABRAXAS_SIGNING_KEY;

  beforeEach(() => {
    delete process.env.ABRAXAS_SIGNING_KEY;
  });

  afterEach(() => {
    if (prevMasterKey === undefined) delete process.env.ABRAXAS_WEBHOOK_MASTER_KEY;
    else process.env.ABRAXAS_WEBHOOK_MASTER_KEY = prevMasterKey;
    if (prevSigningKey === undefined) delete process.env.ABRAXAS_SIGNING_KEY;
    else process.env.ABRAXAS_SIGNING_KEY = prevSigningKey;
  });

  it("requires ABRAXAS_WEBHOOK_MASTER_KEY and does not fall back to ABRAXAS_SIGNING_KEY", () => {
    process.env.ABRAXAS_SIGNING_KEY = "signing-key-only";
    expect(encryptWebhookSigningSecret("abx_whsec_test")).toBeNull();

    process.env.ABRAXAS_WEBHOOK_MASTER_KEY = "dedicated-webhook-master";
    const encrypted = encryptWebhookSigningSecret("abx_whsec_test");
    expect(encrypted).not.toBeNull();

    const decrypted = decryptWebhookSigningSecret({
      ciphertext: encrypted!.ciphertext,
      iv: encrypted!.iv,
    });
    expect(decrypted).toBe("abx_whsec_test");
  });
});
