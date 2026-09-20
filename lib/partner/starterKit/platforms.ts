// FILE: lib/partner/starterKit/platforms.ts
// Platform-specific starter files. Same Partner Kit contracts. Placeholders only.

import { STARTER_KIT_MINIMUM_REQUIREMENTS, STARTER_KIT_PLACEHOLDERS as P } from "./contract";

export interface StarterKitFile {
  path: string;
  contents: string;
}

export function universalHttpsFiles(include: {
  webhook: boolean;
  venue: boolean;
  payment: boolean;
  solana: boolean;
  wallet: boolean;
  portable: boolean;
  evm: boolean;
}): StarterKitFile[] {
  const files: StarterKitFile[] = [
    {
      path: "PLATFORM.md",
      contents: `# Universal HTTPS (canonical)

${STARTER_KIT_MINIMUM_REQUIREMENTS.map((line) => `- ${line}`).join("\n")}

A static website or browser-only page cannot hold partner secrets or verify receipts.
Add a secure backend or serverless function first.

These examples are plain HTTPS request/response shapes. Any language can implement them.
`,
    },
    {
      path: "http/hosted-redirect.http",
      contents: `GET https://abraxasworld.xyz/partner/verify?partner_id=${P.partner_id}&policy_id=${P.policy_id}&return_url=${P.callback_url}

# Browser may start this redirect. Callback query keys are not authorization.
`,
    },
    {
      path: "http/verify-receipt.mjs",
      contents: `// Server-only. Do not ship this file to a browser bundle.
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

export async function handleCallback(search) {
  const result = await kit.verifyCallback(new URLSearchParams(search));
  if (!permitProtocolAction(result)) {
    return { status: 403, body: { action: "deny", outcome: result.outcome } };
  }
  return { status: 200, body: { action: "permit", outcome: "permitted" } };
}

export async function verifyPublicReceipt(receiptId) {
  const result = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(result)) {
    return { grant: false, outcome: result.outcome };
  }
  return { grant: true, outcome: "permitted" };
}
`,
    },
  ];
  if (include.webhook) {
    files.push({
      path: "http/webhook.mjs",
      contents: `import { verifyPartnerWebhookEvent } from "@abraxas/partner-kit/webhooks";
import { verifyPublicReceipt } from "./verify-receipt.mjs";

const seenEventIds = new Set();

export async function handleWebhook({ rawBody, timestamp, signature, partnerId }) {
  const verified = verifyPartnerWebhookEvent({
    secret: process.env.ABRAXAS_WEBHOOK_SECRET ?? "${P.webhook_secret}",
    timestamp,
    rawBody,
    signatureHeader: signature,
    expectedPartnerId: partnerId,
    seenEventIds,
  });
  if (!verified.ok) return { status: 400, body: { accepted: false } };
  if (verified.duplicate || !verified.payload.receipt_id) {
    return { status: 200, body: { accepted: true, grant: false } };
  }
  const check = await verifyPublicReceipt(verified.payload.receipt_id);
  return { status: 200, body: { accepted: true, ...check } };
}
`,
    });
  }
  if (include.venue) {
    files.push({
      path: "http/trading-preflight.mjs",
      contents: `import { AbraxasTradingVenueAdapter } from "@abraxas/partner-kit/trading-venue";
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});
const venue = new AbraxasTradingVenueAdapter({ kit });

export async function tradingPreflight(receiptId) {
  const receipt = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(receipt)) return { allowed: false, reason: receipt.outcome };
  return venue.authorize({ action_type: "enable_market_access", action_scope: "sandbox:market_access" });
}
`,
    });
  }
  if (include.payment) {
    files.push({
      path: "http/payment-preflight.mjs",
      contents: `import { AbraxasPaymentAuthorizationAdapter } from "@abraxas/partner-kit/payment-authorization";
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});
const payments = new AbraxasPaymentAuthorizationAdapter({ kit });

export async function paymentPreflight(receiptId) {
  const receipt = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(receipt)) return { allowed: false, reason: receipt.outcome };
  return payments.authorize({ action_type: "authorize_checkout", action_scope: "sandbox:checkout" });
}
`,
    });
  }
  if (include.portable) {
    files.push({
      path: "http/portable-preflight.mjs",
      contents: `import { AbraxasPortableActionAdapter } from "@abraxas/partner-kit/portable-action-contract";

const adapter = new AbraxasPortableActionAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function portablePreflight(receiptId) {
  const contract = adapter.issueActionContract({
    action_type: "partner_protocol_action",
    action_scope: "sandbox:partner_protocol",
  });
  if ("ok" in contract && contract.ok === false) return { allowed: false, reason: contract.reason };
  const verified = await adapter.verifySignedReceipt(receiptId);
  // allowed means your app may perform its named action. Abraxas never executes it.
  return adapter.preflight({ result: verified, contract });
}
`,
    });
  }
  if (include.evm) {
    files.push({
      path: "http/evm-preflight.mjs",
      contents: `import { AbraxasEvmPartnerAdapter } from "@abraxas/partner-kit/evm";

const adapter = new AbraxasEvmPartnerAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function evmPreflight(receiptId) {
  const contract = adapter.issueActionContract({
    action_type: "enable_protocol_access",
    action_scope: "sandbox:protocol_access",
  });
  if ("ok" in contract && contract.ok === false) return { allowed: false, reason: contract.reason };
  const verified = await adapter.verifySignedReceipt(receiptId);
  const result = await adapter.preflight({ result: verified, contract });
  if (!result.allowed) return result;
  // PARTNER EXECUTION BELONGS HERE.
  // Use your own RPC, signer, contract, gas, and transaction construction.
  return result;
}
`,
    });
  }
  if (include.solana) {
    files.push({
      path: "http/solana-gate.mjs",
      contents: `import { AbraxasSolanaPartnerAdapter } from "@abraxas/partner-kit/solana";
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});
const solana = new AbraxasSolanaPartnerAdapter({ kit });

export async function solanaEligibilityGate(receiptId) {
  const receipt = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(receipt)) return { allowed: false, reason: receipt.outcome };
  return solana.verifyEligibility({ creates_transactions: false, funds_movement: false });
}
`,
    });
  }
  if (include.wallet) {
    files.push({
      path: "http/wallet-binding.mjs",
      contents: `import { signWalletStandardChallenge } from "@abraxas/partner-kit/wallet-standard";

export async function optionalWalletBinding(wallet) {
  return signWalletStandardChallenge({ wallet, purpose: "optional_action_binding" });
}
`,
    });
  }
  return files;
}

