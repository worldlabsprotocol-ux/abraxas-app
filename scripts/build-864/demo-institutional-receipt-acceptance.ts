#!/usr/bin/env ./node_modules/.bin/tsx
/**
 * Build #864 — one continuous institutional verification on Demo:
 * Integration Studio provision → partner handoff → holder wallet authorization →
 * signed receipt → independent portable verification (+ safe adversarial checks).
 *
 * Never logs API keys, cookies, or signatures in full.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { parseStagingTargetFromEnv } from "../launchpad-staging-smoke/guards";
import { describeApiKey } from "../launchpad-staging-smoke/redact";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { encodePassportSolanaMessage } from "@/lib/auth/passportSolanaAuth/message";
import { verifyPortableBundle } from "@/lib/partner/portableIndependentVerification/verifyWithStandaloneVerifier";
import type { PortableVerificationBundle } from "@/lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import type { TrustAnchorBundleV1 } from "@abraxas/independent-verifier";
import { execFileSync } from "node:child_process";

const DEMO_DEFAULT = "https://demo.abraxasworld.xyz";
const TRUST_ANCHOR_PATH =
  process.env.ABRAXAS_BUILD864_TRUST_ANCHOR_PATH?.trim()
  ?? "examples/portable-relying-party/trust-config.demo.template.json";

type Phase = { ok: boolean; detail: string; [key: string]: unknown };

class DemoHttpSession {
  private jar = new Map<string, string>();

  constructor(readonly baseUrl: string) {}

  get origin(): string {
    return this.baseUrl.replace(/\/$/, "");
  }

  cookieHeader(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  absorb(setCookies: string[]): void {
    for (const raw of setCookies) {
      const part = raw.split(";")[0]?.trim();
      if (!part) continue;
      const eq = part.indexOf("=");
      if (eq <= 0) continue;
      this.jar.set(part.slice(0, eq), part.slice(eq + 1));
    }
  }

  async json(
    path: string,
    init: RequestInit & { headers?: Record<string, string> } = {},
  ): Promise<{ status: number; body: unknown; setCookies: string[] }> {
    const url = path.startsWith("http") ? path : `${this.origin}${path}`;
    const headers: Record<string, string> = {
      accept: "application/json",
      origin: this.origin,
      ...(init.headers ?? {}),
    };
    if (this.jar.size > 0) headers.cookie = this.cookieHeader();

    const res = await fetch(url, { ...init, headers, redirect: "manual" });
    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie")!]
          : [];
    this.absorb(setCookies);

    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep text */
    }
    return { status: res.status, body, setCookies };
  }
}

function signPassportMessage(message: string, kp: Keypair): string {
  const bytes = encodePassportSolanaMessage(message);
  const sig = nacl.sign.detached(bytes, kp.secretKey);
  return Buffer.from(sig).toString("base64");
}

function redactId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function loadTrustAnchor(): TrustAnchorBundleV1 {
  return JSON.parse(readFileSync(resolve(TRUST_ANCHOR_PATH), "utf8")) as TrustAnchorBundleV1;
}

