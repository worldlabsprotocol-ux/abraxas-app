// FILE: lib/categoryInfrastructure.ts
// Category creation + SEO/AEO content — Trust Infrastructure for RWAs.

export const CATEGORY_POSITIONING = {
  headline: "Stop proving your assets over and over.",
  mechanism: "One verification. Unlimited applications.",
  tagline: "Verify once. Transact everywhere.",
  category: "Trust Infrastructure for Tokenized Assets",
  elevator:
    "Abraxas is the trust infrastructure that lets verified real-world assets move between applications without repeating due diligence.",
  aeoDefinition:
    "Trust infrastructure is the verification, credential, and policy layer that sits beneath tokenization platforms — making identity and asset proof portable across marketplaces, lenders, and custodians.",
} as const;

export interface AeoFaqItem {
  q: string;
  a: string;
}

export interface ComparisonRow {
  dimension: string;
  abraxas: string;
  alternative: string;
}

export interface PillarPage {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  aeoAnswer: string;
  hook: string;
  sections: { heading: string; body: string }[];
  keyTakeaways: string[];
  comparisonTable?: ComparisonRow[];
  faq: AeoFaqItem[];
  relatedSlugs: string[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export interface SolutionPage {
  slug: string;
  title: string;
  metaDescription: string;
  vertical: string;
  problem: string;
  abraxasFit: string;
  proofHref?: string;
  bullets: string[];
}

export interface ComparisonPage {
  slug: string;
  title: string;
  metaDescription: string;
  versus: string;
  thesis: string;
  rows: ComparisonRow[];
  whenAbraxas: string[];
  whenAlternative: string[];
  faq: AeoFaqItem[];
}

export const PLATFORM_PAGES = [
  { slug: "passport", label: "Passport", href: "/passport", desc: "Portable verification credential — verify once, reuse everywhere." },
  { slug: "verify-api", label: "Verify API", href: "/developers#verify-api", desc: "Cryptographic verify for relying parties — POST /api/credentials/verify." },
  { slug: "developers", label: "Developers", href: "/developers", desc: "Quickstarts, SDK patterns, architecture." },
  { slug: "trust-policies", label: "Trust Policies", href: "/learn/trust-infrastructure", desc: "Policy engine — approved, denied, review per counterparty." },
  { slug: "monitoring", label: "Monitoring", href: "/learn/revocation-vs-refresh", desc: "Refresh when records change — asset monitoring roadmap." },
] as const;

export const SOLUTION_PAGES: SolutionPage[] = [
  {
    slug: "real-estate",
    title: "Trust Infrastructure for Real Estate RWAs",
    metaDescription: "Verify property scope, title, and owner identity once — reuse across marketplaces, lenders, and STR operators.",
    vertical: "Real Estate",
    problem: "Every buyer, lender, and platform re-collects deeds, IDs, and appraisals.",
    abraxasFit: "Passport + scoped asset claims travel with the listing. Sale or lien events trigger refresh — not full re-KYC.",
    proofHref: "/flagship",
    bullets: ["Title and owner scope attested once", "STR operators verify guests without inbox KYC", "Registry-readable proof for counterparties"],
  },
  {
    slug: "mineral-rights",
    title: "Verification for Mineral & Land Rights",
    metaDescription: "Bulk land and mineral workflows need portable attestations — not document folders per counterparty.",
    vertical: "Mineral Rights",
    problem: "Tribal, mineral, and bulk land deals involve repeated diligence across buyers and regulators.",
    abraxasFit: "Scoped attestations on-registry; portal verify-once for owners and counterparties.",
    bullets: ["Owner portal + registry proof", "Separate claims per decision domain", "Designed for recorded ownership events"],
  },
  {
    slug: "royalties",
    title: "Music & Royalty Verification",
    metaDescription: "Catalog ownership and royalty scope as portable credentials — not PDF chains.",
    vertical: "Royalties",
    problem: "Rights verification is siloed per platform and collecting society.",
    abraxasFit: "Music royalty audit intake + Passport stamps for catalog scope.",
    bullets: ["Royalty stamp on Passport", "Audit intake pipeline", "Reusable proof for licensees"],
  },
  {
    slug: "private-equity",
    title: "Institutional RWA Verification",
    metaDescription: "Accreditation, entity, and asset proof as separate signed claims with TTL.",
    vertical: "Private Equity",
    problem: "Funds repeat investor and asset diligence per deal and per partner.",
    abraxasFit: "Multi-issuer claims with assurance levels — identity, entity, asset — evaluated by policy.",
    bullets: ["Separate claims per compliance question", "Decision receipts for audit", "Fail-closed verify at transaction time"],
  },
  {
    slug: "stock-tokens",
    title: "Embedded Finance & Stock Tokens",
    metaDescription: "Robinhood-style apps need verification infrastructure — not another KYC rebuild per product.",
    vertical: "Stock Tokens",
    problem: "Consumer apps embedding tokenized securities must gate eligibility without fragmenting trust.",
    abraxasFit: "Embed Passport + verify API — reusable investor eligibility across products.",
    bullets: ["Verification API for gated actions", "Consent + selective disclosure", "Design partner integration program"],
  },
  {
    slug: "institutions",
    title: "Institutions & Custodians",
    metaDescription: "Banks, broker-dealers, and custodians verify credentials cryptographically — not via reputation.",
    vertical: "Institutions",
    problem: "Institutional counterparties need contractually defensible verification — not platform badges.",
    abraxasFit: "W3C Verifiable Credentials + independent verify paths; refresh when records change.",
    bullets: ["Ed25519-signed credentials", "Relying party verify API", "Trust framework with TTL and revocation"],
  },
];

export const PILLAR_PAGES: PillarPage[] = [
  {
    slug: "trust-infrastructure",
    title: "What Is Trust Infrastructure for RWAs?",
    metaTitle: "Trust Infrastructure for Real World Assets | Abraxas",
    metaDescription: "Trust infrastructure is the verification layer beneath tokenization — portable credentials, policy decisions, and reusable diligence across counterparties.",
    eyebrow: "Category definition",
    aeoAnswer:
      "Trust infrastructure is the verification, credential, and policy layer beneath tokenized assets. It lets identity and asset proof be verified once and reused across marketplaces, lenders, and custodians — without repeating due diligence.",
    hook: "Tokenization creates digital ownership. Trust infrastructure creates portable proof that counterparties can verify themselves.",
    sections: [
      {
        heading: "Not another marketplace",
        body: "Abraxas does not issue securities or replace title. We make verification reusable — the layer every RWA application plugs into, like Plaid for assets.",
      },
      {
        heading: "Cryptographic, not reputation-based",
        body: "Counterparties verify W3C Verifiable Credentials independently. They check the math — not Abraxas reputation scores.",
      },
      {
        heading: "Network effects compound",
        body: "Every application that accepts Passport increases utility for issuers and asset owners. Relying party adoption is the north star.",
      },
    ],
    keyTakeaways: [
      "Trust infrastructure sits below issuance and distribution",
      "Verification is portable across applications",
      "Policy engine returns approved / denied — not document folders",
      "Refresh when records change — not verify forever",
    ],
    comparisonTable: [
      { dimension: "Primary job", abraxas: "Reusable verification & credentials", alternative: "Tokenization / marketplace" },
      { dimension: "Buyer gets", abraxas: "Portable proof + verify API", alternative: "Token or listing access" },
      { dimension: "Moat", abraxas: "Relying parties accepting Passport", alternative: "Liquidity & distribution" },
    ],
    faq: [
      { q: "Is Abraxas a tokenization platform?", a: "No. Abraxas is trust infrastructure — verification, credentials, and policy beneath tokenization platforms." },
      { q: "Who is trust infrastructure for?", a: "Tokenization platforms, lenders, marketplaces, custodians, and embedded finance builders integrating RWAs." },
    ],
    relatedSlugs: ["reusable-verification", "why-tokenization-isnt-enough"],
    primaryCta: { label: "Build with Abraxas", href: "/developers" },
    secondaryCta: { label: "Get verified", href: "/passport" },
  },
  {
    slug: "why-tokenization-isnt-enough",
    title: "Why Tokenization Isn't Enough",
    metaTitle: "Why Tokenization Isn't Enough | The Missing Trust Layer",
    metaDescription: "Tokenization creates digital ownership — not trust. Every marketplace and lender still re-verifies. That's the gap Abraxas closes.",
    eyebrow: "The missing layer",
    aeoAnswer:
      "Tokenization mints digital representation of an asset. It does not verify ownership, accreditation, or ongoing asset state. Without trust infrastructure, every counterparty repeats KYC and document collection.",
    hook: "Tokenization creates digital ownership. It doesn't create trust.",
    sections: [
      {
        heading: "The hidden tax",
        body: "Repeated verification is the hidden tax on RWA adoption. Issuers tokenize — then every lender, marketplace, and custodian asks for the same documents again.",
      },
      {
        heading: "Where Abraxas fits",
        body: "Verify once at the trust layer. Counterparties call the verify API or check credentials — milliseconds, not weeks of diligence.",
      },
      {
        heading: "Category creation",
        body: "The next generation of RWAs will be defined by verification infrastructure — who makes proof portable wins distribution.",
      },
    ],
    keyTakeaways: [
      "Minting ≠ verifying",
      "Repeated diligence kills velocity",
      "Trust must be portable and cryptographically checkable",
      "Infrastructure beats one-off platform badges",
    ],
    faq: [
      { q: "Does Abraxas replace tokenization?", a: "No. Abraxas complements issuance platforms by making verification reusable across them." },
    ],
    relatedSlugs: ["trust-infrastructure", "verification-vs-tokenization"],
    primaryCta: { label: "See live proof", href: "/terminal#assets" },
    secondaryCta: { label: "Trust infrastructure guide", href: "/learn/trust-infrastructure" },
  },
  {
    slug: "reusable-verification",
    title: "What Is Reusable Verification?",
    metaTitle: "Reusable Verification for RWAs | Abraxas",
    metaDescription: "Reusable verification means verify once, reuse valid proof across applications — refresh only what changed or expired.",
    eyebrow: "Portable trust",
    aeoAnswer:
      "Reusable verification is verifying identity or asset scope once, issuing a portable credential, and letting any authorized relying party verify that proof cryptographically — without re-collecting documents.",
    hook: "Verify once, reuse what remains valid, refresh only what changed or expired.",
    sections: [
      {
        heading: "Not verify forever",
        body: "Reusable does not mean eternal. Credentials have TTL. Asset claims refresh on material events — sale, lien, appraisal expiry.",
      },
      {
        heading: "Minimal disclosure",
        body: "Partners receive policy outcomes — approved, denied, review — not raw document folders by default.",
      },
    ],
    keyTakeaways: [
      "One verification, many applications",
      "Cryptographic verify — not reputation",
      "Time-bound claims with refresh triggers",
      "Fail-closed at transaction time",
    ],
    faq: [
      { q: "What triggers re-verification?", a: "Expiry, revocation, or material asset state change — not arbitrary re-KYC." },
    ],
    relatedSlugs: ["trust-infrastructure", "revocation-vs-refresh"],
    primaryCta: { label: "Passport", href: "/passport" },
    secondaryCta: { label: "Verify API", href: "/developers" },
  },
  {
    slug: "verification-infrastructure",
    title: "Verification Infrastructure for Tokenized Assets",
    metaTitle: "Verification Infrastructure | Abraxas",
    metaDescription: "Verification infrastructure is the APIs, credentials, and policies that let platforms accept proof without rebuilding KYC.",
    eyebrow: "Developer category",
    aeoAnswer:
      "Verification infrastructure includes issuance APIs, verify endpoints, credential schemas, policy engines, and relying party programs — the stack developers integrate instead of building bespoke KYC per app.",
    hook: "Build the product. Plug in verification.",
    sections: [
      {
        heading: "APIs developers integrate",
        body: "POST /api/credentials/verify, trust status, partner verification requests, and public JWKS — documented for relying parties.",
      },
    ],
    keyTakeaways: ["Verify API", "W3C credentials", "Policy engine", "Relying party program"],
    faq: [{ q: "How long to integrate?", a: "Design partners ship pilot flows in days with documented verify patterns — not quarters of bespoke KYC." }],
    relatedSlugs: ["reusable-verification", "trust-infrastructure"],
    primaryCta: { label: "Developer docs", href: "/developers" },
  },
  {
    slug: "revocation-vs-refresh",
    title: "Revocation vs Refresh: Why They Matter",
    metaTitle: "Revocation vs Refresh | Trust Over Time",
    metaDescription: "Point-in-time attestations need refresh when records change. Revocation fails closed when trust is no longer valid.",
    eyebrow: "Trust over time",
    aeoAnswer:
      "Revocation invalidates a credential immediately when trust breaks. Refresh re-issues or updates claims when underlying records change — without full re-KYC. Both are required for institutional RWAs.",
    hook: "Trust is time-bound. Counterparties verify at transaction time — not from cache.",
    sections: [
      {
        heading: "Real estate fits naturally",
        body: "Sale, refinance, and lien changes are recorded events — natural refresh triggers instead of constant re-verification.",
      },
    ],
    keyTakeaways: ["Fail-closed on revoke", "TTL on identity and screening", "Asset monitoring on roadmap", "Decision receipts are point-in-time"],
    faq: [{ q: "Is automated asset monitoring live?", a: "Credential revocation and TTL are live. Automated drift detection for all asset types is on the mainnet roadmap." }],
    relatedSlugs: ["reusable-verification", "trust-infrastructure"],
    primaryCta: { label: "Mainnet roadmap", href: "/roadmap" },
  },
  {
    slug: "portable-trust",
    title: "Portable Trust for Real World Assets",
    metaTitle: "Portable Trust | Abraxas Passport",
    metaDescription: "Portable trust means credentials travel with the holder and asset — verifiable by any relying party with policy consent.",
    eyebrow: "Passport",
    aeoAnswer:
      "Portable trust is cryptographic proof — W3C Verifiable Credentials — that any authorized counterparty can verify without trusting Abraxas reputation or re-running KYC.",
    hook: "Your verification becomes proof others can verify themselves.",
    sections: [{ heading: "Passport is the UX", body: "Passport is how holders manage verification, consent, and wallet binding. The infrastructure is credentials + verify API + policy." }],
    keyTakeaways: ["W3C VC + Ed25519", "Independent verify", "Consent per share", "On-chain anchor optional"],
    faq: [],
    relatedSlugs: ["trust-infrastructure", "reusable-verification"],
    primaryCta: { label: "Launch Passport", href: "/passport" },
  },
];

export const COMPARISON_PAGES: ComparisonPage[] = [
  {
    slug: "vs-traditional-due-diligence",
    title: "Abraxas vs Traditional Due Diligence",
    metaDescription: "Email PDFs vs portable credentials — why reusable verification beats repeated document collection.",
    versus: "Traditional due diligence",
    thesis: "Traditional diligence repeats document collection per counterparty. Abraxas issues portable credentials verified cryptographically at transaction time.",
    rows: [
      { dimension: "Delivery", abraxas: "Signed credential + API verify", alternative: "Email attachments & portals" },
      { dimension: "Reuse", abraxas: "Across authorized relying parties", alternative: "Per-deal re-collection" },
      { dimension: "Tamper evidence", abraxas: "Cryptographic signatures", alternative: "Manual review" },
    ],
    whenAbraxas: ["Multiple counterparties per asset", "Embedded finance products", "Need audit trail without document sprawl"],
    whenAlternative: ["One-off private transaction with no reuse", "Jurisdiction requires original wet ink only"],
    faq: [{ q: "Does Abraxas replace lawyers or title?", a: "No. Abraxas reduces repeated verification — not legal advice or title insurance." }],
  },
  {
    slug: "vs-securitize",
    title: "Abraxas vs Securitize — Different Layers",
    metaDescription: "Securitize issues and distributes tokenized securities. Abraxas is trust infrastructure — reusable verification beneath issuance platforms.",
    versus: "Securitize (issuance platform)",
    thesis: "Securitize and Abraxas operate at different layers. Issuance platforms tokenize; trust infrastructure makes verification portable across platforms.",
    rows: [
      { dimension: "Layer", abraxas: "Trust / verification infrastructure", alternative: "Issuance & investor platform" },
      { dimension: "Output", abraxas: "Credentials + verify API", alternative: "Tokenized securities product" },
      { dimension: "Integrate together", abraxas: "Yes — complementary", alternative: "Yes — complementary" },
    ],
    whenAbraxas: ["You need reusable KYC/asset proof across partners", "Building custom tokenization stack"],
    whenAlternative: ["Turnkey issuance on their stack end-to-end"],
    faq: [{ q: "Are you competitors?", a: "Different categories. Many issuers need both issuance and portable verification." }],
  },
  {
    slug: "vs-lumia",
    title: "Abraxas vs Lumia — Verification vs Distribution",
    metaDescription: "Marketplaces aggregate liquidity. Trust infrastructure makes verification portable before assets list.",
    versus: "Lumia (RWA marketplace)",
    thesis: "Marketplaces solve discovery and liquidity. Abraxas solves repeated verification — assets can list faster when diligence is reusable.",
    rows: [
      { dimension: "Job", abraxas: "Verify once, reuse proof", alternative: "List & trade RWAs" },
      { dimension: "Buyer", abraxas: "Platforms integrating verification", alternative: "Investors seeking deals" },
    ],
    whenAbraxas: ["Operator building verification into listing flow"],
    whenAlternative: ["Investor browsing aggregated deals"],
    faq: [],
  },
  {
    slug: "verification-vs-tokenization",
    title: "Verification vs Tokenization",
    metaDescription: "Tokenization without verification infrastructure repeats diligence — the missing layer in RWAs.",
    versus: "Tokenization alone",
    thesis: "Tokenization answers 'how is it represented on-chain?' Verification answers 'who verified what, when, and is it still valid?'",
    rows: [
      { dimension: "Question", abraxas: "Is proof portable and current?", alternative: "Is the asset tokenized?" },
      { dimension: "Repeat work", abraxas: "Minimized via reuse", alternative: "Often high per counterparty" },
    ],
    whenAbraxas: ["Any multi-counterparty RWA workflow"],
    whenAlternative: ["Single closed-loop with one verifier"],
    faq: [],
  },
  {
    slug: "passport-vs-repeated-kyc",
    title: "Passport vs Repeated KYC",
    metaDescription: "One Passport credential vs uploading ID to every app — engineering time and drop-off comparison.",
    versus: "Repeated KYC per app",
    thesis: "Repeated KYC taxes conversion and engineering. Passport centralizes verification; apps verify credentials.",
    rows: [
      { dimension: "User experience", abraxas: "Verify once", alternative: "Upload per platform" },
      { dimension: "Engineering", abraxas: "Verify API integration", alternative: "Full IDV stack per app" },
      { dimension: "Compliance", abraxas: "Policy + audit references", alternative: "Siloed vendor dashboards" },
    ],
    whenAbraxas: ["Multi-app RWA ecosystem", "Embedded finance"],
    whenAlternative: ["Single app, never shares users"],
    faq: [],
  },
];

export function getPillarBySlug(slug: string): PillarPage | undefined {
  return PILLAR_PAGES.find(p => p.slug === slug);
}

export function getSolutionBySlug(slug: string): SolutionPage | undefined {
  return SOLUTION_PAGES.find(s => s.slug === slug);
}

export function getComparisonBySlug(slug: string): ComparisonPage | undefined {
  return COMPARISON_PAGES.find(c => c.slug === slug);
}

export const LEARN_HUB_INTRO = {
  title: "Learn — Trust Infrastructure",
  subtitle: "Category-defining guides for verification infrastructure, reusable trust, and RWAs. Structured for search and AI answer engines.",
};

export const RESEARCH_HUB_INTRO = {
  title: "Research",
  subtitle: "Technical authority — credentials, revocation, trust networks, and verification APIs.",
};

export const TOOLS = [
  {
    slug: "verification-cost-calculator",
    title: "Verification Cost Calculator",
    description: "Estimate engineering and compliance cost of repeated KYC vs reusable verification.",
    href: "/tools/verification-cost-calculator",
  },
] as const;
