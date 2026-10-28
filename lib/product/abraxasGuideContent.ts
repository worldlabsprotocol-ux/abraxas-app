// FILE: lib/product/abraxasGuideContent.ts
// Static Abraxas Guide — searchable terminology, no AI backend.

export type AbraxasGuideEntry = {
  id: string;
  term: string;
  summary: string;
  detail: string;
  stage?: string;
  suggestedQuestions?: string[];
};

export const ABRAXAS_GUIDE_ENTRIES: AbraxasGuideEntry[] = [
  {
    id: "trust-continuous",
    term: "Trust is continuous",
    summary: "Authorization must remain valid over time—not only at sign-in.",
    detail:
      "Abraxas issues policy-bound decisions backed by evidence and signed status. Integrators re-check current validity before high-value actions.",
    suggestedQuestions: ["Does this approval still apply?", "What happens after revocation?"],
  },
  {
    id: "test-workspace",
    term: "Test workspace",
    summary: "A sandbox environment to run wallet control and verification tests.",
    detail:
      "Your test workspace keeps progress for sandbox metadata and test results. It is not a production account or vault administration console.",
    stage: "Start building",
  },
  {
    id: "check-proof",
    term: "Check your proof",
    summary: "Independently validate the signed receipt before you rely on it.",
    detail:
      "Checking your proof confirms cryptographic signatures and current acceptability. It does not create a partner application or grant admin access.",
    stage: "After wallet authorization",
    suggestedQuestions: ["Is the receipt still valid?", "Who issued this decision?"],
  },
  {
    id: "create-test-app",
    term: "Create your test app",
    summary: "Provision a sandbox application for partner-flow tests.",
    detail:
      "After proof checks out, create your test app to configure callbacks and run integration harness requests.",
    stage: "After proof validation",
  },
  {
    id: "permit-deny",
    term: "Permit, deny, indeterminate",
    summary: "The three enforcement outcomes your application must handle.",
    detail:
      "Indeterminate means you cannot safely authorize—never treat it as permit. Deny blocks the action. Permit allows your policy-defined next step.",
  },
  {
    id: "wallet-vs-authority",
    term: "Wallet control vs signing authority",
    summary: "A wallet signature proves control of a key—not institutional mandate.",
    detail:
      "Wallet control may qualify a sandbox policy. Institutional signing authority requires authoritative mandate evidence configured for that policy.",
  },
  {
    id: "independent-verification",
    term: "Independent verification",
    summary: "Verify receipts with pinned trust material—not Abraxas UI alone.",
    detail: "Use the independent verifier package or verification tools with issuer authority and signed status evidence.",
  },
];

export function filterAbraxasGuideEntries(query: string): AbraxasGuideEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ABRAXAS_GUIDE_ENTRIES;
  return ABRAXAS_GUIDE_ENTRIES.filter(
    (entry) =>
      entry.term.toLowerCase().includes(q)
      || entry.summary.toLowerCase().includes(q)
      || entry.detail.toLowerCase().includes(q)
      || entry.stage?.toLowerCase().includes(q),
  );
}
