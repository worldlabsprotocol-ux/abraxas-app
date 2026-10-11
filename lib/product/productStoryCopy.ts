// Build #517 — one consistent Abraxas product story (holder + partner surfaces).

export const PRODUCT_STORY_TAGLINE =
  "Verify once. Keep personal information private. Share only the answer each application is allowed to request.";

export const PRODUCT_STORY_PILLARS = [
  {
    id: "verify_once",
    title: "Verify once",
    detail: "Complete qualifying verification when a policy requires it — not on every new app.",
  },
  {
    id: "stay_private",
    title: "Stay private",
    detail: "Your documents and full profile stay with Abraxas, not copied to every partner.",
  },
  {
    id: "narrow_share",
    title: "Share only the answer",
    detail: "Partners receive the specific eligibility result they asked for — not your ID file.",
  },
  {
    id: "reuse",
    title: "Reuse when it still qualifies",
    detail: "Later requests can use existing proof when policy and consent allow.",
  },
] as const;

export const PARTNER_REQUEST_FOUR_QUESTIONS = {
  who: "Who is asking?",
  what: "What are they asking to verify?",
  receive: "What will they receive?",
  continue: "What happens if I continue?",
} as const;

export const PARTNER_REQUEST_CONTINUE_EXPLAINER =
  "You review this screen, choose a qualifying method if needed, and explicitly approve before Abraxas shares anything. Nothing is sent automatically.";

export const RECEIPT_PLAIN_HEADING = "Your confirmation";

export const RECEIPT_PLAIN_LABELS = {
  checked: "What was checked",
  shared: "Answer shared",
  recipient: "Who received it",
  valid: "Valid until",
  next: "What you can do next",
} as const;

export const RECEIPT_ADVANCED_TOGGLE = "Signature and verification details";

export const CIELO_LIMITS_PLAIN =
  "This confirms guest eligibility for Cielo’s verified-rate program. It is not a hotel booking, payment, or reservation.";

export const GOOD_TROUBLE_LIMITS_PLAIN =
  "Good Trouble receives only a yes/no 21+ eligibility answer — never your date of birth or identity documents. Completing eligibility here does not place an order by itself.";

export const LAUNCHPAD_OPERATOR_LEAD =
  "Choose what you need to verify, test safely in sandbox, then request production access when your integration is ready.";

export const INTEGRATION_STUDIO_LEAD =
  "Abraxas returns a signed eligibility answer your server can verify — holders keep documents private and approve each share.";
