// FILE: lib/designPartnerOutreach.ts
// Copy-paste outreach templates for relying party recruitment.

export const OUTREACH_SUBJECT_LINES = [
  "30-day pilot: Abraxas Passport as your KYC rail",
  "Verify once — skip re-KYC on [Protocol Name]",
  "Design partner slot: reusable identity for RWA checkout",
] as const;

export const OUTREACH_EMAIL_TEMPLATE = `Subject: 30-day pilot — Abraxas Passport as your trust gate

Hi [Name],

I'm [Your Name] from Abraxas — we're building reusable verification infrastructure for real-world assets (W3C credentials on Sui, zkLogin sign-in, public registry verifier).

**Why I'm reaching out**
[Protocol Name] has a workflow where users re-upload identity documents or wait on manual review before [checkout / borrow / listing]. Abraxas lets you check verification state in one API call — users consent once, you receive signed proof, never raw documents.

**What's live today**
• Public verifier: https://abraxas-app.vercel.app/verify
• Trust status API: GET /api/trust/status?sui={address}
• Credential verify: POST /api/credentials/verify
• Genesis proof asset: Cielo Sunrise ($1.1M STR, live USDC booking on Sui)

**30-day pilot proposal**
1. Week 1: Sandbox integration (we provide snippet + test wallets)
2. Week 2–3: Gate one flow — e.g. investor eligibility or listing submission
3. Week 4: Measure time-to-verify, conversion, manual review hours saved

**Ask**
30 minutes to walk through the relying party onboarding doc and agree on one gated workflow + success metric.

Docs: https://abraxas-app.vercel.app/integrations/relying-parties
Apply: https://abraxas-app.vercel.app/integrations

Open to naming [Protocol Name] publicly after a successful pilot if that's useful for you.

Best,
[Your Name]
[Title] · Abraxas Protocol
https://abraxas-app.vercel.app/investors/strategy`;

export const OUTREACH_FOLLOWUP_TEMPLATE = `Subject: Re: Abraxas Passport pilot — quick verifier demo

Hi [Name],

Following up — wanted to share a 60-second diligence path your eng team can run without a call:

1. Open https://abraxas-app.vercel.app/verify/ABX-RE-HOSP-001 (Cielo asset — full assurance taxonomy)
2. Review POST /api/credentials/verify in our relying party doc
3. Optional: clone https://github.com/worldlabsprotocol-ux/abraxas-app and inspect /api/trust/status

Happy to scope a minimal gate for [specific flow] if you share where KYC friction hurts most today.

[Your Name]`;

export const OUTREACH_TARGETS = [
  { category: "RWA marketplace", examples: "Platforms listing tokenized real estate or private credit", hook: "Investor eligibility without re-KYC" },
  { category: "Private credit / lending", examples: "On-chain borrow against verified collateral", hook: "Identity + asset attestation in one check" },
  { category: "Music / IP", examples: "Catalog marketplaces, royalty aggregators", hook: "Ownership chain + split-sheet attestation" },
  { category: "Corporate / Wyoming", examples: "Tokenized LLC shells, SPV platforms", hook: "Entity verification bound to asset mint" },
] as const;

export const OUTREACH_CHECKLIST = [
  "Personalize [Protocol Name] and the specific friction (checkout, borrow, listing)",
  "Link to /verify and one real asset (Cielo) — visual proof lands faster than API docs alone",
  "Propose one gated workflow, not a platform rewrite",
  "Define success metric upfront (conversion, time-to-verify, support tickets)",
  "Offer public co-marketing only after pilot success",
] as const;
