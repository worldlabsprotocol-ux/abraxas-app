// FILE: lib/content/blogArticles.ts
// Static blog articles — maps slugs to content until MD pipeline ships.

import type { BlogCategory } from "./types";

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  readingTime: string;
  body: string[];
  relatedHref?: string;
  /** Homepage thesis demo — act captions synced to cinematic demo */
  thesisActs?: string[];
  /** Pin on homepage and learn hub */
  featured?: boolean;
  /** Original publication URL (e.g. Medium) */
  mediumUrl?: string;
}

export const FEATURED_THESIS_BLOG_SLUG = "what-is-real-world-asset-tokenization" as const;

export function getFeaturedThesisArticle(): BlogArticle | undefined {
  return BLOG_ARTICLES.find(a => a.slug === FEATURED_THESIS_BLOG_SLUG) ?? BLOG_ARTICLES.find(a => a.featured);
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "what-is-real-world-asset-tokenization",
    title: "What Is Real-World Asset Tokenization?",
    description:
      "Abraxas: the verification layer institutions need beyond tokenization. Market context, seven institutional steps, and why minting alone is not enough.",
    category: "product",
    readingTime: "12 min",
    featured: true,
    mediumUrl:
      "https://medium.com/@worldlabsprotocol/what-is-real-world-asset-tokenization-13d6c8d0a595",
    thesisActs: [
      "Institutions are entering RWA tokenization — the market is measured in trillions, not experiments.",
      "Seven steps: select, structure, value, mint, onboard, manage, trade.",
      "Token creation alone is not enough — counterparties still re-ask who, what, and whether policy passed.",
      "Abraxas is the verify layer — reusable cryptographic proof before capital moves or agents act.",
    ],
    body: [
      "The real-world asset tokenization market is moving from experimentation to institutional adoption. Valued at roughly $1.8 trillion in 2025, industry projections reach $24.5 trillion by 2033 in optimistic scenarios — while McKinsey's base case points to approximately $2 trillion in tokenized market capitalization by 2030. For banks, asset managers, real estate firms, governments, and fintech companies, RWA tokenization is no longer just a blockchain trend; it is becoming a new way to issue, manage, and transfer ownership of physical and financial assets.",
      "RWA tokenization converts ownership rights of a physical or traditional financial asset into digital tokens recorded on a blockchain. Each token represents all or part of the underlying asset and can be transferred, traded, or managed digitally — creating a transparent, tamper-resistant record instead of relying solely on paper or siloed databases.",
      "Assets that can be tokenized include commercial and residential real estate, government bonds, private credit, gold and precious metals, carbon credits, fine art, infrastructure, and intellectual property. The process generally follows seven steps: asset selection, legal structuring, valuation, token creation, investor onboarding, asset management, and secondary trading where permitted.",
      "Compared to traditional assets, tokenized RWAs can offer fractional ownership, faster settlement potential, streamlined processes, and shared blockchain records — but they still require the same institutional questions: legal enforceability, custody, compliance, and ongoing proof that the digital token matches the underlying asset.",
      "Real-world examples are already live: BlackRock's BUIDL fund for tokenized U.S. Treasuries, Centrifuge-style private credit pools, and multiple real estate tokenization projects combining SPVs with on-chain fractional ownership. These demonstrate that RWA tokenization is expanding beyond theory into practical financial infrastructure.",
      "Yet tokenization alone is not enough. Institutions must answer: Who owns the asset? Has ownership been verified? Has investor eligibility been confirmed? Can compliance information be trusted across counterparties? Can verification be reused instead of repeated? As the market matures, attention is shifting from token creation toward identity, compliance, verification, and governance infrastructure.",
      "Abraxas is that verification layer. We issue reusable, cryptographically verifiable proofs — so compliance attestations, asset provenance, and eligibility data can travel with the asset while maintaining auditability across counterparties and chains. Cielo Sunrise and Chickasaw land diligence are live proof on Abraxas today.",
      "Blockchain was not invented for another coin — it was invented for proof of authentication without a central authority. That is what institutions still need: who verified what, when, and whether anyone can check it independently. Abraxas anchors that proof on Sui.",
      "Long-term success depends not only on creating digital tokens but on building trusted verification systems that support institutional adoption. Verify once. Transact everywhere. That is the thesis behind everything we are building at abraxasworld.xyz.",
    ],
    relatedHref: "/integrate",
  },
  {
    slug: "verify-before-agents-act",
    title: "Verify Before Agents Act",
    description:
      "Robinhood opened agentic trading to the world. Abraxas is the trust layer that lets agents move capital on real-world assets without rebuilding verification every time.",
    category: "product",
    readingTime: "8 min",
    featured: true,
    thesisActs: [
      "Agents can act now — Robinhood's Trading MCP connects Claude, ChatGPT, and Cursor to live brokerage accounts.",
      "Acting without verify is the trap — RWAs still need identity, asset proof, and policy gates before capital moves.",
      "Abraxas issues cryptographic proof — agent.proceed and agent.valid let any MCP agent fail closed.",
      "Compose the stack — verify once with Abraxas, then act through Robinhood or any execution layer.",
    ],
    body: [
      "Something shifted in July 2026. Robinhood opened Agentic Trading — a dedicated MCP server at agent.robinhood.com/mcp/trading — so AI agents can read portfolios, research markets, and place orders in an isolated Agentic account. Claude, ChatGPT, Cursor, Codex, and Grok can all connect. The act layer of finance just went agent-native.",
      "That is exciting. It is also incomplete for real-world assets. Trading a liquid equity is not the same as allocating into a verified hotel, a surveyed land parcel, or a passport-gated STR booking. Every RWA counterparty still asks the same questions: who is this person, what asset is this, did it pass policy, and can I independently check that answer?",
      "Tokenization alone does not solve that. Minting on-chain does not collapse repeated KYC, appraisal resends, or title diligence. The hidden cost of verification is time, drop-off, and trust erosion — hospitality operators feel it at checkout, land sellers feel it when every buyer's lender wants the same plat PDFs.",
      "Abraxas sits upstream of the act layer. We are not a Robinhood integration and we are not competing with their MCP. We are the verify layer: POST /api/credentials/verify returns a decision plus a signed authentication proof. Any agent can GET that proof and check agent.valid before it calls place_equity_order or any other execution tool.",
      "This is the thesis we have been building toward. Cielo Sunrise and Chickasaw land diligence are live proof — real assets, real verify records, not deck slides. As agentic finance scales, the builders who compose verify → act will move faster than teams rebuilding trust per app.",
      "Robinhood lets agents trade. Abraxas lets agents know what they are trading on — and who has already been verified to interact with it. Verify once. Let any MCP-connected agent gate on proof. Then act.",
    ],
    relatedHref: "/docs/ai-agents",
  },
  {
    slug: "why-tokenization-alone-isnt-enough",
    title: "Why Tokenization Alone Isn't Enough",
    description: "Minting tokenized real-world assets on-chain does not create institutional trust — the gap is repeated asset verification.",
    category: "problem",
    readingTime: "6 min",
    body: [
      "The RWA market crossed $30B because institutions want liquidity — not because minting a token magically creates trust.",
      "Counterparties still re-run KYC, re-request appraisals, and re-verify title at every transaction. That friction is where deals die.",
      "Abraxas positions assets before the legacy system catches up: verify once, consent-based reuse, policy-gated decisions at transaction time.",
    ],
    relatedHref: "/build",
  },
  {
    slug: "hidden-cost-repeated-verification",
    title: "The Hidden Cost of Repeated Verification",
    description: "Time, drop-off, trust erosion, and support burden.",
    category: "problem",
    readingTime: "7 min",
    body: [
      "Every repeated document upload is a conversion leak. Every manual review is margin burned.",
      "Hospitality operators feel this on guest checkout. Land sellers feel it when every buyer's lender asks for the same plat PDFs.",
      "Reusable credentials collapse that loop — the holder controls disclosure, the relying party checks live state.",
    ],
    relatedHref: "/trust-framework",
  },
  {
    slug: "cielo-sunrise-proof-model-works",
    title: "Cielo Sunrise: Proof That the Model Works",
    description: "Genesis asset — appraisal, STR revenue, USDC on Sui.",
    category: "proof",
    readingTime: "10 min",
    body: [
      "Cielo Sunrise is the first asset run through the full Abraxas loop: registry, passport-gated booking, verified guest policy, and on-chain settlement path.",
      "This is not a deck slide — it is a live property with real revenue and a public verify record.",
    ],
    relatedHref: "/case-studies/cielo",
  },
  {
    slug: "reusable-trust-institutional-finance",
    title: "How Reusable Trust Changes Institutional Finance",
    description: "Reusable verification infrastructure — W3C credentials, zkLogin, and blockchain verification across institutional RWA counterparties.",
    category: "product",
    readingTime: "8 min",
    body: [
      "Institutions do not need another identity silo. They need a minimum proof envelope that fails closed when state drifts.",
      "Abraxas issues signed claims, partners evaluate policy server-side, and monitoring feeds refresh or suspend attestations when material facts change.",
    ],
    relatedHref: "/integrate",
  },
  {
    slug: "founder",
    title: "From the builder",
    description: "Why Abraxas exists — twenty years in markets, one verification model.",
    category: "founder",
    readingTime: "5 min",
    body: [
      "I traded through every macro regime that taught me the same lesson: the edge is not information alone — it is acting before the crowd prices it in.",
      "Tokenization without verification is a timing trap. Legacy assets go on-chain quietly, then extract a premium from people who waited.",
      "Abraxas is the protocol layer to position assets now — verify, tokenize-ready, transact with reusable trust — so holders exercise options when the chain opens, not after.",
    ],
    relatedHref: "/about/team",
  },
];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find(a => a.slug === slug);
}
