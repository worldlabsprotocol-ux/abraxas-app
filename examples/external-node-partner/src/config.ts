import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type PartnerConfig = {
  baseUrl: string;
  apiKey: string;
  applicationId: string;
  bindingId: string | null;
  expectedPartnerId: string;
  expectedPolicyId: string;
  trustAnchorPath: string;
  verifyEnvironment: "demo" | "production";
  port: number;
  callbackBaseUrl: string;
};

function req(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

export function loadConfig(): PartnerConfig {
  const trustAnchorPath = resolve(process.cwd(), req("ABRAXAS_TRUST_ANCHOR_PATH"));
  if (!existsSync(trustAnchorPath)) {
    throw new Error(`trust_anchor_missing:${trustAnchorPath}`);
  }
  const verifyEnvironment =
    process.env.ABRAXAS_VERIFY_ENVIRONMENT?.trim() === "production" ? "production" : "demo";
  return {
    baseUrl: req("ABRAXAS_BASE_URL").replace(/\/$/, ""),
    apiKey: req("ABRAXAS_API_KEY"),
    applicationId: req("ABRAXAS_APPLICATION_ID"),
    bindingId: process.env.ABRAXAS_BINDING_ID?.trim() || null,
    expectedPartnerId: req("ABRAXAS_PARTNER_ID"),
    expectedPolicyId: req("ABRAXAS_POLICY_ID"),
    trustAnchorPath,
    verifyEnvironment,
    port: Number(process.env.PORT ?? "3847"),
    callbackBaseUrl: (process.env.CALLBACK_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3847"}`).replace(
      /\/$/,
      "",
    ),
  };
}

export function loadTrustAnchorJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}
