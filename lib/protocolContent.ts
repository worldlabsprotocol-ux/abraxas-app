// FILE: lib/protocolContent.ts
// Shared copy for protocol pages. Single source, no fabricated metrics.

export const ROADMAP = [
  {
    phase: "Live now",
    color: "#10B981",
    items: [
      "Core verification + Passport issuance in production",
      "Verified credential system (W3C VC, Ed25519 signed JWT)",
      "Identity verification via Veriff in-context SDK",
      "Social verification via Reclaim Protocol (LinkedIn, X, GitHub, Gmail)",
      "Asset verification pipeline (10-stage V5 lifecycle)",
      "Cielo Sunrise verified asset with real gallery and stablecoin booking",
      "Land deal pipeline with on-registry proof",
      "Stablecoin checkout (Buy Now / Book Now)",
      "Wyoming LLC formation flow",
      "Music royalty audit intake",
    ],
  },
  {
    phase: "Final gates",
    color: "#F59E0B",
    items: [
      "Automated asset state monitoring (refresh / revoke on change)",
      "Sui Passport on mainnet (deployment after security audit)",
      "First fully external relying party production transaction",
      "Published security audits (Move Passport + Credential API)",
      "Self-serve integrate + public bug bounty",
    ],
  },
  {
    phase: "Up next",
    color: "#3B82F6",
    items: [
      "Institutional-grade secure storage integration (Utila)",
      "Passport accepted across external protocols at scale",
      "Automated on-chain payment verification",
      "Document review automation for Business, Accredited, and Asset Owner stamps",
    ],
  },
] as const;

export const FAQ_ITEMS = [
  {
    q: "Why tokenization?",
    a: "Because right now, proving you own something real, and proving it's actually worth what you say, takes paperwork, phone calls, and trust in a stranger's word. Tokenization turns that proof into something portable, checked once, then carried with the asset everywhere it goes.",
  },
  {
    q: "Why not just buy the asset normally?",
    a: "You still can. Abraxas doesn't replace a deed or a title, it sits on top of it. What it adds is a verified record anyone can check before they commit money, and a way to invest in or borrow against that asset using stablecoins instead of waiting on a bank.",
  },
  {
    q: "Why blockchain?",
    a: "Because a paper record can be lost, altered, or only trusted if you trust whoever's holding it. A verified record on Solana doesn't depend on trusting Abraxas forever, it's checkable by anyone, anytime, without calling us first.",
  },
  {
    q: "Why Abraxas?",
    a: "World Labs, the founder's own company, went through the exact same verification process before anyone else's asset did. That's not a slogan, it's the actual first thing that happened. Every asset since has been held to that same standard.",
  },
  {
    q: "What happens to my money?",
    a: "You send stablecoin directly to the treasury wallet. Internally, your transaction moves through real stages: Authorized when you confirm you've sent it, Captured once our team verifies the transfer on-chain (typically within one business day), Settled once everything is wrapped up. A self-serve status check is in progress, for now we follow up directly by email at each stage.",
  },
  {
    q: "Do I need $ABRA to use Abraxas?",
    a: "No. You can verify identity, browse verified assets, and complete stablecoin bookings without holding $ABRA. The token is an optional participation layer for fee reductions and future governance, not a gate to verification.",
  },
  {
    q: "Are projected yields guaranteed?",
    a: "No. Any yield, APR, or ROI figures shown on a specific asset page come from that asset's own documentation or operating history and are labeled accordingly. Abraxas verifies the asset and credential chain, it does not guarantee investment returns.",
  },
  {
    q: "How do partners integrate the Passport?",
    a: "Core verification is live today. Integrators call POST /api/credentials/verify with a presentation proof; public keys are at /api/credentials/public-key. Partner integrations are active — see /integrate for the verify API, trust model, and design partner program. Full self-serve onboarding opens after the final mainnet gates.",
  },
] as const;