async function runHolderWalletPath(
  session: DemoHttpSession,
  kp: Keypair,
  verifyRequest: string,
  partnerId: string,
  policyId: string,
  returnUrl: string,
): Promise<{ phases: Record<string, Phase>; receiptId: string | null }> {
  const phases: Record<string, Phase> = {};
  const wallet = kp.publicKey.toBase58();
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK?.trim() ?? "devnet";

  const challenge = await session.json("/api/auth/passport-solana/challenge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: wallet,
      solana_network: network,
      intended_action: HOLDER_AUTH_ACTIONS.partnerVerify,
    }),
  });
  const chBody = challenge.body as {
    ok?: boolean;
    challenge?: { challenge_id: string; message: string };
    code?: string;
  };
  phases.holder_wallet_challenge = {
    ok: challenge.status === 200 && chBody.ok === true && Boolean(chBody.challenge?.message),
    http_status: challenge.status,
    code: chBody.code ?? null,
    detail: chBody.challenge ? "Partner-verify challenge issued." : "Challenge failed.",
  };
  if (!phases.holder_wallet_challenge.ok || !chBody.challenge) {
    return { phases, receiptId: null };
  }

  const signature = signPassportMessage(chBody.challenge.message, kp);
  const verify = await session.json("/api/auth/passport-solana/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: chBody.challenge.challenge_id,
      wallet_address: wallet,
      solana_network: network,
      signature,
      intended_action: HOLDER_AUTH_ACTIONS.partnerVerify,
    }),
  });
  const vBody = verify.body as { ok?: boolean; code?: string };
  phases.holder_wallet_verify = {
    ok: verify.status === 200 && vBody.ok === true,
    http_status: verify.status,
    code: vBody.code ?? null,
    wallet_redacted: redactId(wallet),
    detail: vBody.ok ? "Browser session + wallet-control claim persisted." : "Wallet verify failed.",
  };
  if (!phases.holder_wallet_verify.ok) {
    return { phases, receiptId: null };
  }

  const ctx = await session.json(
    `/api/v1/hosted-handoff/continue-context?verify_request=${encodeURIComponent(verifyRequest)}`,
    { method: "GET" },
  );
  const ctxBody = ctx.body as { ok?: boolean; partner_id?: string; policy_id?: string };
  phases.continue_context = {
    ok: ctx.status === 200 && ctxBody.ok === true,
    http_status: ctx.status,
    partner_id: redactId(ctxBody.partner_id ?? partnerId),
    policy_id: redactId(ctxBody.policy_id ?? policyId),
    detail: ctxBody.ok ? "Handoff continuation bound to holder session." : "Continue context failed.",
  };
  if (!phases.continue_context.ok) {
    return { phases, receiptId: null };
  }

  const qualify = await session.json("/api/v1/partner-verify/method-qualification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      verify_request: verifyRequest,
      method_id: "wallet_control",
      partner_id: partnerId,
      policy_id: policyId,
    }),
  });
  const qBody = qualify.body as { ok?: boolean; method_qualified?: boolean; code?: string };
  phases.method_qualification = {
    ok: qualify.status === 200 && qBody.ok === true && qBody.method_qualified === true,
    http_status: qualify.status,
    code: qBody.code ?? null,
    detail: qBody.method_qualified ? "Wallet control qualified for verify_request." : "Method not qualified.",
  };
  if (!phases.method_qualification.ok) {
    return { phases, receiptId: null };
  }

  const consent = await session.json("/api/v1/partner-flow/sharing-consent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      partner_id: partnerId,
      policy_id: policyId,
      verify_request: verifyRequest,
    }),
  });
  const cBody = consent.body as { ok?: boolean; error?: string };
  phases.sharing_consent = {
    ok: consent.status === 200 && cBody.ok !== false,
    http_status: consent.status,
    detail: consent.status === 200 ? "Sharing consent recorded." : String(cBody.error ?? "consent_failed"),
  };
  if (!phases.sharing_consent.ok) {
    return { phases, receiptId: null };
  }

  const complete = await session.json("/api/v1/partner-flow/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      partner_id: partnerId,
      policy_id: policyId,
      return_url: returnUrl,
      verify_request: verifyRequest,
    }),
  });
  const compBody = complete.body as {
    redirect_url?: string;
    partner_result?: { receipt_id?: string };
    error?: string;
    code?: string;
  };
  const receiptId = compBody.partner_result?.receipt_id ?? null;
  phases.partner_flow_complete = {
    ok: complete.status === 200 && Boolean(receiptId),
    http_status: complete.status,
    receipt_id: redactId(receiptId),
    code: compBody.code ?? null,
    detail: receiptId ? "Signed receipt issued." : String(compBody.error ?? compBody.code ?? "complete_failed"),
  };

  return { phases, receiptId };
}