export function wixVeloFiles(include: { webhook: boolean; venue: boolean; payment: boolean; wallet: boolean; portable: boolean; evm: boolean }): StarterKitFile[] {
  return [
    {
      path: "PLATFORM.md",
      contents: `# Wix Velo

Good Trouble-style Wix integration. Same Abraxas Partner Kit and receipt contracts as Next.js.

Wix Secrets Manager names only:
- ABRAXAS_BASE_URL
- ABRAXAS_PARTNER_ID
- ABRAXAS_POLICY_ID
- ABRAXAS_POLICY_VERSION
- ABRAXAS_SANDBOX_API_KEY
- ABRAXAS_CALLBACK_URL
${include.webhook ? "- ABRAXAS_WEBHOOK_SECRET\n" : ""}
Never store values in page code. Frontend files may only call backend web modules.
`,
    },
    {
      path: "backend/abraxas.web.js",
      contents: `import { getSecret } from "wix-secrets-backend";
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

async function serverKit() {
  return new AbraxasPartnerKit({
    partnerId: await getSecret("ABRAXAS_PARTNER_ID"),
    policyId: await getSecret("ABRAXAS_POLICY_ID"),
    policyVersion: Number(await getSecret("ABRAXAS_POLICY_VERSION")),
    requirePolicyVersion: true,
    environment: "sandbox",
    baseUrl: await getSecret("ABRAXAS_BASE_URL"),
  });
}

export async function startHostedFlow() {
  const kit = await serverKit();
  const returnUrl = await getSecret("ABRAXAS_CALLBACK_URL");
  return { url: kit.createHostedVerificationUrl(returnUrl) };
}

export async function verifyCallback(search) {
  const kit = await serverKit();
  const result = await kit.verifyCallback(new URLSearchParams(search));
  if (!permitProtocolAction(result)) {
    return { action: "deny", outcome: result.outcome };
  }
  return { action: "permit", outcome: "permitted" };
}

export async function verifyReceipt(receiptId) {
  const kit = await serverKit();
  const result = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(result)) {
    return { grant: false, outcome: result.outcome };
  }
  return { grant: true, outcome: "permitted" };
}
`,
    },
    {
      path: "backend/http-functions.js",
      contents: `import { ok, badRequest, forbidden } from "wix-http-functions";
import { verifyCallback, verifyReceipt } from "backend/abraxas.web";
${include.webhook ? `import { getSecret } from "wix-secrets-backend";
import { verifyPartnerWebhookEvent } from "@abraxas/partner-kit/webhooks";
const seenEventIds = new Set();
` : ""}
export async function get_abraxas_callback(request) {
  const result = await verifyCallback(request.query);
  if (result.action !== "permit") return forbidden({ body: result });
  return ok({ body: result });
}
${include.webhook ? `
export async function post_abraxas_webhook(request) {
  const rawBody = await request.body.text();
  const verified = verifyPartnerWebhookEvent({
    secret: await getSecret("ABRAXAS_WEBHOOK_SECRET"),
    timestamp: request.headers["x-abraxas-webhook-timestamp"] ?? "",
    rawBody,
    signatureHeader: request.headers["x-abraxas-webhook-signature"] ?? "",
    expectedPartnerId: await getSecret("ABRAXAS_PARTNER_ID"),
    seenEventIds,
  });
  if (!verified.ok) return badRequest({ body: { accepted: false } });
  if (verified.duplicate || !verified.payload.receipt_id) {
    return ok({ body: { accepted: true, grant: false } });
  }
  const check = await verifyReceipt(verified.payload.receipt_id);
  return ok({ body: { accepted: true, ...check } });
}
` : ""}
`,
    },
    {
      path: "src/pages/start-verification.js",
      contents: `import { startHostedFlow } from "backend/abraxas.web";

export async function onReady() {
  const started = await startHostedFlow();
  if (started?.url) {
    window.location.assign(started.url);
  }
}
`,
    },
    ...(include.venue ? [{
      path: "backend/trading-preflight.web.js",
      contents: `import { verifyReceipt } from "backend/abraxas.web";
import { AbraxasTradingVenueAdapter } from "@abraxas/partner-kit/trading-venue";
import { getSecret } from "wix-secrets-backend";
import { AbraxasPartnerKit } from "@abraxas/partner-kit";

export async function tradingPreflight(receiptId) {
  const check = await verifyReceipt(receiptId);
  if (!check.grant) return { allowed: false, reason: check.outcome };
  const kit = new AbraxasPartnerKit({
    partnerId: await getSecret("ABRAXAS_PARTNER_ID"),
    policyId: await getSecret("ABRAXAS_POLICY_ID"),
    policyVersion: Number(await getSecret("ABRAXAS_POLICY_VERSION")),
    requirePolicyVersion: true,
    environment: "sandbox",
  });
  return new AbraxasTradingVenueAdapter({ kit }).authorize({
    action_type: "enable_market_access",
    action_scope: "sandbox:market_access",
  });
}
`,
    }] : []),
    ...(include.payment ? [{
      path: "backend/payment-preflight.web.js",
      contents: `import { verifyReceipt } from "backend/abraxas.web";
import { AbraxasPaymentAuthorizationAdapter } from "@abraxas/partner-kit/payment-authorization";
import { getSecret } from "wix-secrets-backend";
import { AbraxasPartnerKit } from "@abraxas/partner-kit";

export async function paymentPreflight(receiptId) {
  const check = await verifyReceipt(receiptId);
  if (!check.grant) return { allowed: false, reason: check.outcome };
  const kit = new AbraxasPartnerKit({
    partnerId: await getSecret("ABRAXAS_PARTNER_ID"),
    policyId: await getSecret("ABRAXAS_POLICY_ID"),
    policyVersion: Number(await getSecret("ABRAXAS_POLICY_VERSION")),
    requirePolicyVersion: true,
    environment: "sandbox",
  });
  return new AbraxasPaymentAuthorizationAdapter({ kit }).authorize({
    action_type: "authorize_checkout",
    action_scope: "sandbox:checkout",
  });
}
`,
    }] : []),
    ...(include.portable ? [{
      path: "backend/portable-preflight.web.js",
      contents: `import { AbraxasPortableActionAdapter } from "@abraxas/partner-kit/portable-action-contract";
import { getSecret } from "wix-secrets-backend";

export async function portablePreflight(receiptId) {
  const adapter = new AbraxasPortableActionAdapter({
    partnerId: await getSecret("ABRAXAS_PARTNER_ID"),
    policyId: await getSecret("ABRAXAS_POLICY_ID"),
    policyVersion: Number(await getSecret("ABRAXAS_POLICY_VERSION")),
    requirePolicyVersion: true,
    environment: "sandbox",
  });
  const contract = adapter.issueActionContract({
    action_type: "grant_membership_access",
    action_scope: "sandbox:membership_access",
  });
  if ("ok" in contract && contract.ok === false) return { allowed: false, reason: contract.reason };
  const verified = await adapter.verifySignedReceipt(receiptId);
  return adapter.preflight({ result: verified, contract });
}
`,
    }] : []),
    ...(include.evm ? [{
      path: "backend/evm-preflight.web.js",
      contents: `import { AbraxasEvmPartnerAdapter } from "@abraxas/partner-kit/evm";
import { getSecret } from "wix-secrets-backend";

export async function evmPreflight(receiptId) {
  const adapter = new AbraxasEvmPartnerAdapter({
    partnerId: await getSecret("ABRAXAS_PARTNER_ID"),
    policyId: await getSecret("ABRAXAS_POLICY_ID"),
    policyVersion: Number(await getSecret("ABRAXAS_POLICY_VERSION")),
    requirePolicyVersion: true,
    environment: "sandbox",
  });
  const contract = adapter.issueActionContract({
    action_type: "enable_protocol_access",
    action_scope: "sandbox:protocol_access",
  });
  if ("ok" in contract && contract.ok === false) return { allowed: false, reason: contract.reason };
  const verified = await adapter.verifySignedReceipt(receiptId);
  const result = await adapter.preflight({ result: verified, contract });
  if (!result.allowed) return result;
  // PARTNER EXECUTION BELONGS HERE.
  return result;
}
`,
    }] : []),
    ...(include.wallet ? [{
      path: "backend/wallet-binding.web.js",
      contents: `import { signWalletStandardChallenge } from "@abraxas/partner-kit/wallet-standard";

export async function optionalWalletBinding(messageSigner) {
  return signWalletStandardChallenge({ wallet: messageSigner, purpose: "optional_action_binding" });
}
`,
    }] : []),
  ];
}

