import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PortableHarnessPersistence } from "./studioHarnessRestore";
import { assertPrepareBindingHmacConfigured } from "./prepareBindingSecret";

export type PrepareBindingCore = {
  v: 1;
  jti: string;
  application_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  policy_template_id: string;
  scenario_id: string;
  holder_wallet: string;
  execution_nonce: string;
  receipt_id: string;
  payload_hash_hex: string;
  persistence_digest: string;
  expires_at: number;
};

export type PrepareBindingPayload = PrepareBindingCore & {
  persistence: PortableHarnessPersistence;
};

export function issuePrepareBindingToken(input: {
  application_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  policy_template_id: string;
  scenario_id: string;
  holder_wallet: string;
  execution_nonce: string;
  receipt_id: string;
  payload_hash_hex: string;
  persistence: PortableHarnessPersistence;
  ttlSec?: number;
}): string | null {
  const configured = assertPrepareBindingHmacConfigured();
  if (!configured.ok) return null;
  const persistence_digest = createHash("sha256").update(JSON.stringify(input.persistence), "utf8").digest("hex");
  const core: PrepareBindingCore = {
    v: 1,
    jti: randomBytes(16).toString("hex"),
    application_id: input.application_id,
    partner_id: input.partner_id,
    policy_id: input.policy_id,
    policy_version: input.policy_version,
    policy_template_id: input.policy_template_id,
    scenario_id: input.scenario_id,
    holder_wallet: input.holder_wallet,
    execution_nonce: input.execution_nonce,
    receipt_id: input.receipt_id,
    payload_hash_hex: input.payload_hash_hex,
    persistence_digest,
    expires_at: Math.floor(Date.now() / 1000) + (input.ttlSec ?? 600),
  };
  const mac = createHmac("sha256", configured.secret).update(JSON.stringify(core)).digest("hex");
  return Buffer.from(JSON.stringify({ core, persistence: input.persistence, mac }), "utf8").toString("base64url");
}

export function verifyPrepareBindingToken(
  token: string,
  expectations: {
    application_id: string;
    partner_id: string;
    holder_wallet: string;
  },
): { ok: true; binding: PrepareBindingPayload } | { ok: false; code: string } {
  const configured = assertPrepareBindingHmacConfigured();
  if (!configured.ok) return configured;
  let decoded: { core: PrepareBindingCore; persistence: PortableHarnessPersistence; mac: string };
  try {
    decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as typeof decoded;
  } catch {
    return { ok: false, code: "prepare_binding_invalid" };
  }
  const digest = createHash("sha256").update(JSON.stringify(decoded.persistence), "utf8").digest("hex");
  if (digest !== decoded.core.persistence_digest) return { ok: false, code: "prepare_binding_tampered" };
  const mac = createHmac("sha256", configured.secret).update(JSON.stringify(decoded.core)).digest("hex");
  const left = Buffer.from(mac, "hex");
  const right = Buffer.from(decoded.mac, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, code: "prepare_binding_mac_invalid" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (decoded.core.expires_at < now) return { ok: false, code: "prepare_binding_expired" };
  if (decoded.core.application_id !== expectations.application_id) return { ok: false, code: "prepare_binding_application_mismatch" };
  if (decoded.core.partner_id !== expectations.partner_id) return { ok: false, code: "prepare_binding_partner_mismatch" };
  if (decoded.core.holder_wallet !== expectations.holder_wallet) {
    return { ok: false, code: "prepare_binding_wallet_mismatch" };
  }
  return { ok: true, binding: { ...decoded.core, persistence: decoded.persistence } };
}