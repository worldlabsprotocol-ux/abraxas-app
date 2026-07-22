/**
 * Master slideshow — pick-your-path chapters (sour.gg-inspired pacing).
 * Product · Thesis · Build · Pulse — arrow through at your pace.
 */

import {
  AGENTIC_FINANCE_HOME_BADGE,
  AGENTIC_FINANCE_HOME_TITLE,
  AGENTIC_FINANCE_SUBHEAD,
} from '@/lib/agenticFinancePositioning';
import { RWA_THESIS_SLIDES } from '@/lib/rwaTokenizationThesis';

export type InstitutionalChapterId =
  | 'problem'
  | 'product'
  | 'thesis'
  | 'build'
  | 'pulse';

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

/** Five paths — minimal nav, maximum arrow-through content. */
export const INSTITUTIONAL_CHAPTERS: { id: InstitutionalChapterId; label: string; emoji: string; blurb: string }[] = [
  { id: 'problem', label: 'Problem', emoji: '⚡', blurb: 'Why diligence repeats' },
  { id: 'product', label: 'Product', emoji: '◆', blurb: 'Passport · proof · live demos' },
  { id: 'thesis', label: 'Thesis', emoji: '📊', blurb: 'RWA market · article' },
  { id: 'build', label: 'Build', emoji: '🔧', blurb: 'Stack · integrate' },
  { id: 'pulse', label: 'Pulse', emoji: '📡', blurb: 'Gates · blog · market' },
];

const THESIS_SLIDES: InstitutionalSlide[] = RWA_THESIS_SLIDES.map((t) => ({
  id: `thesis-${t.id}`,
  chapter: 'thesis' as const,
  chapterLabel: 'Thesis',
  eyebrow: t.label,
  title: t.headline,
  subtitle: t.body,
  visual: t.visual,
  cta: t.id === 'abraxas' ? { label: 'Full article', href: '/blog/what-is-real-world-asset-tokenization' } : undefined,
  ctaSecondary: t.id === 'abraxas' ? { label: 'Medium', href: 'https://medium.com/@worldlabsprotocol/what-is-real-world-asset-tokenization-13d6c8d0a595' } : undefined,
}));

export const INSTITUTIONAL_MASTER_SLIDES: InstitutionalSlide[] = [
  // ── Problem ──
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

  // ── Product (Passport + live proof) ──
  {
    id: 'abraxas-loop',
    chapter: 'product',
    chapterLabel: 'Product',
    eyebrow: 'Verify before act',
    title: 'One loop for every asset class',
    subtitle:
      'Passport → policy → signed receipt → unlock. Same rail for debt, equity, and agent APIs.',
    visual: 'verify-loop',
  },
  {
    id: 'abraxas-passport',
    chapter: 'product',
    chapterLabel: 'Product',
    eyebrow: 'Product',
    title: 'Passport is the front door',
    subtitle: 'Wallet, zkLogin, or email — one identity graph for every partner surface.',
    visual: 'hero-passport',
    cta: { label: 'Open passport', href: '/passport' },
  },
  {
    id: 'abraxas-gates',
    chapter: 'product',
    chapterLabel: 'Product',
    eyebrow: 'Policy engine',
    title: 'Gates encode who can do what',
    subtitle: 'Tier, jurisdiction, accreditation — evaluated before any settlement or agent call.',
    visual: 'gates',
    visualProps: { gates: ['Identity', 'Accreditation', 'Jurisdiction', 'Asset policy'] },
  },
  {
    id: 'live-proof',
    chapter: 'product',
    chapterLabel: 'Product',
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
    chapter: 'product',
    chapterLabel: 'Product',
    eyebrow: 'Live · Passport',
    title: 'Wallet → verify → credential',
    subtitle: 'Sui zkLogin, Veriff KYC, W3C verifiable credential — the connect flow in motion.',
    visual: 'embed-passport',
    layout: 'embed',
    cta: { label: 'Open passport', href: '/passport' },
  },
  {
    id: 'live-unlock',
    chapter: 'product',
    chapterLabel: 'Product',
    eyebrow: 'Live · RWA unlock',
    title: 'Gated → proof → unlocked',
    subtitle: 'Policy check, signed proof, then transact. Debt, equity, and fund on one rail.',
    visual: 'embed-unlock',
    layout: 'embed',
  },
  {
    id: 'live-dashboard',
    chapter: 'product',
    chapterLabel: 'Product',
    eyebrow: 'Live · Dashboard',
    title: 'Portfolio after verify',
    subtitle: 'Yield, verified holdings, and activity — what the holder sees once gates pass.',
    visual: 'embed-dashboard',
    layout: 'embed',
  },

  // ── Thesis (article — arrow through) ──
  ...THESIS_SLIDES,

  // ── Build ──
  {
    id: 'eco-stack',
    chapter: 'build',
    chapterLabel: 'Build',
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
    chapter: 'build',
    chapterLabel: 'Build',
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
    chapter: 'build',
    chapterLabel: 'Build',
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
    ctaSecondary: { label: 'Design partner', href: '/design-partner' },
  },

  // ── Pulse (mainnet · verification · blog · market) ──
  {
    id: 'pulse-mainnet',
    chapter: 'pulse',
    chapterLabel: 'Pulse',
    eyebrow: 'Mainnet readiness',
    title: 'Seven gates to full open mainnet',
    subtitle: 'Honest scoreboard — no calendar dates. Pilot production is live; Sui mainnet deploy follows audit.',
    visual: 'readiness-gates',
    cta: { label: 'Full scoreboard', href: '/mainnet' },
  },
  {
    id: 'pulse-verification',
    chapter: 'pulse',
    chapterLabel: 'Pulse',
    eyebrow: 'Verification layer',
    title: 'Seven proof items — verify → persist → lookup',
    subtitle: 'The cryptographic core. Keys + Supabase flip each meter green in production.',
    visual: 'readiness-verification',
    cta: { label: 'Verification scoreboard', href: '/verification' },
    ctaSecondary: { label: 'E2E check', href: '/api/verify/e2e' },
  },
  {
    id: 'pulse-market',
    chapter: 'pulse',
    chapterLabel: 'Pulse',
    eyebrow: 'Market pulse',
    title: 'RWA · DeFi · macro — live desk',
    subtitle: 'Curated intelligence feed. Same data that powered the thesis article.',
    visual: 'market-pulse',
    cta: { label: 'Blog', href: '/blog' },
  },
  {
    id: 'pulse-blog',
    chapter: 'pulse',
    chapterLabel: 'Pulse',
    eyebrow: 'From the blog',
    title: 'Latest writing on verification & RWA',
    subtitle: 'Deep dives, case studies, and integration guides — not duplicated on every slide.',
    visual: 'blog-featured',
    cta: { label: 'All posts', href: '/blog' },
    ctaSecondary: { label: 'Docs', href: '/docs' },
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
