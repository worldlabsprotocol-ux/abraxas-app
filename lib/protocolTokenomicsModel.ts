// FILE: lib/protocolTokenomicsModel.ts
// Institutional tokenomics framework — target model; live $ABRA is fair-launched SPL.

export const TOKENOMICS_MODEL = {
  disclaimer:
    "$ABRA launched via Bags.fm fair launch on Solana. The allocation table below is the target institutional framework for future strategic rounds — not a claim that these tranches are already deployed.",
  specs: {
    ticker: "$ABRA",
    totalSupply: "1,000,000,000",
    decimals: 9,
    standard: "SPL Token-2022 (Solana)",
    verificationChain: "Sui (not gated by token)",
  },
  utility: [
    {
      name: "Work token for validators",
      desc: "Future: external appraisers, legal reviewers, and committee members stake $ABRA to participate in V5 pipeline stages. Slashing for negligent approvals.",
      status: "Planned",
    },
    {
      name: "Verification fee flywheel",
      desc: "USDC fees from passport queries and tokenization → 50% treasury / 50% programmatic buyback to reward pool.",
      status: "Planned",
    },
    {
      name: "Access tiers",
      desc: "Hold $ABRA for fee discounts on verification packages. Live today.",
      status: "Live",
    },
    {
      name: "Governance",
      desc: "Sovereign-tier input on treasury and sponsor policy.",
      status: "Planned",
    },
  ],
  allocations: [
    { category: "Seed (VC lead)", pct: "10%", cliff: "12 mo", vest: "24 mo linear", focus: "Institutional price discovery" },
    { category: "Strategic partners", pct: "5%", cliff: "9 mo", vest: "18 mo linear", focus: "Legal, appraisal, issuer networks" },
    { category: "Core team & advisors", pct: "18%", cliff: "12 mo", vest: "36 mo linear", focus: "CTO, Head of Compliance hires post-funding" },
    { category: "Ecosystem rewards", pct: "37%", cliff: "None", vest: "Dynamic emissions", focus: "Validator staking, passport incentives" },
    { category: "Public launch", pct: "5%", cliff: "None", vest: "100% at launch", focus: "Fair launch / LBP liquidity" },
    { category: "Protocol treasury", pct: "25%", cliff: "6 mo", vest: "48 mo linear", focus: "Multi-year expansion" },
  ],
  vcDefense: [
    { objection: "Why a token?", answer: "Separates USDC user fees from security coordination. $ABRA is a work token for validation — not a yield promise from a central manager." },
    { objection: "Regulatory risk", answer: "Verification runs on Sui without holding $ABRA. Token is optional access and future validator stake." },
    { objection: "Key-person risk", answer: "18% team pool under 12-month cliff reserved for post-funding senior hires." },
  ],
} as const;
