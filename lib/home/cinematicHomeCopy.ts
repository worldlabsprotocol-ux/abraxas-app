// FILE: lib/home/cinematicHomeCopy.ts
// Cinematic homepage copy — thesis-first, product-truthful (Build #545 + legacy thesis modules).

export const CINEMATIC_THESIS_LINE_1 = "VERIFY WHAT MATTERS.";
export const CINEMATIC_THESIS_LINE_2 = "REVEAL NOTHING ELSE.";

export const CINEMATIC_HERO_SUPPORT =
  "For multi-app platforms on an existing KYC provider.";

export const CINEMATIC_CTA_PRIMARY = "See reuse across two apps";
export const CINEMATIC_CTA_PRIMARY_HREF = "/proof";
export const CINEMATIC_CTA_SECONDARY = "Build in sandbox";
export const CINEMATIC_CTA_SECONDARY_HREF =
  "/developers/integration-studio?outcome=reuse_across_app&source=gtm-home";

export const SCROLL_STORY_EYEBROW = "THE INTERNET ASKS FOR TOO MUCH";
export const SCROLL_STORY_RESOLVE = "AN APPLICATION ONLY NEEDED ONE ANSWER.";
export const SCROLL_STORY_CLOSE = "THAT'S ABRAXAS.";

export const SYNTHETIC_IDENTITY_FIELDS = [
  "NAME",
  "DATE OF BIRTH",
  "ADDRESS",
  "DOCUMENT",
  "ACCOUNT",
  "LOCATION",
] as const;

export const TRANSACTION_PARTNER_ASK = "Is this person 21+?";
export const TRANSACTION_PARTNER_RECEIVES = "YES";

export const PASSPORT_HERO_LABEL = "ABRAXAS PASSPORT";
export const PASSPORT_HERO_STATE = "PRIVATE · ACTIVE";
export const PASSPORT_HERO_ELIGIBILITY = "21+ eligibility";
export const PASSPORT_HERO_SHARED = "Shared with partner: 21+ only";

export const PRODUCT_PROOF_STEPS = [
  { id: "ask", title: "Partner asks", body: "Is this holder 21+?" },
  { id: "approve", title: "Holder approves", body: "Share my 21+ result" },
  { id: "return", title: "Abraxas returns", body: "YES: signed, current, policy-specific" },
] as const;

export const PRODUCT_PROOF_FOOTNOTE =
  "The partner does not receive the holder's birth date.";

export const REUSE_ORBIT_HEADLINE = "VERIFY ONCE";
export const REUSE_ORBIT_ASKS = [
  "21+?",
  "Residency eligible?",
  "Account owner?",
  "Accredited?",
  "License current?",
  "Authorized?",
] as const;
export const REUSE_ORBIT_DISCLAIMER = "Conceptual policy examples, not all live products.";

export const DEVELOPER_STORY_HEADLINE = "ASK → VERIFY → RECEIVE SIGNED RESULT";
export const DEVELOPER_STORY_BODY =
  "Integrate with the existing Integration Studio when you're ready for technical detail.";

export const FOOTER_THESIS_LINE_1 = CINEMATIC_THESIS_LINE_1;
export const FOOTER_THESIS_LINE_2 = CINEMATIC_THESIS_LINE_2;

/** Build #545 public homepage hero and scroll chapters */
export const CINEMATIC_HOME_HEADLINE = "Prove what matters. Keep what's yours.";

export const CINEMATIC_HOME_LEAD = "Verify privately. Build with independently verifiable trust.";

export const CINEMATIC_HOME_CTA_PRIMARY = "Start sandbox";
export const CINEMATIC_HOME_CTA_PRIMARY_HREF = "#start-sandbox";

export const CINEMATIC_HOME_CTA_SECONDARY = "See how it works";
export const CINEMATIC_HOME_CTA_SECONDARY_HREF = "#how-abraxas-works";

/** @deprecated Hero uses primary/secondary only — kept for deep links and copy tests */
export const CINEMATIC_HOME_CTA_TERTIARY = "See how it works";
export const CINEMATIC_HOME_CTA_TERTIARY_HREF = "#how-abraxas-works";

export const CINEMATIC_HOME_CTA_SANDBOX = "Start sandbox";
export const CINEMATIC_HOME_CTA_SANDBOX_HREF = "#start-sandbox";

export const CINEMATIC_PROBLEM_HEADLINE = "Why share everything to prove one thing?";

export const CINEMATIC_PROBLEM_LEAD =
  "Most apps ask for full identity packets even when they only need a yes-or-no eligibility answer. That repeats risk for you and compliance burden for them.";

export const CINEMATIC_HOW_HEADLINE = "How Abraxas works";

export const CINEMATIC_HOW_STAGES = [
  {
    id: "verify",
    title: "Verify privately",
    body: "Complete verification once, with evidence kept under your control.",
  },
  {
    id: "share",
    title: "Share only the answer",
    body: "Each request receives a narrowly scoped decision, not your underlying documents.",
  },
  {
    id: "reuse",
    title: "Reuse when eligible",
    body: "When policy still permits, prove again without re-uploading the same files.",
  },
] as const;

export const CINEMATIC_VPR_HEADLINE = "Verify → Protect → Reuse";

export const CINEMATIC_VPR_SIM_LABEL =
  "Interactive simulation with labeled examples only. Each app policy is evaluated independently; one PERMIT does not authorize another policy.";

export const CINEMATIC_GT_SECTION_HEADLINE = "See Abraxas in action.";

export const CINEMATIC_GT_SECTION_LEAD = "Age check without sharing ID or date of birth.";

export const CINEMATIC_GT_PARTNER_DISCLAIMER =
  "Good Trouble early partner integration demo, not production checkout. Holder consent and privacy boundaries still apply.";

export const CINEMATIC_TRUST_CHAPTER_EYEBROW = "Built on verifiable trust";

export const CINEMATIC_BUILD_CHAPTER_EYEBROW = "Build with Abraxas";
