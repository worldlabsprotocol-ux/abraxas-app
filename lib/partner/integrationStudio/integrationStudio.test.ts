import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";
import { GET } from "@/app/api/developers/integration-studio/route";
import {
  INTEGRATION_STUDIO_CHECKLIST,
  INTEGRATION_STUDIO_PATH,
  INTEGRATION_STUDIO_PROVISION,
  studioPackContract,
  studioPayloadLeaks,
  studioPublicCatalog,
  studioSnippetForPath,
} from "@/lib/partner/integrationStudio";

describe("Integration Studio", () => {
  it("renders every existing policy pack with a withheld list and Google account boundary", () => {
    for (const pack of POLICY_PACK_LIST) {
      const contract = studioPackContract(pack.id);
      expect(contract?.pack_id).toBe(pack.id);
      expect(contract?.disclosed_result).toBe(pack.disclosed_result);
      expect(contract?.withheld.length).toBeGreaterThan(0);
      expect(contract?.identity_is_default).toBe(false);
      expect(contract?.google_is_account_only.toLowerCase()).toContain("account");
      expect(contract?.methods.some((method) => method.id === "account_login" && method.qualifies === false)).toBe(true);
    }
  });

  it("keeps identity or liveness off the default path unless that pack requires it", () => {
    const retail = studioPackContract("age_21_retail");
    const identity = studioPackContract("identity_liveness");
    expect(retail?.methods.find((method) => method.id === "identity_liveness")?.primary).toBe(false);
    expect(identity?.methods.find((method) => method.id === "identity_liveness")?.qualifies).toBe(true);
    expect(identity?.identity_is_default).toBe(false);
  });

  it("exposes the real checklist and self-service sandbox copy", () => {
    expect(INTEGRATION_STUDIO_CHECKLIST.map((item) => item.id)).toEqual([
      "hosted_verify",
      "approved_receipt",
      "server_verification",
      "expiry_revocation",
      "webhook_verification",
      "policy_version",
    ]);
    expect(INTEGRATION_STUDIO_PROVISION.requires_partner_session).toBe(true);
    expect(INTEGRATION_STUDIO_PROVISION.self_serve_sandbox).toBe(true);
    expect(INTEGRATION_STUDIO_PROVISION.self_serve_production).toBe(false);
    expect(INTEGRATION_STUDIO_PROVISION.create_sandbox_cta).toBe("Create a sandbox integration");
    expect(INTEGRATION_STUDIO_PROVISION.production_upgrade_cta).toBe(
      "Upgrade to Production after readiness review",
    );
    expect(INTEGRATION_STUDIO_PROVISION.notice.toLowerCase()).toContain("shown once");
  });

  it("reuses kit, webhook, and Solana snippets without fund movement or secrets", () => {
    const hosted = studioSnippetForPath("hosted_partner_flow").code;
    const verify = studioSnippetForPath("server_receipt_verify").code;
    const webhook = studioSnippetForPath("webhook_events").code;
    const solana = studioSnippetForPath("solana_gate").code;
    const venue = studioSnippetForPath("trading_venue").code;
    const wallet = studioSnippetForPath("wallet_standard_binding").code;
    const payment = studioSnippetForPath("payment_authorization").code;
    const portable = studioSnippetForPath("portable_action_contract").code;
    const evm = studioSnippetForPath("evm_partner_adapter").code;
    const onchain = studioSnippetForPath("onchain_protocol_gate").code;
    const solanaOnchain = studioSnippetForPath("solana_onchain_eligibility_gate").code;
    const evmOnchain = studioSnippetForPath("evm_onchain_eligibility_gate").code;
    const presentation = studioSnippetForPath("eligibility_presentation").code;
    const crossChain = studioSnippetForPath("cross_chain_protocol_access").code;
    const testnetKit = studioSnippetForPath("testnet_gate_deployment").code;
    expect(hosted).toContain("AbraxasPartnerKit");
    expect(verify).toContain("verifyCallback");
    expect(webhook).toContain("verifyPartnerWebhookEvent");
    expect(solana).toContain("AbraxasSolanaPartnerAdapter");
    expect(solana).not.toMatch(/createTransaction|sendAndConfirm|mintTo/);
    expect(venue).toContain("AbraxasTradingVenueAdapter");
    expect(venue).toContain("enable_market_access");
    expect(venue).not.toMatch(/placeOrder|submitOrder|connectWallet/);
    expect(wallet).toContain("signWalletStandardChallenge");
    expect(wallet).toContain("binding_ref");
    expect(wallet).not.toMatch(/createTransaction|signTransaction|secretKey/);
    expect(payment).toContain("AbraxasPaymentAuthorizationAdapter");
    expect(payment).toContain("authorize_checkout");
    expect(payment).not.toMatch(/createTransfer|createCharge|confirm_testnet_transfer/);
    expect(portable).toContain("AbraxasPortableActionAdapter");
    expect(portable).toContain("partner_protocol_action");
    expect(portable).toContain("never grants");
    expect(evm).toContain("AbraxasEvmPartnerAdapter");
    expect(evm).toContain("enable_protocol_access");
    expect(evm).not.toMatch(/sendTransaction|window\.ethereum|infura/i);
    expect(onchain).toContain("/api/v1/chain-attestations");
    expect(onchain).not.toMatch(/createTransfer|sendTransaction/);
    expect(solanaOnchain).toContain("partner_protocol_action");
    expect(solanaOnchain).not.toMatch(/createTransfer|sendTransaction|mainnet deployed/i);
    expect(evmOnchain).toContain("enable_protocol_access");
    expect(evmOnchain).not.toMatch(/createTransfer|sendTransaction|USDC|circle/i);
    expect(presentation).toContain("/api/v1/eligibility-presentations");
    expect(presentation).toContain("presentation_sufficient");
    expect(presentation).not.toMatch(/createTransfer|placeOrder|utila\.api/i);
    expect(crossChain).toContain("activate_protocol_access");
    expect(crossChain).not.toMatch(/createTransfer|USDC|utila\.api/i);
    expect(testnetKit).toContain("--confirm");
    expect(testnetKit).not.toMatch(/createTransfer|USDC|broadcast from browser/i);
    const catalog = studioPublicCatalog({ pathId: "wallet_standard_binding" });
    expect(catalog.solana.creates_transactions).toBe(false);
    expect(catalog.solana.funds_movement).toBe(false);
    expect(catalog.trading_venue.creates_trades).toBe(false);
    expect(catalog.trading_venue.connects_wallet).toBe(false);
    expect(catalog.wallet_standard.required_for_passport).toBe(false);
    expect(catalog.payment_authorization.creates_payments).toBe(false);
    expect(catalog.payment_authorization.calls_circle).toBe(false);
    expect(catalog.portable_action_contract.executes_action).toBe(false);
    expect(catalog.evm_partner_adapter.creates_transactions).toBe(false);
    expect(catalog.evm_partner_adapter.calls_rpc).toBe(false);
    expect(catalog.onchain_protocol_gate.creates_transactions).toBe(false);
    expect(catalog.onchain_protocol_gate.deploys_shared_contract).toBe(false);
    expect(catalog.solana_onchain_eligibility_gate.deploys_shared_program).toBe(false);
    expect(catalog.solana_onchain_eligibility_gate.funds_movement).toBe(false);
    expect(catalog.evm_onchain_eligibility_gate.deploys_shared_contract).toBe(false);
    expect(catalog.evm_onchain_eligibility_gate.circle_settlement).toBe(false);
    expect(catalog.eligibility_presentation.presentation_sufficient).toBe(false);
    expect(catalog.eligibility_presentation.utila_integration).toBe(false);
    expect(catalog.cross_chain_protocol_access.funds_movement).toBe(false);
    expect(catalog.cross_chain_protocol_access.presentation_sufficient).toBe(false);
    expect(catalog.testnet_gate_deployment.browser_deploy).toBe(false);
    expect(catalog.testnet_gate_deployment.deploys).toBe(false);
    expect(catalog.policy_compatibility.docs).toBe("/docs/policy-compatibility");
    expect(catalog.network_readiness.docs).toBe("/docs/multichain-mainnet-readiness");
    expect(catalog.network_readiness.executes_action).toBe(false);
    expect(catalog.wallet_standard.identity_verification).toBe(false);
    expect(catalog.activation.issues_production_key).toBe(false);
    expect(catalog.activation.create_cta).toBe("Create a sandbox integration");
    expect(studioPayloadLeaks({ hosted, verify, webhook, solana, venue, wallet, portable, evm, onchain, solanaOnchain, evmOnchain, presentation, crossChain, testnetKit, catalog })).toEqual([]);
  });

  it("serves a public catalog with a safe response shape", async () => {
    const res = await GET(new NextRequest("http://localhost/api/developers/integration-studio?pack=age_21_retail&path=solana_gate"));
    expect(res.status).toBe(200);
    const json = await res.json() as {
      access: string;
      partner_session_required_for_provisioning: boolean;
      contract: { pack_id: string };
      solana: { funds_movement: boolean };
    };
    expect(json.access).toBe("public");
    expect(json.partner_session_required_for_provisioning).toBe(true);
    const provision = (json as unknown as { provision: { create_sandbox_cta: string; self_serve_production: boolean } }).provision;
    expect(provision.create_sandbox_cta).toBe("Create a sandbox integration");
    expect(provision.self_serve_production).toBe(false);
    expect(json.contract.pack_id).toBe("age_21_retail");
    expect(json.solana.funds_movement).toBe(false);
    expect(studioPayloadLeaks(json)).toEqual([]);
    expect(JSON.stringify(json).toLowerCase()).not.toContain("judge");
  });

  it("rejects unknown packs and paths", async () => {
    const pack = await GET(new NextRequest("http://localhost/api/developers/integration-studio?pack=not-a-pack"));
    expect(pack.status).toBe(400);
    const path = await GET(new NextRequest("http://localhost/api/developers/integration-studio?path=mint_token"));
    expect(path.status).toBe(400);
  });

  it("is a public RedesignPage and is linked from developer navigation", () => {
    const page = readFileSync(join(process.cwd(), "app/developers/integration-studio/page.tsx"), "utf8");
    expect(page).toContain("RedesignPage");
    expect(page).not.toContain("judge");
    const developers = readFileSync(join(process.cwd(), "app/developers/page.tsx"), "utf8");
    expect(developers).toContain(INTEGRATION_STUDIO_PATH);
    const client = readFileSync(join(process.cwd(), "app/developers/integration-studio/IntegrationStudioClient.tsx"), "utf8");
    expect(client).toContain("PolicyFitPlanner");
    expect(client).toContain("PARTNER_ACTIVATION_CREATE_CTA");
    expect(client).toContain("Generate starter kit");
    expect(client).toContain("INTEGRATION_STUDIO_PROVISION.production_upgrade_cta");
    expect(client.toLowerCase()).not.toContain("operator-issued");
    expect(client.toLowerCase()).not.toContain("operator issued");
  });
});
