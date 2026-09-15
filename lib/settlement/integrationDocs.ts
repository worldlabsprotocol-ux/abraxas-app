// FILE: lib/settlement/integrationDocs.ts

import type { ArcSettlementConfigRow } from "@/lib/settlement/types";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { ARC_ENVIRONMENTS } from "@/lib/settlement/constants";
import { SITE_URL } from "@/lib/siteUrl";

export interface ArcSettlementIntegrationDocs {
  payment_link: string;
  javascript_example: string;
  typescript_server_example: string;
  contract_address: string | null;
  explorer_link: string | null;
  settlement_verification_example: string;
  testnet_label: string;
  usdc_token_address: string;
  chain_id: number;
}

export function buildArcSettlementIntegrationDocs(
  app: LaunchpadApplicationRow,
  config: ArcSettlementConfigRow,
): ArcSettlementIntegrationDocs {
  const arc = ARC_ENVIRONMENTS.arc_testnet;
  const contract = config.settlement_contract_address;
  const explorerLink = contract ? `${arc.explorerUrl}/address/${contract}` : null;
  const paymentLink = `${SITE_URL}/developers/arc-demo?app=${encodeURIComponent(app.public_slug)}`;

  return {
    payment_link: paymentLink,
    javascript_example: `// Arc Testnet hosted payment link (TESTNET funds have no real value)
const paymentUrl = new URL("${SITE_URL}/developers/arc-demo");
paymentUrl.searchParams.set("app", "${app.public_slug}");
window.location.assign(paymentUrl.toString());`,
    typescript_server_example: `// Request a proof gated settlement authorization (server side only)
const res = await fetch(
  \`\${process.env.ABRAXAS_BASE_URL}/api/launchpad/applications/${app.id}/settlement/authorize\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.ABRAXAS_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      receipt_id: receiptId,
      eligible_wallet: walletAddress,
      amount_micro_usdc: "10000",
      environment: "sandbox",
    }),
  },
);
if (!res.ok) throw new Error("settlement_authorization_failed");
const { authorization } = await res.json();`,
    contract_address: contract,
    explorer_link: explorerLink,
    settlement_verification_example: `// Confirm settlement only after Arc Testnet transaction succeeds
const confirmRes = await fetch(
  \`\${process.env.ABRAXAS_BASE_URL}/api/launchpad/applications/${app.id}/settlement/confirm\`,
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.ABRAXAS_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      authorization_id: authorization.authorization_id,
      transaction_hash: txHash,
    }),
  },
);`,
    testnet_label: "Arc Testnet TESTNET",
    usdc_token_address: config.usdc_token_address,
    chain_id: config.chain_id,
  };
}
