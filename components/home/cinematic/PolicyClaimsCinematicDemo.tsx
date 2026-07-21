"use client";

import { motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { ClaimRow, PremiumGlassCard } from "@/components/home/cinematic/PremiumDemoPrimitives";
import { ACCENT, CONCEPT_TYPE } from "@/components/home/cinematic/demoPremium";

const ACT_MS = [5000, 5000, 5000];

const CLAIMS = [
  { label: "decision", value: "Approved", redacted: false },
  { label: "policy", value: "Cielo Guest v1", redacted: false },
  { label: "wallet_binding", value: "Active", redacted: false },
  { label: "government_id", value: "", redacted: true },
  { label: "selfie / biometrics", value: "", redacted: true },
  { label: "consent", value: "Current", redacted: false },
];

export function PolicyClaimsCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount, actProgress } = useCinematicTimer(ACT_MS);

  const captions = [
    "Relying party sets a policy. Abraxas evaluates claims — not folders.",
    "PII stays redacted. Only approved claims cross the wire.",
    "Minimum proof. Maximum clarity. Audit ref — not attachments.",
  ];
  const labels = ["Policy", "Redacted", "Approved"];

  const revealed = act === 1 ? 3 : act === 2 ? 6 : 6;

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={labels[act - 1] ?? ""}
      actCaption={captions[act - 1] ?? ""}
      variant="policy"
      compact={compact}
      minHeight={compact ? 240 : 280}
    >
      <div className="mx-auto w-full max-w-sm">
        <PremiumGlassCard accent={ACCENT.slate}>
          <div style={{ fontSize: CONCEPT_TYPE.label, letterSpacing: "0.12em", color: ACCENT.slate, fontWeight: 700, marginBottom: 12 }}>
            POLICY OUTPUT
          </div>
          {CLAIMS.map((c, i) => (
            <ClaimRow
              key={c.label}
              label={c.label}
              value={c.value || "████████"}
              redacted={c.redacted}
              visible={i < revealed}
            />
          ))}
        </PremiumGlassCard>
        {act === 3 && actProgress > 0.4 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: actEase }}
            style={{
              marginTop: 16, textAlign: "center",
              padding: "12px 16px", borderRadius: 12,
              background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)",
              fontSize: CONCEPT_TYPE.body, fontWeight: 800, color: "#6EE7B7",
              letterSpacing: "0.04em",
            }}
          >
            DECISION: APPROVED
          </motion.div>
        )}
      </div>
    </CinematicDemoShell>
  );
}
