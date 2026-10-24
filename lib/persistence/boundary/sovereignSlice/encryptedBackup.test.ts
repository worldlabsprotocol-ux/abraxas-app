import { describe, expect, it } from "vitest";
import {
  decryptSovereignSlicePayload,
  encryptSovereignSlicePayload,
} from "./encryptedBackup";
import type { SovereignSliceBackupPayload } from "./backupRestore";

const KEY = Buffer.alloc(32, 3).toString("base64");

const samplePayload = (): SovereignSliceBackupPayload => ({
  version: 1,
  backup_digest: "abc123",
  partners: [],
  partner_policies: [],
  issuer_signing_keys: [],
  decision_receipts: [],
  partner_metering_events: [],
});

describe("encrypted sovereign slice backup", () => {
  it("round-trips with Abraxas backup encryption key", () => {
    const payload = samplePayload();
    const enc = encryptSovereignSlicePayload(payload, { ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY });
    const dec = decryptSovereignSlicePayload(enc, { ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY });
    expect(dec.backup_digest).toBe(payload.backup_digest);
  });

  it("rejects tampered ciphertext", () => {
    const enc = encryptSovereignSlicePayload(samplePayload(), { ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY });
    const buf = Buffer.from(enc.encrypted_payload_b64, "base64");
    buf[buf.length - 1] ^= 0xff;
    expect(() =>
      decryptSovereignSlicePayload(
        { ...enc, encrypted_payload_b64: buf.toString("base64") },
        { ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY },
      ),
    ).toThrow();
  });
});
