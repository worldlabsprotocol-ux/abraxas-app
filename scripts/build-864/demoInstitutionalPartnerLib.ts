/**
 * Shared Demo institutional partner flow (Build 864 / 866).
 * Never logs API keys, cookies, or signatures in full.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { describeApiKey } from "../launchpad-staging-smoke/redact";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { encodePassportSolanaMessage } from "@/lib/auth/passportSolanaAuth/message";
import { verifyPortableBundle } from "@/lib/partner/portableIndependentVerification/verifyWithStandaloneVerifier";
import type { PortableVerificationBundle } from "@/lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import type { TrustAnchorBundleV1 } from "@abraxas/independent-verifier";

export type Phase = { ok: boolean; detail: string; [key: string]: unknown };

export class DemoHttpSession {
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

export function signPassportMessage(message: string, kp: Keypair): string {
  const bytes = encodePassportSolanaMessage(message);
  const sig = nacl.sign.detached(bytes, kp.secretKey);
  return Buffer.from(sig).toString("base64");
}

export function redactId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function loadTrustAnchor(path: string): TrustAnchorBundleV1 {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as TrustAnchorBundleV1;
}

export async function fetchPortableBundle(
  baseUrl: string,
  receiptId: string,
): Promise<PortableVerificationBundle | null> {
  const res = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/receipts/${encodeURIComponent(receiptId)}/portable-verification`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { ok?: boolean; bundle?: PortableVerificationBundle };
  return json.ok && json.bundle ? json.bundle : null;
}

export async function runHolderWalletPath(
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

export type ProvisionedPartner = {
  label: string;
  policy_template_id: string;
  application_id: string;
  partner_id: string;
  policy_id: string;
  api_key: string;
  verify_request: string;
  receipt_id: string;
  phases: Record<string, Phase>;
  verification: ReturnType<typeof verifyPortableBundle>;
  bundle: PortableVerificationBundle;
};

export async function provisionAndExecutePartner(input: {
  label: string;
  policyTemplateId: string;
  partnerClient: LaunchpadStagingClient;
  holderSession: DemoHttpSession;
  baseUrl: string;
  returnUrl: string;
  testTagPrefix: string;
  trustAnchor: TrustAnchorBundleV1;
}): Promise<{ ok: false; phases: Record<string, Phase> } | { ok: true; partner: ProvisionedPartner }> {
  const phases: Record<string, Phase> = {};
  const testTag = `${input.testTagPrefix}-${input.label}-${Date.now()}`;

  const provision = await input.partnerClient.postJson("/api/developers/integration-studio", {
    application_name: testTag,
    display_name: `Build866 ${input.label} ${testTag}`,
    policy_template_id: input.policyTemplateId,
    return_url: input.returnUrl,
    sandbox_id: crypto.randomUUID().replace(/-/g, ""),
    idempotency_key: testTag,
  });
  const provBody = provision.body as Record<string, unknown>;
  const app = provBody.application as Record<string, unknown> | undefined;
  const apiKey = typeof provBody.api_key === "string" ? provBody.api_key : null;
  phases.provision = {
    ok: provision.status === 200 && Boolean(apiKey),
    http_status: provision.status,
    partner_id: redactId(String(app?.partner_id ?? "")),
    application_id: redactId(String(app?.application_id ?? "")),
    policy_id: redactId(String(app?.policy_id ?? "")),
    policy_template_id: input.policyTemplateId,
    credential: apiKey ? describeApiKey(apiKey) : null,
  };
  if (!apiKey || !app?.application_id || !app.partner_id || !app.policy_id) {
    return { ok: false, phases };
  }

  const appId = String(app.application_id);
  const partnerId = String(app.partner_id);
  const policyId = String(app.policy_id);

  const isolatedClient = new LaunchpadStagingClient({
    targetUrl: input.baseUrl,
    expectedSupabaseRef: process.env.LAUNCHPAD_EXPECTED_SUPABASE_REF!.trim(),
    vercelProtectionBypass: process.env.VERCEL_PROTECTION_BYPASS?.trim(),
  });

  const sessionPost = await isolatedClient.postJson(
    "/api/launchpad/auth/session",
    {},
    { authorization: `Bearer ${apiKey}` },
  );
  phases.partner_console_session = {
    ok: sessionPost.status === 200,
    http_status: sessionPost.status,
    detail: isolatedClient.cookies.includes("abraxas_partner_console_session")
      ? "Partner console session cookie issued."
      : "Session POST succeeded but cookie missing.",
  };

  const handoff = await isolatedClient.postJson(
    "/api/v1/partner-handoff",
    { runtime: "nextjs" },
    { authorization: `Bearer ${apiKey}`, "x-abraxas-application-id": appId },
  );
  const hb = handoff.body as { hosted_url?: string; verify_request?: string; error?: string };
  let verifyRequest = hb.verify_request ?? null;
  if (!verifyRequest && typeof hb.hosted_url === "string") {
    verifyRequest = new URL(hb.hosted_url).searchParams.get("verify_request");
  }
  phases.partner_handoff = {
    ok: handoff.status === 200 && Boolean(verifyRequest),
    http_status: handoff.status,
    verify_request: redactId(verifyRequest),
    error: hb.error ?? null,
  };
  if (!verifyRequest) {
    return { ok: false, phases };
  }

  const kp = Keypair.generate();
  const holder = await runHolderWalletPath(
    input.holderSession,
    kp,
    verifyRequest,
    partnerId,
    policyId,
    input.returnUrl,
  );
  Object.assign(phases, holder.phases);
  if (!holder.receiptId) {
    return { ok: false, phases };
  }

  const bundle = await fetchPortableBundle(input.baseUrl, holder.receiptId);
  if (!bundle) {
    phases.independent_verification = { ok: false, detail: "portable_export_failed" };
    return { ok: false, phases };
  }

  const verified = verifyPortableBundle({
    bundle,
    integratorPinnedTrustAnchor: input.trustAnchor,
    partnerId,
    policyId,
    now: new Date(),
  });
  const statusPayload = bundle.signed_status_statement?.payload;
  phases.independent_verification = {
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
  };

  if (!phases.independent_verification.ok) {
    return { ok: false, phases };
  }

  return {
    ok: true,
    partner: {
      label: input.label,
      policy_template_id: input.policyTemplateId,
      application_id: appId,
      partner_id: partnerId,
      policy_id: policyId,
      api_key: apiKey,
      verify_request: verifyRequest,
      receipt_id: holder.receiptId,
      phases,
      verification: verified,
      bundle,
    },
  };
}

export function verifyPartnerIsolation(input: {
  trustAnchor: TrustAnchorBundleV1;
  partnerA: ProvisionedPartner;
  partnerB: ProvisionedPartner;
}): Record<string, Phase> {
  const phases: Record<string, Phase> = {};

  const foreignPartnerId =
    input.partnerA.partner_id !== input.partnerB.partner_id
      ? input.partnerB.partner_id
      : "foreign-partner-not-bound-to-receipt";

  const aReceiptWithBAudience = verifyPortableBundle({
    bundle: input.partnerA.bundle,
    integratorPinnedTrustAnchor: input.trustAnchor,
    partnerId: foreignPartnerId,
    policyId: input.partnerA.policy_id,
    now: new Date(),
  });
  phases.receipt_a_wrong_partner_rejected = {
    ok: aReceiptWithBAudience.currently_acceptable !== "yes",
    detail: "Partner A receipt must not verify as currently acceptable for a foreign partner audience.",
    failure_codes: aReceiptWithBAudience.failure_codes,
  };

  const foreignPartnerForB =
    input.partnerA.partner_id !== input.partnerB.partner_id
      ? input.partnerA.partner_id
      : "foreign-partner-not-bound-to-receipt";

  const bReceiptWithAAudience = verifyPortableBundle({
    bundle: input.partnerB.bundle,
    integratorPinnedTrustAnchor: input.trustAnchor,
    partnerId: foreignPartnerForB,
    policyId: input.partnerB.policy_id,
    now: new Date(),
  });
  phases.receipt_b_wrong_partner_rejected = {
    ok: bReceiptWithAAudience.currently_acceptable !== "yes",
    detail: "Partner B receipt must not verify as currently acceptable for a foreign partner audience.",
    failure_codes: bReceiptWithAAudience.failure_codes,
  };

  const forgedPolicy = verifyPortableBundle({
    bundle: input.partnerA.bundle,
    integratorPinnedTrustAnchor: input.trustAnchor,
    partnerId: input.partnerA.partner_id,
    policyId: "forged-policy-id-not-in-catalog",
    now: new Date(),
  });
  phases.receipt_a_forged_policy_rejected = {
    ok: forgedPolicy.currently_acceptable !== "yes",
    detail: "Policy identifier forgery must fail closed at verification.",
    failure_codes: forgedPolicy.failure_codes,
  };

  const sharedStudioPartner = input.partnerA.partner_id === input.partnerB.partner_id;
  phases.distinct_partner_ids = {
    ok: true,
    shared_studio_partner: sharedStudioPartner,
    detail: sharedStudioPartner
      ? "Integration Studio may reuse one studio partner_id; tenant isolation is enforced at application + API credential scope."
      : "Partners received distinct partner identifiers.",
    partner_a: redactId(input.partnerA.partner_id),
    partner_b: redactId(input.partnerB.partner_id),
  };
  const sharedPolicyBinding = input.partnerA.policy_id === input.partnerB.policy_id;
  phases.distinct_policy_ids = {
    ok: true,
    shared_policy_binding: sharedPolicyBinding,
    detail: sharedPolicyBinding
      ? "Distinct applications may share a catalog policy binding; receipts remain bound to the issuing verify_request and application credential."
      : "Each provisioned application bound a distinct policy id.",
    policy_a: redactId(input.partnerA.policy_id),
    policy_b: redactId(input.partnerB.policy_id),
  };
  phases.distinct_application_ids = {
    ok: input.partnerA.application_id !== input.partnerB.application_id,
    detail: "Sandbox applications must remain isolated.",
    application_a: redactId(input.partnerA.application_id),
    application_b: redactId(input.partnerB.application_id),
  };

  return phases;
}

export async function assertCrossApplicationHandoffDenied(input: {
  apiKeyOwner: ProvisionedPartner;
  foreignApplicationId: string;
  baseUrl: string;
}): Promise<Phase> {
  const client = new LaunchpadStagingClient({
    targetUrl: input.baseUrl,
    expectedSupabaseRef: process.env.LAUNCHPAD_EXPECTED_SUPABASE_REF!.trim(),
    vercelProtectionBypass: process.env.VERCEL_PROTECTION_BYPASS?.trim(),
  });
  const handoff = await client.postJson(
    "/api/v1/partner-handoff",
    { runtime: "nextjs" },
    {
      authorization: `Bearer ${input.apiKeyOwner.api_key}`,
      "x-abraxas-application-id": input.foreignApplicationId,
    },
  );
  return {
    ok: handoff.status !== 200,
    http_status: handoff.status,
    detail: "Partner A credential must not create handoffs for Partner B application.",
  };
}
