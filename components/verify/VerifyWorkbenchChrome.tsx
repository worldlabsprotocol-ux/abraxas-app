// Server-friendly workbench step labels — visual hierarchy for receipt verification.

const STEPS = [
  "Receipt input",
  "Verification action",
  "Cryptographic result",
  "Policy & issuer provenance",
  "Freshness & revocation",
  "Raw proof",
] as const;

export function VerifyWorkbenchChrome() {
  return (
    <div className="abx-verify-workbench" aria-hidden={false}>
      <div className="abx-verify-workbench__steps" role="list" aria-label="Verification workbench stages">
        {STEPS.map((label, i) => (
          <div
            key={label}
            role="listitem"
            className={`abx-verify-workbench__step${i === 0 ? " abx-verify-workbench__step--active" : ""}`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
