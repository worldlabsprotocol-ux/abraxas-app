// FILE: lib/content/blogArticles.ts
// Static blog articles. Homepage carousel uses HOMEPAGE_ARTICLE_SLUGS only.

import type { BlogCategory } from "./types";

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  readingTime: string;
  body: string[];
  relatedHref?: string;
  thesisActs?: string[];
  featured?: boolean;
  mediumUrl?: string;
}

export const FEATURED_THESIS_BLOG_SLUG = "what-is-real-world-asset-tokenization" as const;

/** Homepage article carousel: newest first, exactly two articles */
export const HOMEPAGE_ARTICLE_SLUGS = [
  "top-5-rwa-verification-platforms",
  "what-is-real-world-asset-tokenization",
] as const;

export function getHomepageArticles(): BlogArticle[] {
  return HOMEPAGE_ARTICLE_SLUGS
    .map(slug => BLOG_ARTICLES.find(a => a.slug === slug))
    .filter((a): a is BlogArticle => a != null);
}

export function getFeaturedThesisArticle(): BlogArticle | undefined {
  return BLOG_ARTICLES.find(a => a.slug === FEATURED_THESIS_BLOG_SLUG) ?? BLOG_ARTICLES.find(a => a.featured);
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "top-5-rwa-verification-platforms",
    title: "Top 5 RWA Verification Platforms for Real-World Asset Tokenization",
    description:
      "What RWA verification platforms do, why they matter before minting, and how five vendors compare across identity, compliance, and reusable trust infrastructure.",
    category: "product",
    readingTime: "12 min",
    featured: true,
    mediumUrl:
      "https://medium.com/@worldlabsprotocol/top-5-rwa-verification-platforms-for-real-world-asset-tokenization-35c1f5d82a49",
    body: [
      "The market for real-world asset tokenization is growing rapidly as governments, financial institutions, investment firms, and blockchain companies bring physical and financial assets onto the blockchain. From real estate and private credit to gold, carbon credits, and government bonds, tokenized real-world assets promise greater liquidity, transparency, and accessibility.",
      "However, tokenization alone is not enough.",
      "Before any asset can be trusted on-chain, someone must verify that it actually exists, confirm legal ownership, validate supporting documentation, and ensure regulatory compliance. This is where RWA Verification Platforms play a critical role.",
      "Without proper verification, even the most advanced blockchain cannot guarantee that a token truly represents the underlying asset. For institutions managing millions or even billions of dollars in institutional RWA investments, trust begins long before the first token is minted.",
      "In this guide, we explain what RWA Verification Platforms are, why they matter, and review five platforms helping build trust for the next generation of asset tokenization.",
      "RWA Verification Platforms are technology solutions that verify the identity, ownership, authenticity, and compliance of assets before or during real-world asset tokenization.",
      "Unlike tokenization platforms that issue digital tokens, RWA Verification Platforms focus on proving that the underlying information can be trusted. They may verify asset ownership, legal documentation, identity (KYC), business verification (KYB), AML compliance, wallet screening, audit trails, verifiable credentials, and regulatory requirements.",
      "For example, before a commercial building is tokenized, its title deeds, ownership records, valuation reports, and legal documents should be validated. Likewise, investors purchasing tokenized real-world assets often need to complete identity verification before participating.",
      "As institutional RWA adoption increases, verification is becoming just as important as blockchain infrastructure itself.",
      "Blockchain provides transparency, but it cannot independently determine whether an off-chain asset is genuine.",
      "Consider a token representing one kilogram of gold. The blockchain can prove who owns the token, but it cannot confirm whether the gold actually exists in a vault, whether ownership documents are authentic, or whether the asset has already been pledged elsewhere.",
      "This trust gap is one of the biggest challenges facing real-world asset tokenization.",
      "RWA Verification Platforms help bridge that gap by creating reliable links between physical assets and their digital representations. They also help organizations reduce fraud, improve compliance, speed up investor onboarding, support regulatory reporting, increase confidence among institutional investors, simplify audits, and strengthen trust in tokenized real-world assets.",
      "In real estate, property ownership documents must be validated before ownership interests can be tokenized. For gold-backed tokens, independent vault audits and proof of reserves help establish confidence that the physical metal exists. Carbon credit projects require verification to confirm that environmental claims are legitimate before credits become tokenized real-world assets. Private credit funds need verified borrower information, loan documentation, and legal agreements before participating in asset tokenization initiatives.",
      "1. Abraxas. Abraxas is an emerging RWA Verification Platform designed to solve one of the biggest inefficiencies in real-world asset tokenization: repeated verification. Instead of requiring organizations to verify the same documents repeatedly across different platforms, Abraxas focuses on reusable verification. Once an asset, business, or participant has been verified, that verification can be reused under defined policies, reducing duplicated work while maintaining auditability. Best for enterprise RWA ecosystems, government-backed projects, institutional verification, and reusable trust infrastructure.",
      "2. Didit. Didit has established itself as a strong compliance-focused RWA Verification Platform by combining identity verification with AML, KYB, wallet screening, and regulatory compliance. For companies issuing tokenized real-world assets, onboarding investors safely is just as important as verifying the underlying assets. Best for KYC, KYB, AML screening, investor verification, and compliance automation.",
      "3. Humanity Protocol. Humanity Protocol takes a privacy-first approach to digital identity. Rather than exposing unnecessary personal information, the platform uses privacy-preserving technologies that allow users to prove eligibility without revealing excessive data. Best for privacy-preserving identity, decentralized credentials, institutional compliance, and cross-border verification.",
      "4. Veriff. Although Veriff was not built exclusively for blockchain, it has become one of the most trusted enterprise identity verification providers worldwide. Banks, fintech companies, payment providers, and regulated businesses use Veriff to verify customer identities quickly while reducing fraud. Best for enterprise identity verification, financial institutions, fraud prevention, and digital onboarding.",
      "5. Sumsub. Sumsub offers a comprehensive compliance platform covering KYC, KYB, AML monitoring, transaction monitoring, and fraud prevention. Its extensive global coverage makes it particularly useful for organizations serving international investors interested in tokenized real-world assets. Best for global compliance, AML monitoring, international onboarding, and cross-border RWA projects.",
      "When evaluating RWA Verification Platforms, consider whether the platform verifies both assets and participants, whether verification can be reused across multiple applications, whether it supports KYC, KYB, and AML compliance, whether there is an auditable verification history, whether it integrates with existing tokenization platforms, whether it supports enterprise-scale deployments, and whether it can meet local regulatory requirements.",
      "As real-world asset tokenization continues to reshape global finance, trust will increasingly determine which projects succeed. While blockchain delivers transparency and efficiency, it cannot independently verify ownership, legal rights, or compliance. That responsibility belongs to RWA Verification Platforms, which form the trust layer connecting physical assets with digital markets.",
      "For organizations building the future of institutional RWA, choosing the right RWA Verification Platform is a strategic decision. Strong verification reduces risk, improves investor confidence, and lays the foundation for a more secure and scalable ecosystem of tokenized real-world assets.",
    ],
    relatedHref: "/integrate",
  },
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
      "Institutions are entering RWA tokenization. The market is measured in trillions, not experiments.",
      "Seven steps: select, structure, value, mint, onboard, manage, trade.",
      "Token creation alone is not enough. Counterparties still re-ask who, what, and whether policy passed.",
      "Abraxas is the verify layer: reusable cryptographic proof before capital moves or agents act.",
    ],
    body: [
      "The real-world asset tokenization market is moving from experimentation to institutional adoption. Valued at roughly $1.8 trillion in 2025, industry projections reach $24.5 trillion by 2033 in optimistic scenarios, while McKinsey's base case points to approximately $2 trillion in tokenized market capitalization by 2030. For banks, asset managers, real estate firms, governments, and fintech companies, RWA tokenization is no longer just a blockchain trend; it is becoming a new way to issue, manage, and transfer ownership of physical and financial assets.",
      "RWA tokenization converts ownership rights of a physical or traditional financial asset into digital tokens recorded on a blockchain. Each token represents all or part of the underlying asset and can be transferred, traded, or managed digitally, creating a transparent, tamper-resistant record instead of relying solely on paper or siloed databases.",
      "Assets that can be tokenized include commercial and residential real estate, government bonds, private credit, gold and precious metals, carbon credits, fine art, infrastructure, and intellectual property. The process generally follows seven steps: asset selection, legal structuring, valuation, token creation, investor onboarding, asset management, and secondary trading where permitted.",
      "Compared to traditional assets, tokenized RWAs can offer fractional ownership, faster settlement potential, streamlined processes, and shared blockchain records, but they still require the same institutional questions: legal enforceability, custody, compliance, and ongoing proof that the digital token matches the underlying asset.",
      "Real-world examples are already live: BlackRock's BUIDL fund for tokenized U.S. Treasuries, Centrifuge-style private credit pools, and multiple real estate tokenization projects combining SPVs with on-chain fractional ownership. These demonstrate that RWA tokenization is expanding beyond theory into practical financial infrastructure.",
      "Yet tokenization alone is not enough. Institutions must answer: Who owns the asset? Has ownership been verified? Has investor eligibility been confirmed? Can compliance information be trusted across counterparties? Can verification be reused instead of repeated? As the market matures, attention is shifting from token creation toward identity, compliance, verification, and governance infrastructure.",
      "Abraxas is that verification layer. We issue reusable, cryptographically verifiable proofs so compliance attestations, asset provenance, and eligibility data can travel with the asset while maintaining auditability across counterparties and chains. Cielo Sunrise and Chickasaw land diligence are live proof on Abraxas today.",
      "Blockchain was not invented for another coin. It was invented for proof of authentication without a central authority. That is what institutions still need: who verified what, when, and whether anyone can check it independently. Abraxas anchors that proof on Sui.",
      "Long-term success depends not only on creating digital tokens but on building trusted verification systems that support institutional adoption. Verify once. Transact everywhere. That is the thesis behind everything we are building at abraxasworld.xyz.",
    ],
    relatedHref: "/integrate",
  },
];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find(a => a.slug === slug);
}
