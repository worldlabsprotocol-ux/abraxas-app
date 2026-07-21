/**
 * Institutional master slideshow — product proof & mechanics only.
 * Market stats, tokenization steps, institution questions, and live asset
 * references live exclusively in HomeFeaturedArticle (#article).
 */

import {
  AGENTIC_FINANCE_HOME_BADGE,
  AGENTIC_FINANCE_HOME_TITLE,
  AGENTIC_FINANCE_SUBHEAD,
} from '@/lib/agenticFinancePositioning';

export type InstitutionalChapterId =
  | 'problem'
  | 'abraxas'
  | 'live'
  | 'ecosystem'
  | 'build';

export type InstitutionalSlide = {
  id: string;
  chapter: InstitutionalChapterId;
  chapterLabel: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  visual: string;
  visualProps?: Record<string, unknown>;
  layout?: 'standard' | 'embed';
  cta?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
};

export const INSTITUTIONAL_CHAPTERS: { id: InstitutionalChapterId; label: string }[] = [
  { id: 'problem', label: 'Problem' },
  { id: 'abraxas', label: 'Abraxas' },
  { id: 'live', label: 'Live proof' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'build', label: 'Build' },
];

export const INSTITUTIONAL_MASTER_SLIDES: InstitutionalSlide[] = [
  {
    id: 'problem-silo',
    chapter: 'problem',
    chapterLabel: 'Problem',
    eyebrow: 'Repeated diligence',
    title: 'Every counterparty re-runs the same checks',
    subtitle:
      'KYC, title, appraisal — siloed at each handoff. That friction is where deals stall, not at the token.',
    visual: 'trust-silo',
  },
  {
    id: 'problem-retail',
    chapter: 'problem',
    chapterLabel: 'Problem',
    eyebrow: 'Every user level',
    title: 'Retail, institution, and agent — same gate',
    subtitle:
      'Each audience understands finance differently. All need proof before capital or credentials move.',
    visual: 'audience-map',
    visualProps: {
      audiences: [
        { label: 'Retail', desc: 'Simple unlock', icon: '👤' },
        { label: 'Accredited', desc: 'KYC + limits', icon: '🛡' },
        { label: 'Institution', desc: 'Audit trail', icon: '🏛' },
        { label: 'AI agent', desc: 'Signed proof', icon: '🤖' },
      ],
    },
  },

  {
    id: 'abraxas-loop',
    chapter: 'abraxas',
    chapterLabel: 'Abraxas',
    eyebrow: 'Verify before act',
    title: 'One loop for every asset class',
    subtitle:
      'Passport → policy → signed receipt → unlock. Same rail for debt, equity, and agent APIs.',
    visual: 'verify-loop',
  },
  {
    id: 'abraxas-passport',
    chapter: 'abraxas',
    chapterLabel: 'Abraxas',
    eyebrow: 'Product',
    title: 'Passport is the front door',
    subtitle: 'Wallet, zkLogin, or email — one identity graph for every partner surface.',
    visual: 'hero-passport',
  },
  {
    id: 'abraxas-gates',
    chapter: 'abraxas',
    chapterLabel: 'Abraxas',
    eyebrow: 'Policy engine',
    title: 'Gates encode who can do what',
    subtitle: 'Tier, jurisdiction, accreditation — evaluated before any settlement or agent call.',
    visual: 'gates',
    visualProps: { gates: ['Identity', 'Accreditation', 'Jurisdiction', 'Asset policy'] },
  },

  {
    id: 'live-proof',
    chapter: 'live',
    chapterLabel: 'Live proof',
    eyebrow: 'Signed receipts',
    title: 'Cryptographic proof you can verify offline',
    subtitle:
      'Allow or deny — every decision gets a proof ID. Partners check agent.valid without calling back.',
    visual: 'proof-flow',
    cta: { label: 'Verify records', href: '/verify' },
    ctaSecondary: { label: 'API docs', href: '/docs/ai-agents' },
  },
  {
    id: 'live-passport',
    chapter: 'live',
    chapterLabel: 'Live proof',
    eyebrow: 'Product · Passport',
    title: 'Wallet → verify → credential',
    subtitle: 'Sui zkLogin, Veriff KYC, W3C verifiable credential — the connect flow in motion.',
    visual: 'embed-passport',
    layout: 'embed',
    cta: { label: 'Open passport', href: '/passport' },
  },
  {
    id: 'live-unlock',
    chapter: 'live',
    chapterLabel: 'Live proof',
    eyebrow: 'Product · RWA unlock',
    title: 'Gated → proof → unlocked',
    subtitle: 'Policy check, signed proof, then transact. Debt, equity, and fund on one rail.',
    visual: 'embed-unlock',
    layout: 'embed',
  },
  {
    id: 'live-dashboard',
    chapter: 'live',
    chapterLabel: 'Live proof',
    eyebrow: 'Product · Dashboard',
    title: 'Portfolio after verify',
    subtitle: 'Yield, verified holdings, and activity — what the holder sees once gates pass.',
    visual: 'embed-dashboard',
    layout: 'embed',
  },
  {
    id: 'live-status',
    chapter: 'live',
    chapterLabel: 'Live proof',
    eyebrow: 'Honest status',
    title: 'Sandbox live · mainnet gated',
    subtitle: 'We ship what works and label what is next — no fake production claims.',
    visual: 'live-status-panel',
    cta: { label: 'Mainnet roadmap', href: '/#mainnet-readiness' },
    ctaSecondary: { label: 'E2E verify check', href: '/api/verify/e2e' },
  },

  {
    id: 'eco-stack',
    chapter: 'ecosystem',
    chapterLabel: 'Ecosystem',
    eyebrow: 'Stack position',
    title: 'Infrastructure — not another marketplace',
    subtitle:
      'Issuers and platforms plug in verification; Abraxas does not custody or list your assets.',
    visual: 'layer-stack',
    visualProps: {
      layers: ['Partner app', 'Abraxas verify', 'Chain / settlement'],
    },
  },
  {
    id: 'eco-agentic',
    chapter: 'ecosystem',
    chapterLabel: 'Ecosystem',
    eyebrow: AGENTIC_FINANCE_HOME_BADGE,
    title: AGENTIC_FINANCE_HOME_TITLE,
    subtitle: AGENTIC_FINANCE_SUBHEAD,
    visual: 'agentic-duo',
    visualProps: {
      left: 'Robinhood-class UX',
      right: 'Abraxas verify layer',
    },
    cta: { label: 'Agent APIs', href: '/docs/ai-agents' },
  },
  {
    id: 'eco-network',
    chapter: 'ecosystem',
    chapterLabel: 'Ecosystem',
    eyebrow: 'Network',
    title: 'One passport — many partner surfaces',
    subtitle: 'Reuse credentials across issuers; network effects compound with each integration.',
    visual: 'network-ring',
    visualProps: {
      center: 'Passport',
      nodes: ['Issuer A', 'Issuer B', 'Agent API', 'Dashboard'],
    },
  },

  {
    id: 'build-flow',
    chapter: 'build',
    chapterLabel: 'Build',
    eyebrow: 'For builders',
    title: 'Integrate in days — not quarters',
    subtitle: 'REST verify, proof lookup, and agent docs. Same contracts as the flagship demo.',
    visual: 'api-flow',
    visualProps: {
      steps: ['POST /verify', 'GET /proof/:id', 'Partner act'],
    },
    cta: { label: 'API docs', href: '/docs/ai-agents' },
    ctaSecondary: { label: 'Integrate', href: '/integrate' },
  },
  {
    id: 'build-cta',
    chapter: 'build',
    chapterLabel: 'Build',
    eyebrow: 'Next step',
    title: 'Start with sandbox passport',
    subtitle: 'Connect wallet, run a verify call, and share a proof link with your team.',
    visual: 'icon-hero',
    visualProps: { icon: '◆', glow: 'cyan' },
    cta: { label: 'Open passport', href: '/passport' },
    ctaSecondary: { label: 'Read article', href: '/#article' },
  },
];

export function getChapterStartIndex(chapterId: InstitutionalChapterId): number {
  const idx = INSTITUTIONAL_MASTER_SLIDES.findIndex((s) => s.chapter === chapterId);
  return idx >= 0 ? idx : 0;
}

export function getSlideChapterIndex(slideIndex: number): number {
  const chapter = INSTITUTIONAL_MASTER_SLIDES[slideIndex]?.chapter;
  if (!chapter) return 0;
  return INSTITUTIONAL_CHAPTERS.findIndex((c) => c.id === chapter);
}
