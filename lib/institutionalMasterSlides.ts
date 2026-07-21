/**
 * Single institutional master slideshow — market thesis through product proof.
 * Featured article is the market diagram chapter; visuals at every level.
 */

import {
  AGENTIC_FINANCE_HOME_BADGE,
  AGENTIC_FINANCE_HOME_TITLE,
  AGENTIC_FINANCE_SUBHEAD,
} from '@/lib/agenticFinancePositioning';
import {
  RWA_INSTITUTION_QUESTIONS,
  RWA_THESIS_MEDIUM_URL,
  RWA_THESIS_SLIDES,
} from '@/lib/rwaTokenizationThesis';

export type InstitutionalChapterId =
  | 'market'
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
  /** Taller frame for embedded product demos */
  layout?: 'standard' | 'embed';
  cta?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
};

export const INSTITUTIONAL_CHAPTERS: { id: InstitutionalChapterId; label: string }[] = [
  { id: 'market', label: 'Market' },
  { id: 'problem', label: 'Problem' },
  { id: 'abraxas', label: 'Abraxas' },
  { id: 'live', label: 'Live proof' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'build', label: 'Build' },
];

/** Article slides — the market diagram chapter */
const marketFromArticle: InstitutionalSlide[] = RWA_THESIS_SLIDES.map((s, i) => ({
  id: `market-${s.id}`,
  chapter: 'market' as const,
  chapterLabel: 'Market',
  eyebrow: i === 0 ? 'Article · RWA thesis' : s.label.replace(/^\d+ · /, ''),
  title: s.headline,
  subtitle: s.body,
  visual: s.visual,
  cta:
    i === RWA_THESIS_SLIDES.length - 1
      ? { label: 'Read full article', href: '/#article' }
      : undefined,
  ctaSecondary:
    i === RWA_THESIS_SLIDES.length - 1
      ? { label: 'Also on Medium', href: RWA_THESIS_MEDIUM_URL }
      : undefined,
}));

export const INSTITUTIONAL_MASTER_SLIDES: InstitutionalSlide[] = [
  ...marketFromArticle,

  {
    id: 'problem-friction',
    chapter: 'problem',
    chapterLabel: 'Problem',
    eyebrow: 'Institutional reality',
    title: 'Tokenization without trust infrastructure stalls',
    subtitle:
      'Issuers, banks, and platforms need identity, compliance, and audit — not another token wrapper.',
    visual: 'institution-questions',
    visualProps: { questions: [...RWA_INSTITUTION_QUESTIONS] },
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
    eyebrow: 'Sandbox today',
    title: 'Signed decision receipts — verifiable offline',
    subtitle:
      'Every allow/deny produces a proof ID. Partners audit without calling Abraxas again. Cielo Sunrise and Chickasaw are live verify records.',
    visual: 'live-proof-panel',
    cta: { label: 'Verify records', href: '/verify' },
    ctaSecondary: { label: 'GET /proof/:id', href: '/docs/ai-agents' },
  },
  {
    id: 'live-passport',
    chapter: 'live',
    chapterLabel: 'Live proof',
    eyebrow: 'Product · Passport',
    title: 'Wallet → verify → credential',
    subtitle: 'Sui zkLogin, Veriff KYC, W3C verifiable credential — one front door for every partner.',
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
    subtitle: 'Policy check, signed proof, then transact. Debt, equity, and fund flows on the same rail.',
    visual: 'embed-unlock',
    layout: 'embed',
  },
  {
    id: 'live-dashboard',
    chapter: 'live',
    chapterLabel: 'Live proof',
    eyebrow: 'Product · Dashboard',
    title: 'Live yield · verified assets',
    subtitle: 'Cielo Sunrise hospitality, Chickasaw land, music royalties — portfolio view after verify.',
    visual: 'embed-dashboard',
    layout: 'embed',
    cta: { label: 'Cielo case study', href: '/case-studies/cielo' },
  },
  {
    id: 'live-status',
    chapter: 'live',
    chapterLabel: 'Live proof',
    eyebrow: 'Honest status',
    title: 'Sandbox live · mainnet gated',
    subtitle: 'We ship what works and label what is next — no fake production claims.',
    visual: 'live-status-panel',
    cta: { label: 'Mainnet readiness', href: '/api/mainnet/readiness' },
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
