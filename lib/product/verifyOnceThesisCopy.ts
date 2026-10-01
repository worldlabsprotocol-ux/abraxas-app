// FILE: lib/product/verifyOnceThesisCopy.ts
// Presentation-only copy for the verify-once thesis diagram.

export const VERIFY_ONCE_THESIS_HEADLINE = "Verify once. Answer many questions.";

export const VERIFY_ONCE_THESIS_LEAD =
  "Establish trusted evidence once in your Passport. Different applications ask different policy questions — each receives only its narrow answer.";

export const VERIFY_ONCE_THESIS_LEGEND =
  "Evidence enters Abraxas once. Narrow answers leave many times. Raw identity stays inside the privacy boundary.";

export interface ThesisApplicationAsk {
  id: string;
  name: string;
  question: string;
  answer: string;
  answerCode: string;
}

/** Supported eligibility-style questions — presentation only. */
export const THESIS_APPLICATION_ASKS: ThesisApplicationAsk[] = [
  {
    id: "age",
    name: "Retail partner",
    question: "Are you 21 or older?",
    answer: "21+ eligibility",
    answerCode: "Yes",
  },
  {
    id: "customer",
    name: "Marketplace",
    question: "Are you a verified customer?",
    answer: "Verified customer",
    answerCode: "Yes",
  },
  {
    id: "action",
    name: "Service gate",
    question: "Are you eligible for this action?",
    answer: "Action eligibility",
    answerCode: "Yes",
  },
] as const;

export const THESIS_PROTECTED_EVIDENCE = [
  "Verified identity evidence",
  "Date of birth",
  "Identity document",
  "Document number",
] as const;
