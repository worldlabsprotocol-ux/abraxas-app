'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AbraxasPassportVc,
  AppVerificationPortal,
  AuthenticationProofArtifact,
  BurdenStackLayer,
  ConnectionBeam,
  CounterpartyVerifierCard,
  NoRelayBadge,
  ReferenceContextCard,
  VerificationDebtMeter,
} from '@/components/home/cinematic/KycDocumentCards';
import { CINEMATIC_NO_RELAY_LINE, CINEMATIC_PROOF_ISSUED_LINE } from '@/lib/intersectionThesis';
import { PremiumEyebrow, PremiumHeadline, PremiumMeshBg, DemoActProgress } from '@/components/home/cinematic/PremiumDemoPrimitives';
import { CosmicParticleField } from '@/components/home/cinematic/CosmicDemoEffects';
import { ACCENT, DEMO_TYPE } from '@/components/home/cinematic/demoPremium';

const ACT1_MS = 8000;
const ACT2_MS = 7000;
const ACT3_MS = 9000;
const TOTAL_MS = ACT1_MS + ACT2_MS + ACT3_MS;

const ACT1_PORTALS = [
  { name: 'RWA marketplace', context: 'Asset onboarding', accent: 'violet' as const },
  { name: 'Private lender', context: 'Credit underwriting', accent: 'gold' as const },
  { name: 'Hospitality ops', context: 'Operator credentialing', accent: 'violet' as const },
  { name: 'Custody', context: 'Beneficial owner proof', accent: 'gold' as const },
];

const BURDEN_STEPS = [
  { at: 0, count: 1 },
  { at: 1000, count: 2 },
  { at: 2400, count: 3 },
  { at: 3800, count: 4 },
  { at: 5200, count: 5 },
  { at: 6400, count: 6 },
  { at: 7200, count: 7 },
];

const actEase = [0.22, 1, 0.36, 1] as const;

function debtCountAt(ms: number): number {
  let count = 1;
  for (const step of BURDEN_STEPS) {
    if (ms >= step.at) count = step.count;
  }
  return count;
}

function activePortalIndex(ms: number): number {
  if (ms < 1400) return 0;
  if (ms < 3000) return 1;
  if (ms < 4600) return 2;
  return 3;
}

function act3Phase(ms: number): 'context' | 'issue' | 'verify' | 'land' {
  if (ms < 2000) return 'context';
  if (ms < 4500) return 'issue';
  if (ms < 7000) return 'verify';
  return 'land';
}