async function fetchPortableBundle(baseUrl: string, receiptId: string): Promise<PortableVerificationBundle | null> {
  const res = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/receipts/${encodeURIComponent(receiptId)}/portable-verification`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { ok?: boolean; bundle?: PortableVerificationBundle };
  return json.ok && json.bundle ? json.bundle : null;
}

async function main() {
  const config = parseStagingTargetFromEnv();
  config.targetUrl = (process.env.LAUNCHPAD_STAGING_URL?.trim() ?? DEMO_DEFAULT).replace(/\/$/, "");
  const partnerClient = new LaunchpadStagingClient(config);
  const holderSession = new DemoHttpSession(config.targetUrl);

  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const testTag = `b864-${Date.now()}`;
  const returnUrl = `${config.targetUrl}/partner/callback`;

  const report: Record<string, unknown> = {
    build: 864,
    timestamp: new Date().toISOString(),
    agent_git_sha: agentGitSha,
    demo_base: config.targetUrl,
    phases: {} as Record<string, unknown>,
  };

  const envRes = await partnerClient.getJson("/api/launchpad/staging/environment");
  report.demo_identity = envRes.body;

  const provision = await partnerClient.postJson("/api/developers/integration-studio", {
    application_name: testTag,
    display_name: `Build864 ${testTag}`,
    policy_template_id: "wallet_control",
    return_url: returnUrl,
    sandbox_id: crypto.randomUUID().replace(/-/g, ""),
    idempotency_key: testTag,
  });
  const provBody = provision.body as Record<string, unknown>;
  const app = provBody.application as Record<string, unknown> | undefined;
  const apiKey = typeof provBody.api_key === "string" ? provBody.api_key : null;
  report.phases.provision = {
    ok: provision.status === 200 && Boolean(apiKey),
    http_status: provision.status,
    partner_id: redactId(String(app?.partner_id ?? "")),
    application_id: redactId(String(app?.application_id ?? "")),
    policy_id: redactId(String(app?.policy_id ?? "")),
    credential: apiKey ? describeApiKey(apiKey) : null,
  };
  if (!apiKey || !app?.application_id || !app.partner_id || !app.policy_id) {
    writeReport(report);
    process.exit(1);
  }

  const appId = String(app.application_id);
  const partnerId = String(app.partner_id);
  const policyId = String(app.policy_id);

  const sessionPost = await partnerClient.postJson(
    "/api/launchpad/auth/session",
    {},
    { authorization: `Bearer ${apiKey}` },
  );
  report.phases.partner_console_session = {
    ok: sessionPost.status === 200,
    http_status: sessionPost.status,
    detail: partnerClient.cookies.includes("abraxas_partner_console_session")
      ? "Partner console session cookie issued."
      : "Session POST succeeded but cookie missing.",
  };

  const handoff = await partnerClient.postJson(
    "/api/v1/partner-handoff",
    { runtime: "nextjs" },
    { authorization: `Bearer ${apiKey}`, "x-abraxas-application-id": appId },
  );
  const hb = handoff.body as { hosted_url?: string; verify_request?: string; error?: string };
  let verifyRequest = hb.verify_request ?? null;
  if (!verifyRequest && typeof hb.hosted_url === "string") {
    verifyRequest = new URL(hb.hosted_url).searchParams.get("verify_request");
  }
  report.phases.partner_handoff = {
    ok: handoff.status === 200 && Boolean(verifyRequest),
    http_status: handoff.status,
    verify_request: redactId(verifyRequest),
    error: hb.error ?? null,
  };
  if (!verifyRequest) {
    writeReport(report);
    process.exit(1);
  }

  const kp = Keypair.generate();
  const holder = await runHolderWalletPath(
    holderSession,
    kp,
    verifyRequest,
    partnerId,
    policyId,
    returnUrl,
  );
  Object.assign(report.phases, holder.phases);

  if (!holder.receiptId) {
    writeReport(report);
    process.exit(1);
  }

  report.transaction = {
    partner_id: redactId(partnerId),
    policy_id: redactId(policyId),
    verify_request: redactId(verifyRequest),
    receipt_id: redactId(holder.receiptId),
  };
  writeFileSync(
    resolve("/opt/cursor/artifacts/build-864-latest-receipt-id.txt"),
    `${holder.receiptId}\n`,
    "utf8",
  );

  const pin = loadTrustAnchor();
  const bundle = await fetchPortableBundle(config.targetUrl, holder.receiptId);
  if (!bundle) {
    report.phases.independent_verification = { ok: false, detail: "portable_export_failed" };
    writeReport(report);
    process.exit(1);
  }

  const publicRes = await fetch(
    `${config.targetUrl}/api/receipts/${encodeURIComponent(holder.receiptId)}/public`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  const publicBody = publicRes.ok
    ? (await publicRes.json()) as Record<string, unknown>
    : null;

  const verified = verifyPortableBundle({
    bundle,
    integratorPinnedTrustAnchor: pin,
    partnerId,
    policyId,
    now: new Date(),
  });
  const statusPayload = bundle.signed_status_statement?.payload;
  report.phases.independent_verification = {
    ok:
      verified.cryptographically_authentic
      && verified.issuer_currently_authorized
      && verified.policy_and_audience_match
      && verified.status_evidence_authentic
      && verified.currently_acceptable === "yes",
    cryptographically_authentic: verified.cryptographically_authentic,
    issuer_currently_authorized: verified.issuer_currently_authorized,
    policy_and_audience_match: verified.policy_and_audience_match,
    status_evidence_authentic: verified.status_evidence_authentic,
    currently_acceptable: verified.currently_acceptable,
    failure_codes: verified.failure_codes,
    status_snapshot: statusPayload
      ? {
          receipt_status: statusPayload.receipt_status,
          claims_current: statusPayload.claims_current,
          evidence_current: statusPayload.evidence_current,
          policy_active: statusPayload.policy_active,
          partner_operational: statusPayload.partner_operational,
        }
      : null,
    export_provenance: bundle.export_provenance,
  };
  report.phases.public_receipt_probe = {
    ok: publicRes.ok,
    http_status: publicRes.status,
    currently_valid: publicBody?.currently_valid ?? null,
    lifecycle_status: publicBody?.lifecycle_status ?? null,
    invalidation_reasons: publicBody?.invalidation_reasons ?? null,
    partner_safe_reason: publicBody?.partner_safe_reason ?? null,
  };

  const wrongAudience = verifyPortableBundle({
    bundle,
    integratorPinnedTrustAnchor: pin,
    partnerId: "wrong-partner-id",
    policyId,
    now: new Date(),
  });
  const wrongPin = verifyPortableBundle({
    bundle,
    integratorPinnedTrustAnchor: {
      ...pin,
      public_jwk: { ...pin.public_jwk, x: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    },
    partnerId,
    policyId,
    now: new Date(),
  });
  const tampered = structuredClone(bundle);
  tampered.decision_receipt.payload_hash = "0000000000000000000000000000000000000000000000000000000000000000";
  const tamperedVerify = verifyPortableBundle({
    bundle: tampered,
    integratorPinnedTrustAnchor: pin,
    partnerId,
    policyId,
    now: new Date(),
  });

  report.phases.adversarial = {
    wrong_audience_rejected: wrongAudience.currently_acceptable !== "yes",
    wrong_pin_rejected: !wrongPin.cryptographically_authentic,
    tampered_payload_rejected: !tamperedVerify.cryptographically_authentic,
    wrong_audience_codes: wrongAudience.failure_codes,
    tampered_codes: tamperedVerify.failure_codes,
  };

  report.overall = report.phases.independent_verification;
  writeReport(report);
  console.log(
    JSON.stringify(
      {
        ok: (report.phases.independent_verification as Phase).ok,
        report_path: reportPath(),
        receipt_id: redactId(holder.receiptId),
      },
      null,
      2,
    ),
  );
  process.exit((report.phases.independent_verification as Phase).ok ? 0 : 1);
}

function reportPath(): string {
  return resolve("/opt/cursor/artifacts/build-864-demo-institutional-receipt-acceptance.json");
}

function writeReport(report: Record<string, unknown>): void {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(reportPath(), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