export function serverlessFiles(include: {
  webhook: boolean;
  venue: boolean;
  payment: boolean;
  solana: boolean;
  wallet: boolean;
  portable: boolean;
  evm: boolean;
}): StarterKitFile[] {
  return [
    {
      path: "PROVIDER.md",
      contents: `# Serverless handler substitutions

The handlers below are framework-neutral. Map them to your host:

- Vercel Functions: export GET/POST from \`api/abraxas/[name].ts\` using the same body.
- Cloudflare Workers: wrap \`handleCallback\` / \`handleWebhook\` in \`fetch(request)\`.
- Netlify Functions: export an async handler that reads \`event.rawQuery\` / \`event.body\`.

Secrets stay in the function environment. Do not embed them in static assets.
`,
    },
    {
      path: "src/handlers/callback.ts",
      contents: `import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

export async function handleCallback(search: string) {
  const result = await kit.verifyCallback(new URLSearchParams(search));
  if (!permitProtocolAction(result)) {
    return { status: 403, body: { action: "deny", outcome: result.outcome } };
  }
  return { status: 200, body: { action: "permit", outcome: "permitted" } };
}
`,
    },
    ...(include.webhook ? [{
      path: "src/handlers/webhook.ts",
      contents: `import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";
import { verifyPartnerWebhookEvent } from "@abraxas/partner-kit/webhooks";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});
const seenEventIds = new Set<string>();

export async function handleWebhook(input: { rawBody: string; timestamp: string; signature: string }) {
  const verified = verifyPartnerWebhookEvent({
    secret: process.env.ABRAXAS_WEBHOOK_SECRET ?? "${P.webhook_secret}",
    timestamp: input.timestamp,
    rawBody: input.rawBody,
    signatureHeader: input.signature,
    expectedPartnerId: kit.options.partnerId,
    seenEventIds,
  });
  if (!verified.ok) return { status: 400, body: { accepted: false } };
  if (verified.duplicate || !verified.payload.receipt_id) {
    return { status: 200, body: { accepted: true, grant: false } };
  }
  const result = await kit.verifyReceiptId(verified.payload.receipt_id);
  return {
    status: 200,
    body: { accepted: true, grant: permitProtocolAction(result), outcome: result.outcome },
  };
}
`,
    }] : []),
    ...(include.venue ? [{
      path: "src/handlers/trading-preflight.ts",
      contents: `import { AbraxasTradingVenueAdapter } from "@abraxas/partner-kit/trading-venue";
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function tradingPreflight(receiptId: string) {
  const receipt = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(receipt)) return { allowed: false, reason: receipt.outcome };
  return new AbraxasTradingVenueAdapter({ kit }).authorize({
    action_type: "enable_market_access",
    action_scope: "sandbox:market_access",
  });
}
`,
    }] : []),
    ...(include.payment ? [{
      path: "src/handlers/payment-preflight.ts",
      contents: `import { AbraxasPaymentAuthorizationAdapter } from "@abraxas/partner-kit/payment-authorization";
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function paymentPreflight(receiptId: string) {
  const receipt = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(receipt)) return { allowed: false, reason: receipt.outcome };
  return new AbraxasPaymentAuthorizationAdapter({ kit }).authorize({
    action_type: "authorize_checkout",
    action_scope: "sandbox:checkout",
  });
}
`,
    }] : []),
    ...(include.portable ? [{
      path: "src/handlers/portable-preflight.ts",
      contents: `import { AbraxasPortableActionAdapter } from "@abraxas/partner-kit/portable-action-contract";

const adapter = new AbraxasPortableActionAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function portablePreflight(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "partner_protocol_action",
    action_scope: "sandbox:partner_protocol",
  });
  if ("ok" in contract && contract.ok === false) return { allowed: false, reason: contract.reason };
  const verified = await adapter.verifySignedReceipt(receiptId);
  return adapter.preflight({ result: verified, contract });
}
`,
    }] : []),
    ...(include.evm ? [{
      path: "src/handlers/evm-preflight.ts",
      contents: `import { AbraxasEvmPartnerAdapter } from "@abraxas/partner-kit/evm";

const adapter = new AbraxasEvmPartnerAdapter({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function evmPreflight(receiptId: string) {
  const contract = adapter.issueActionContract({
    action_type: "enable_protocol_access",
    action_scope: "sandbox:protocol_access",
  });
  if ("ok" in contract && contract.ok === false) return { allowed: false, reason: contract.reason };
  const verified = await adapter.verifySignedReceipt(receiptId);
  const result = await adapter.preflight({ result: verified, contract });
  if (!result.allowed) return result;
  // PARTNER EXECUTION BELONGS HERE.
  return result;
}
`,
    }] : []),
    ...(include.solana ? [{
      path: "src/handlers/solana-gate.ts",
      contents: `import { AbraxasSolanaPartnerAdapter } from "@abraxas/partner-kit/solana";
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";

const kit = new AbraxasPartnerKit({
  partnerId: process.env.ABRAXAS_PARTNER_ID ?? "${P.partner_id}",
  policyId: process.env.ABRAXAS_POLICY_ID ?? "${P.policy_id}",
  policyVersion: Number(process.env.ABRAXAS_POLICY_VERSION ?? "${P.policy_version}"),
  requirePolicyVersion: true,
  environment: "sandbox",
});

export async function solanaEligibilityGate(receiptId: string) {
  const receipt = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(receipt)) return { allowed: false, reason: receipt.outcome };
  return new AbraxasSolanaPartnerAdapter({ kit }).verifyEligibility({
    creates_transactions: false,
    funds_movement: false,
  });
}
`,
    }] : []),
    ...(include.wallet ? [{
      path: "src/handlers/wallet-binding.ts",
      contents: `import { signWalletStandardChallenge } from "@abraxas/partner-kit/wallet-standard";

export async function optionalWalletBinding(wallet: { signMessage: (message: Uint8Array) => Promise<Uint8Array> }) {
  return signWalletStandardChallenge({ wallet, purpose: "optional_action_binding" });
}
`,
    }] : []),
  ];
}