export function HomeCinematicDemo({ hero = false }: { hero?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setElapsed(TOTAL_MS - 1);
      return;
    }
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const next = (now - startRef.current) % TOTAL_MS;
      setElapsed(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  const act = elapsed < ACT1_MS ? 1 : elapsed < ACT1_MS + ACT2_MS ? 2 : 3;
  const act1Local = Math.min(elapsed, ACT1_MS);
  const act2Local = Math.max(0, elapsed - ACT1_MS);
  const act3Local = Math.max(0, elapsed - ACT1_MS - ACT2_MS);
  const act1Progress = Math.min(1, act1Local / ACT1_MS);
  const act2Progress = Math.min(1, act2Local / ACT2_MS);
  const act3Progress = Math.min(1, act3Local / ACT3_MS);

  const debtCount = debtCountAt(act1Local);
  const portalPulse = act === 1 ? activePortalIndex(act1Local) : -1;
  const showModal = act === 1 && act1Local > 800 && act1Local < 7400;
  const phase3 = act === 3 ? act3Phase(act3Local) : 'context';

  const mergeProgress = act2Progress;
  const passportRevealed = act2Progress > 0.42;
  const proofIssued = phase3 !== 'context';
  const proofPulse = phase3 === 'issue';
  const verifierLit = phase3 === 'verify' || phase3 === 'land';
  const showNoRelay = phase3 === 'land' || act3Progress > 0.55;
  const showFinalLine = phase3 === 'land';

  const actLabel =
    act === 1 ? 'Verification debt' : act === 2 ? 'One Passport' : 'Proof issued';

  const actCaption =
    act === 1
      ? 'Every platform rebuilds trust from zero. Verification debt — not asset proof.'
      : act === 2
        ? 'One portable Passport resolves the repeated asks.'
        : showFinalLine
          ? CINEMATIC_PROOF_ISSUED_LINE
          : 'Cryptographic proof anyone can verify independently.';

  const actTransition = {
    initial: { opacity: 0, filter: 'blur(10px)', scale: 0.985 },
    animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
    exit: { opacity: 0, filter: 'blur(8px)', scale: 1.01 },
    transition: { duration: 0.65, ease: actEase },
  };

  const meshKey = act === 1 ? 'danger' : act === 2 ? 'gold' : 'emerald';
  const accent = act === 1 ? ACCENT.danger : act === 2 ? ACCENT.gold : ACCENT.emerald;
  const actPillLabels = ['Debt', 'Passport', 'Proof'];

  return (
    <div className={`cinematic-demo relative mx-auto w-full ${hero ? 'max-w-[1120px]' : 'max-w-5xl'}`}>
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: `0 32px 100px rgba(0,0,0,0.55), 0 0 72px ${accent}14`,
        }}
      >
        <PremiumMeshBg mesh={meshKey} />
        <CosmicParticleField accent={accent} count={hero ? 20 : 14} />

        {act === 1 && (
          <div
            className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-700"
            style={{
              background:
                'radial-gradient(ellipse 75% 55% at 50% 35%, rgba(220,38,38,0.14) 0%, transparent 68%)',
            }}
          />
        )}

        <div className={`relative z-10 ${hero ? 'px-6 py-7 sm:px-10 sm:py-9' : 'px-5 py-6 sm:px-8 sm:py-8'}`}>
          <div className="flex flex-col items-center text-center">
            <PremiumEyebrow accent={accent} centered large={hero}>
              {actLabel}
            </PremiumEyebrow>
            <PremiumHeadline mesh={meshKey} centered large={hero}>
              {actCaption}
            </PremiumHeadline>
            <DemoActProgress
              act={act}
              actCount={3}
              accent={accent}
              labels={actPillLabels}
              centered
            />
          </div>

          <div
            className={`relative mt-6 sm:mt-8 ${
              hero ? 'min-h-[360px] sm:min-h-[420px] md:min-h-[460px]' : 'min-h-[300px] sm:min-h-[340px] md:min-h-[380px]'
            }`}
          >
            <AnimatePresence mode="wait">
              {act === 1 && (
                <motion.div key="act1" {...actTransition} className="absolute inset-0 flex flex-col items-center">
                  <div className="mb-4 flex w-full max-w-md justify-center sm:mb-5">
                    <VerificationDebtMeter count={debtCount} max={7} />
                  </div>

                  <div className="cine-act1-portals relative flex w-full max-w-4xl flex-1 flex-col items-center justify-center">
                    <BurdenStackLayer count={debtCount} />
                    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3.5">
                      {ACT1_PORTALS.map((portal, i) => (
                        <motion.div
                          key={portal.name}
                          className="w-full"
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.08, duration: 0.45 }}
                        >
                          <AppVerificationPortal
                            name={portal.name}
                            context={portal.context}
                            accent={portal.accent}
                            pulse={portalPulse === i}
                            showModal={showModal && portalPulse === i}
                            uploadN={debtCount}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {act === 2 && (
                <motion.div
                  key="act2"
                  {...actTransition}
                  className="absolute inset-0 flex flex-col items-center justify-center px-4"
                >
                  <motion.div
                    className="relative flex w-full max-w-lg flex-col items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute inset-0 grid grid-cols-2 gap-2 p-2 sm:grid-cols-2"
                      animate={{
                        opacity: 1 - mergeProgress * 0.9,
                        scale: 1 - mergeProgress * 0.12,
                        filter: mergeProgress > 0.5 ? 'blur(6px)' : 'blur(0px)',
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      {ACT1_PORTALS.map((portal, i) => (
                        <motion.div
                          key={portal.name}
                          animate={{
                            x: (1.5 - i) * mergeProgress * 28,
                            y: (i - 1.5) * mergeProgress * 18,
                            opacity: 1 - mergeProgress,
                          }}
                        >
                          <AppVerificationPortal
                            name={portal.name}
                            context={portal.context}
                            accent={portal.accent}
                            pulse={false}
                          />
                        </motion.div>
                      ))}
                    </motion.div>

                    <motion.div
                      animate={{
                        scale: (hero ? 0.92 : 0.85) + mergeProgress * (hero ? 0.1 : 0.12),
                        opacity: passportRevealed ? 1 : 0.25,
                      }}
                      transition={{ duration: 0.65, ease: actEase }}
                    >
                      <AbraxasPassportVc
                        large={hero || passportRevealed}
                        pulse={mergeProgress > 0.65}
                        merge={passportRevealed}
                      />
                    </motion.div>

                    <motion.p
                      className="mt-4 text-center font-semibold text-white/70"
                      style={{ fontSize: DEMO_TYPE.lg }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: mergeProgress > 0.72 ? 1 : 0 }}
                    >
                      One portable identity. Verified once.
                    </motion.p>
                  </motion.div>
                </motion.div>
              )}

              {act === 3 && (
                <motion.div key="act3" {...actTransition} className="absolute inset-0">
                  <div className="cine-act3-flow flex h-full flex-col items-center justify-center gap-4 md:flex-row md:gap-5">
                    <motion.div
                      className="cine-act3-ref w-full max-w-[200px] shrink-0 md:max-w-[210px]"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{
                        opacity: phase3 === 'context' ? 1 : 0.55,
                        x: 0,
                        scale: phase3 === 'land' ? 0.96 : 1,
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      <ReferenceContextCard highlight={phase3 === 'context'} />
                    </motion.div>

                    <div className="cine-act3-beam flex items-center justify-center py-1 md:py-0">
                      <ConnectionBeam active={proofIssued} vertical animated={phase3 === 'verify'} />
                    </div>

                    <motion.div
                      className="cine-act3-proof w-full max-w-[min(100%,460px)] shrink-0"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{
                        opacity: proofIssued ? 1 : 0.35,
                        scale: proofIssued ? 1 : 0.92,
                      }}
                      transition={{ duration: 0.55, ease: actEase }}
                    >
                      <AuthenticationProofArtifact pulse={proofPulse} hero issued={proofIssued} />
                    </motion.div>

                    <div className="cine-act3-beam flex items-center justify-center py-1 md:py-0">
                      <ConnectionBeam active={verifierLit} vertical animated={phase3 === 'verify'} />
                    </div>

                    <motion.div
                      className="cine-act3-verifier w-full max-w-[240px] shrink-0"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{
                        opacity: verifierLit ? 1 : 0.3,
                        x: 0,
                      }}
                      transition={{ delay: verifierLit ? 0.15 : 0, duration: 0.5 }}
                    >
                      <CounterpartyVerifierCard active={verifierLit} />
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {showNoRelay && (
                      <motion.div
                        className="mt-4 flex justify-center sm:mt-5"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <NoRelayBadge />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {showFinalLine && (
                    <motion.div
                      className="mx-auto mt-4 max-w-lg rounded-xl border border-amber-400/30 bg-amber-400/12 px-5 py-3.5 text-center sm:mt-5"
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: actEase }}
                      style={{ boxShadow: '0 0 40px rgba(251,191,36,0.12)' }}
                    >
                      <p
                        className="font-semibold tracking-tight text-amber-100/95"
                        style={{ fontSize: DEMO_TYPE.finalLine }}
                      >
                        {CINEMATIC_PROOF_ISSUED_LINE}
                      </p>
                    </motion.div>
                  )}

                  <motion.p
                    className="mt-3 text-center font-mono uppercase tracking-[0.14em] text-emerald-400/85"
                    style={{ fontSize: DEMO_TYPE.sm }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showNoRelay ? 1 : 0 }}
                  >
                    {CINEMATIC_NO_RELAY_LINE}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative z-10 h-px bg-white/[0.04]">
          <motion.div
            className="h-full"
            animate={{ width: `${(act / 3) * 100}%` }}
            transition={{ duration: 0.6, ease: actEase }}
            style={{
              background: `linear-gradient(90deg, ${accent}, transparent)`,
              boxShadow: `0 0 12px ${accent}66`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 767px) {
          .cine-act3-flow {
            gap: 0.65rem;
          }
          .cine-act3-beam {
            transform: scale(0.85);
          }
        }
        @media (min-width: 768px) {
          .cine-act3-flow .cine-act3-beam :global(svg) {
            width: 3.5rem;
          }
        }
      `}</style>
    </div>
  );
}
