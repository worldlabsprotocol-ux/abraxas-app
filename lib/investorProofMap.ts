import { publicHomeFlowById } from "@/lib/product/publicFlowManifest";
import { getNetworkCapability } from "@/lib/partner/networkCapability";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";

export type InvestorProofStatus = "available" | "sandbox" | "code_ready" | "planned";

export interface InvestorProofItem {
  id: string;
  title: string;
  status: InvestorProofStatus;
  detail: string;
  evidenceHref: string;
  nextGate: string;
}

const goodTrouble = publicHomeFlowById("good-trouble");
const cielo = publicHomeFlowById("cielo-registry");
const solana = getNetworkCapability("solana_devnet");
const evm = getNetworkCapability("evm_sepolia");

if (!goodTrouble || !cielo || !solana || !evm) {
  throw new Error("investor_proof_source_missing");
}

export const INVESTOR_PROOF_STATUS_LABEL: Record<InvestorProofStatus, string> = {
  available: "Available",
  sandbox: "Sandbox example",
  code_ready: "Code ready · not deployed",
  planned: "Planned",
};

/** Source-owned product posture; these rows never infer a live chain deployment from a configured adapter. */
export const INVESTOR_PROOF_MAP: readonly InvestorProofItem[] = [
  {
    id: "good-trouble",
    title: goodTrouble.title,
    status: goodTrouble.status === "sandbox" ? "sandbox" : "planned",
    detail: goodTrouble.endState,
    evidenceHref: goodTrouble.route,
    nextGate: "An independent partner production integration and measured usage.",
  },
  {
    id: "institutional",
    title: "Institutional eligibility",
    status: "sandbox",
    detail: `${SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID} v1: ${SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE}`,
    evidenceHref: "/docs/organization-eligibility",
    nextGate: "A reviewed live issuer, external partner validation, and Production policy approval.",
  },
  {
    id: "solana",
    title: "Solana partner-owned gate",
    status: solana.status === "configured" ? "code_ready" : "planned",
    detail: "Reviewed V2 verifier artifact and local ProgramTest. No public devnet program ID or registered deployment is claimed.",
    evidenceHref: "/docs/solana-onchain-eligibility-gate",
    nextGate: "Human devnet deployment, independent observation, and verified sandbox registration.",
  },
  {
    id: "evm",
    title: "EVM partner-owned gate",
    status: evm.status === "configured" ? "code_ready" : "planned",
    detail: "Sepolia deployment kit and local contract tests. No live partner contract or transaction is claimed.",
    evidenceHref: "/docs/evm-onchain-eligibility-gate",
    nextGate: "Partner testnet deployment, exact code/config verification, then registration.",
  },
  {
    id: "cielo",
    title: cielo.title,
    status: cielo.status === "planned" ? "planned" : "sandbox",
    detail: cielo.endState,
    evidenceHref: cielo.route,
    nextGate: "Independently verifiable booking and payment evidence before any live claim.",
  },
] as const;
