// FILE: lib/protocolContent.ts
// Shared copy for protocol pages. Single source, no fabricated metrics.

export const ROADMAP = [
  {
    phase: "Live now",
    color: "#10B981",
    items: [
      "Sui zkLogin sign-in on /passport (Google → Sui address)",
      "Verified credential system (W3C VC, did:sui, Ed25519 signed JWT)",
      "Social verification via Reclaim Protocol (LinkedIn, X, GitHub, Gmail)",
      "Identity verification via Veriff in-context SDK",
      "Sui Passport Move module on devnet + live object panel",
      "Wyoming LLC formation flow",
      "Asset verification pipeline (10-stage V5 lifecycle)",
      "Music royalty audit intake",
      "Cielo Sunrise verified asset with real gallery and stablecoin booking",
      "Dark premium homepage redesign",
    ],
  },
  {
    phase: "In progress",
    color: "#F59E0B",
    items: [
      "Document review for Business, Property, and Asset Owner stamps",
      "Self-serve purchase lifecycle status for buyers",
      "On-chain stamp issuance after Veriff approve (sui_passport_objects)",
      "Sponsored transaction treasury + tier allowances",
    ],
  },
  {
    phase: "Up next",
    color: "#3B82F6",
    items: [
      "Sui mainnet Passport deployment",
      "Intent message signing for integrators (gas-free proofs)",
      "x402 HTTP payment path for verification packages",
      "Institutional-grade secure storage integration (Utila)",
      "Passport accepted on external protocols",
      "Public bug bounty program",
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
    a: "Because a paper record can be lost, altered, or only trusted if you trust whoever's holding it. A verified Passport on Sui doesn't depend on trusting Abraxas forever — stamp bitmask and credentials are checkable by anyone.",
  },
  {
    q: "Why Sui and zkLogin?",
    a: "You sign in with Google — no seed phrase, no browser wallet extension for verification. Sui gives low-cost transactions, sponsored gas for verified tiers, and personal-message proofs integrators can verify off-chain.",
  },
  {
    q: "Why Abraxas?",
    a: "World Labs, the founder's own company, went through the exact same verification process before anyone else's asset did. That's not a slogan, it's the actual first thing that happened. Every asset since has been held to that same standard.",
  },
  {
    q: "What happens to my money?",
    a: "Stablecoin payments route to the Abraxas treasury. Internally, your transaction moves through real stages: Authorized when you confirm you've sent it, Captured once our team verifies the transfer, Settled once everything is wrapped up.",
  },
  {
    q: "Do I need $ABRA to use Abraxas?",
    a: "No. You can verify identity, browse verified assets, and complete bookings without holding $ABRA. The token is an optional participation layer for fee reductions and future governance, not a gate to verification.",
  },
  {
    q: "Are projected yields guaranteed?",
    a: "No. Any yield, APR, or ROI figures shown on a specific asset page come from that asset's own documentation or operating history and are labeled accordingly. Abraxas verifies the asset and credential chain, it does not guarantee investment returns.",
  },
  {
    q: "How do partners integrate the Passport?",
    a: "Integrators call POST /api/credentials/verify with a presentation proof, or read stamp bitmask via GET /api/sui/passport. Public keys at /api/credentials/public-key. Full Sui hub at /docs/sui.",
  },
] as const;

export const DOCS_SECTIONS = [
  {
    title: "Architecture overview",
    body: "Abraxas verification is Sui-native. Identity: zkLogin (Google) → Sui address. Stamps: Veriff + Reclaim + manual review. Credentials: W3C VC with did:sui. On-chain: Move Passport object with 52-byte root semantics. See /docs/sui for the full feature map.",
  },
  {
    title: "Credential verification API",
    body: "POST /api/credentials/verify accepts a presentation JWT and returns verification status. GET /api/credentials/public-key publishes the issuer public key. GET /api/sui/passport reads on-chain stamp bitmask by object ID or owner.",
  },
  {
    title: "Asset verification pipeline (V5)",
    body: "Ten stages: SUBMITTED → IDENTITY_REVIEW → OWNERSHIP_REVIEW → LEGAL_REVIEW → DUE_DILIGENCE → RISK_SCORING → APPROVAL_COMMITTEE → TOKENIZATION_AUTH → MINTED → MARKETPLACE_LIVE. Each stage assigns human review, required documents, and an audit log entry.",
  },
  {
    title: "Identity providers",
    body: "Veriff: government ID + liveness on /passport. Reclaim Protocol: LinkedIn, X, GitHub, Gmail via zkTLS. Business, Property, and Asset Owner tiers use manual document review. All tied to Sui holder address after zkLogin.",
  },
  {
    title: "Sponsored transactions (roadmap)",
    body: "Verified Passport tiers receive a monthly allowance of gas-sponsored Sui actions (stamp updates, credential anchoring). Funded by a micro-fee on verification growth into SUI_SPONSOR_TREASURY_ADDRESS. Tier table at /docs/sui#sponsored.",
  },
  {
    title: "Developer resources",
    body: "GitHub: github.com/worldlabsprotocol-ux/abraxas-app. Sui hub: /docs/sui. Operator setup: /docs/zklogin-setup. Passport spec: /docs/passport-spec. Machine-readable: GET /api/passport/spec.",
  },
] as const;

export const SECURITY_ITEMS = [
  {
    title: "What we do today",
    items: [
      "Supabase Row Level Security on every table",
      "W3C VC credentials: proof portable, documents off-chain with certified providers",
      "Veriff handles ID storage, Abraxas stores verification status only",
      "Ed25519 signed JWTs for credential issuance (did:sui)",
      "zkLogin user salt stored server-side only",
      "Manual review for high-risk stamps (Business, Property, Asset Owner)",
    ],
  },
  {
    title: "In progress",
    items: [
      "Sui mainnet Passport audit before external CPI integrations",
      "Formal security review of credential verification API",
      "Sponsor treasury multisig for production",
      "Public bug bounty program (planned post-audit)",
    ],
  },
  {
    title: "Key management & custody",
    items: [
      "ABRAXAS_SIGNING_KEY in Vercel env only — never in client code",
      "Service role key server-side only for Supabase writes",
      "OAuth via Google; no passwords stored for zkLogin users",
      "Utila MPC custody for verified assets requiring institutional storage",
      "zkLogin for verification identity — no browser wallet required on /passport",
    ],
  },
] as const;

export const TOKENOMICS = {
  symbol: "$ABRA",
  chain: "Sui (verification) · SPL treasury token",
  contract: "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
  treasury: "circuit.skr",
  distribution: "Launched via Bags.fm fair launch. Bonding curve. No pre-mine ahead of public.",
  holdersNote: "Verify holder count on-chain before relying on marketing figures.",
  notRequired: "$ABRA is not required to verify identity (zkLogin on Sui), browse assets, or pay in stablecoin. Verification is Sui-native; $ABRA is optional for fee tiers.",
  utility: [
    { role: "Access tiers", desc: "Hold $ABRA for Initiate → Operator → Architect → Sovereign tiers. Higher tiers unlock fee reductions.", active: true },
    { role: "Sponsor pool", desc: "Share of verification growth fees funds Sui sponsored transactions for Passport tiers (roadmap).", active: false },
    { role: "Fee reduction", desc: "Operator (10k+): 10% off. Architect (100k+): 25% off. Sovereign (1M+): 50% off platform fees.", active: true },
    { role: "Verification revenue", desc: "Protocol earns from verification packages. Token does not gate /passport verification.", active: true },
    { role: "Governance", desc: "Sovereign-tier input on vault parameters and sponsor treasury policy. Not live yet.", active: false },
  ],
  tiers: [
    { name: "Initiate", amount: "0", benefit: "Full platform access, zkLogin verification" },
    { name: "Operator", amount: "10,000 $ABRA", benefit: "10% fee reduction" },
    { name: "Architect", amount: "100,000 $ABRA", benefit: "25% fee reduction, priority support" },
    { name: "Sovereign", amount: "1,000,000 $ABRA", benefit: "50% fee reduction, governance weight (when live)" },
  ],
} as const;