export const DOCS_SECTIONS = [
  {
    title: "Architecture overview",
    body: "Abraxas is a verification and credential layer on Solana. Identity flows through Veriff. Social proofs use Reclaim Protocol zkTLS. Credentials follow W3C Verifiable Credentials Data Model v2.0, signed with Ed25519. Raw documents are not stored on-chain, only cryptographic attestations.",
  },
  {
    title: "Credential verification API",
    body: "POST /api/credentials/verify accepts a presentation JWT and returns verification status. GET /api/credentials/public-key publishes the issuer public key for independent verification. Issuer URL: https://abraxas-app.vercel.app",
  },
  {
    title: "Asset verification pipeline (V5)",
    body: "Ten stages: SUBMITTED → IDENTITY_REVIEW → OWNERSHIP_REVIEW → LEGAL_REVIEW → DUE_DILIGENCE → RISK_SCORING → APPROVAL_COMMITTEE → TOKENIZATION_AUTH → MINTED → MARKETPLACE_LIVE. Each stage assigns human review, required documents, and an audit log entry.",
  },
  {
    title: "Identity providers",
    body: "Veriff: government ID + liveness, embedded in-context on /passport. Reclaim Protocol: LinkedIn, X, GitHub, Gmail via zkTLS proofs. Accredited Investor: manual review only under SEC Rule 506(c), not self-serve.",
  },
  {
    title: "Treasury and payments",
    body: "Stablecoin payments route to treasury wallet circuit.skr on Solana mainnet. Purchase lifecycle: Authorized → Captured → Disputed → Settled. Large amounts may be flagged for manual review.",
  },
  {
    title: "Developer resources",
    body: "Open-source app: github.com/worldlabsprotocol-ux/abraxas-app. Certificate spec reference: docs.abraxas.xyz/certificates. SDK and Anchor program addresses will be published after the first external integration ships.",
  },
] as const;

export const SECURITY_ITEMS = [
  {
    title: "What we do today",
    items: [
      "Supabase Row Level Security on every table",
      "W3C VC credentials: proof on-chain, documents off-chain with certified providers",
      "Veriff handles ID storage, Abraxas stores verification status only",
      "Ed25519 signed JWTs for credential issuance",
      "Manual review for high-risk stamps (Accredited Investor, Business, Property)",
      "Purchase lifecycle with dispute and refund states",
    ],
  },
  {
    title: "Final gates",
    items: [
      "Sui Passport Move contract audit (in progress)",
      "Formal security review of credential verification API",
      "Public bug bounty program (opens post-audit)",
    ],
  },
  {
    title: "Custody partners",
    items: [
      "Utila MPC custody for verified assets requiring institutional storage",
      "Self-custody via Phantom/Solflare for user-initiated stablecoin payments",
    ],
  },
] as const;

export const TOKENOMICS = {
  symbol: "$ABRA",
  chain: "Solana (SPL)",
  contract: "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
  treasury: "circuit.skr",
  distribution: "Launched via Bags.fm fair launch. Bonding curve. No pre-mine ahead of public.",
  holdersNote: "47 holders as of April 2026 (verify live on Solscan before relying on this figure).",
  notRequired: "$ABRA is not required to verify identity, browse assets, or pay in stablecoin. It is an optional layer for fee benefits and future governance.",
  utility: [
    { role: "Access tiers", desc: "Hold $ABRA for Initiate → Operator → Architect → Sovereign tiers. Higher tiers unlock fee reductions.", active: true },
    { role: "Fee reduction", desc: "Operator (10k+): 10% off. Architect (100k+): 25% off. Sovereign (1M+): 50% off platform fees.", active: true },
    { role: "Verification revenue", desc: "Protocol earns from verification packages ($29 identity, $199+ business/property tiers). Token does not gate verification today.", active: true },
    { role: "Revenue sharing", desc: "At graduation from beta: 25% of vault fees to buy-and-distribute for holders. Not live yet.", active: false },
    { role: "Governance", desc: "Sovereign-tier input on vault parameters and fee structure. Not live yet.", active: false },
  ],
  tiers: [
    { name: "Initiate", amount: "0", benefit: "Full platform access, no token required" },
    { name: "Operator", amount: "10,000 $ABRA", benefit: "10% fee reduction" },
    { name: "Architect", amount: "100,000 $ABRA", benefit: "25% fee reduction, priority support" },
    { name: "Sovereign", amount: "1,000,000 $ABRA", benefit: "50% fee reduction, governance weight (when live)" },
  ],
} as const;
