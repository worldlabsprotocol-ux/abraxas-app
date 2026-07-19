'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AbraxasPassportVc,
  AppVerificationPortal,
  AuthenticationProofArtifact,
  ConnectionBeam,
  CounterpartyVerifierCard,
  DuplicateArrows,
  IdentitySourceScreen,
  NoRelayBadge,
  ReferenceContextCard,
  VerificationDebtMeter,
} from '@/components/home/cinematic/KycDocumentCards';
import { CINEMATIC_NO_RELAY_LINE, CINEMATIC_PROOF_ISSUED_LINE } from '@/lib/intersectionThesis';

const ACT1_MS = 8000;
const ACT2_MS = 7000;
const ACT3_MS = 9000;
const TOTAL_MS = ACT1_MS + ACT2_MS + ACT3_MS;

const ACT1_PORTALS = [
  { name: 'RWA marketplace', context: 'Asset onboarding', accent: 'violet' as const },
  { name: 'Lender portal', context: 'Credit underwriting', accent: 'gold' as const },
  { name: 'Hospitality ops', context: 'Operator credentialing', accent: 'violet' as const },
];

const actEase = [0.22, 1, 0.36, 1] as const;

export function HomeCinematicDemo() {
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
  const act1Progress = Math.min(1, elapsed / ACT1_MS);
  const act2Local = Math.max(0, elapsed - ACT1_MS);
  const act2Progress = Math.min(1, act2Local / ACT2_MS);
  const act3Local = Math.max(0, elapsed - ACT1_MS - ACT2_MS);
  const act3Progress = Math.min(1, act3Local / ACT3_MS);

  const debtCount = Math.min(12, Math.floor(act1Progress * 14));
  const portalPulse = Math.floor(act1Progress * 9) % 3;
  const showModal = act1Progress > 0.22 && act1Progress < 0.88;
  const mergeProgress = act2Progress;
  const proofPulse = act3Progress > 0.12 && act3Progress < 0.55;
  const verifierLit = act3Progress > 0.38;
  const showNoRelay = act3Progress > 0.52;

  const actLabel =
    act === 1 ? 'Verification debt' : act === 2 ? 'One Passport' : 'Proof issued';

  const actCaption =
    act === 1
      ? 'Every platform rebuilds trust from zero. Verification debt — not asset proof.'
      : act === 2
        ? 'One portable Passport resolves the repeated asks.'
        : CINEMATIC_PROOF_ISSUED_LINE;

  const actTransition = {
    initial: { opacity: 0, filter: 'blur(10px)', scale: 0.985 },
    animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
    exit: { opacity: 0, filter: 'blur(8px)', scale: 1.01 },
    transition: { duration: 0.65, ease: actEase },
  };

  return (
    <div className="cinematic-demo relative mx-auto w-full max-w-5xl">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-90"
        style={{
          background:
            act === 1
              ? 'radial-gradient(ellipse 80% 55% at 50% 42%, rgba(239,68,68,0.07), transparent 62%)'
              : act === 2
                ? 'radial-gradient(ellipse 75% 50% at 50% 45%, rgba(212,175,55,0.1), transparent 58%)'
                : 'radial-gradient(ellipse 80% 55% at 50% 40%, rgba(34,197,94,0.09), transparent 60%)',
          transition: 'background 0.8s ease',
        }}
        aria-hidden
      />

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#080a10]/90 p-4 shadow-2xl backdrop-blur-sm sm:p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  act === n ? 'w-8 bg-gold' : act > n ? 'w-4 bg-gold/40' : 'w-4 bg-white/10'
                }`}
              />
            ))}
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 sm:text-xs">
              {actLabel}
            </span>
          </div>
          <span className="font-mono text-[10px] tabular-nums text-white/25">
            {reducedMotion ? 'Paused' : `${Math.ceil((TOTAL_MS - elapsed) / 1000)}s`}
          </span>
        </div>

        <p className="mb-5 min-h-[2.75rem] text-center text-sm font-medium leading-snug text-white/85 sm:mb-6 sm:min-h-[2rem] sm:text-base md:text-lg">
          {actCaption}
        </p>

        <div className="relative min-h-[300px] sm:min-h-[340px] md:min-h-[380px]">
          <AnimatePresence mode="wait">
            {act === 1 && (
              <motion.div key="act1" {...actTransition} className="absolute inset-0 flex flex-col">
                <div className="mb-3 flex justify-center sm:mb-4">
                  <VerificationDebtMeter count={debtCount} />
                </div>

                <div className="cine-act1-portals relative flex flex-1 flex-col items-center justify-center gap-3 sm:gap-4">
                  <motion.div
                    className="cine-act1-source w-full max-w-[200px] sm:max-w-[220px]"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                  >
                    <IdentitySourceScreen copies={Math.max(1, Math.floor(debtCount / 2))} />
                  </motion.div>

                  <DuplicateArrows active={act1Progress > 0.1} />

                  <div className="grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                    {ACT1_PORTALS.map((portal, i) => (
                      <motion.div
                        key={portal.name}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1, duration: 0.45 }}
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
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <motion.div
                  className="relative flex w-full max-w-lg flex-col items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center gap-3 opacity-30 sm:gap-4"
                    animate={{ opacity: 1 - mergeProgress * 0.85, scale: 1 - mergeProgress * 0.15 }}
                  >
                    {ACT1_PORTALS.map((p) => (
                      <div
                        key={p.name}
                        className="h-16 w-[72px] rounded-lg border border-white/10 bg-white/[0.03] sm:h-20 sm:w-24"
                      />
                    ))}
                  </motion.div>

                  <motion.div
                    animate={{
                      scale: 0.88 + mergeProgress * 0.12,
                      opacity: 0.4 + mergeProgress * 0.6,
                    }}
                    transition={{ duration: 0.6, ease: actEase }}
                  >
                    <AbraxasPassportVc large pulse={mergeProgress > 0.55} />
                  </motion.div>

                  <motion.p
                    className="mt-4 text-center text-xs text-white/50 sm:text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: mergeProgress > 0.7 ? 1 : 0 }}
                  >
                    Same identity. One cryptographic credential.
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
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                  >
                    <ReferenceContextCard />
                  </motion.div>

                  <div className="cine-act3-beam flex items-center justify-center py-1 md:py-0">
                    <ConnectionBeam active={act3Progress > 0.08} vertical />
                  </div>

                  <motion.div
                    className="cine-act3-proof w-full max-w-[min(100%,300px)] shrink-0 md:max-w-[min(100%,320px)]"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, duration: 0.55, ease: actEase }}
                  >
                    <AuthenticationProofArtifact pulse={proofPulse} hero />
                  </motion.div>

                  <div className="cine-act3-beam flex items-center justify-center py-1 md:py-0">
                    <ConnectionBeam active={verifierLit} vertical />
                  </div>

                  <motion.div
                    className="cine-act3-verifier w-full max-w-[220px] shrink-0"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
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

                <motion.p
                  className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400/70 sm:text-xs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: act3Progress > 0.72 ? 1 : 0 }}
                >
                  {CINEMATIC_NO_RELAY_LINE}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
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
