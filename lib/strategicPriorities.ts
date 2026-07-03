// FILE: lib/strategicPriorities.ts
// Four diligence pillars — honest status, linked evidence.

export const STRATEGIC_PILLARS = [
  {
    id: "relying-party",
    order: 1,
    title: "First external relying party",
    headline: "Prove an outside protocol checks Abraxas credentials in production",
    status: "in_progress" as const,
    statusLabel: "Recruiting design partners",
    why: "Network-effect proof. Abraxas becomes infrastructure when someone other than us clears transactions using our credentials.",
    milestones: [
      { label: "Public verifier live", done: true, href: "/verify" },
      { label: "Credential verify API documented", done: true, href: "/integrations/relying-parties" },
      { label: "Design partner application flow", done: true, href: "/integrations" },
      { label: "First unaffiliated production check", done: false, href: "/integrations/relying-parties" },
    ],
    primaryHref: "/integrations/relying-parties",
    primaryCta: "Relying party program →",
  },
  {
    id: "cielo-case-study",
    order: 2,
    title: "Cielo institutional case study",
    headline: "Dated sources, conflict disclosures, and on-chain proof links",
    status: "live" as const,
    statusLabel: "Published — continuously updated",
    why: "Investors need one asset they can diligence end-to-end without trusting marketing copy alone.",
    milestones: [
      { label: "Public dossier + calendar", done: true, href: "/flagship" },
      { label: "Assurance taxonomy on metrics", done: true, href: "/verify?q=ABX-RE-HOSP-001" },
      { label: "Case study with source dates", done: true, href: "/case-studies/cielo" },
      { label: "Live booking revenue in transparency log", done: true, href: "/transparency" },
    ],
    primaryHref: "/case-studies/cielo",
    primaryCta: "Read case study →",
  },
  {
    id: "security-audit",
    order: 3,
    title: "Audit results + bug bounty",
    headline: "Formal review publication and public researcher program",
    status: "in_progress" as const,
    statusLabel: "Audits in flight · bounty pre-registration open",
    why: "Institutional capital requires third-party validation and a responsible disclosure path before mainnet scale.",
    milestones: [
      { label: "Bug bounty scope published", done: true, href: "/security/bounty" },
      { label: "Sui Passport mainnet audit", done: false, href: "/security" },
      { label: "Credential API formal review", done: false, href: "/security" },
      { label: "Public bounty launch + rewards", done: false, href: "/security/bounty" },
    ],
    primaryHref: "/security/bounty",
    primaryCta: "Security program →",
  },
  {
    id: "team-transparency",
    order: 4,
    title: "Execution & team transparency",
    headline: "Current team, advisors, and planned growth for diligence",
    status: "live" as const,
    statusLabel: "Published",
    why: "Early-stage infrastructure plays need honest builder context and a credible hiring plan — not a fake org chart.",
    milestones: [
      { label: "Founder + builder context", done: true, href: "/about/team" },
      { label: "Planned growth roles", done: true, href: "/about/team" },
      { label: "Advisor bench (as engaged)", done: false, href: "/about/team" },
      { label: "Full litepaper synthesis", done: true, href: "/docs/litepaper" },
    ],
    primaryHref: "/about/team",
    primaryCta: "Team & execution →",
  },
] as const;

export const PILLAR_STATUS_COLOR = {
  live: "#10B981",
  in_progress: "#F59E0B",
  planned: "#3B82F6",
} as const;
