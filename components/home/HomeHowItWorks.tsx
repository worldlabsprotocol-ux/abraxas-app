// FILE: components/home/HomeHowItWorks.tsx
// Static 3-step row — no animation.

const STEPS = [
  { n: "01", title: "Verify once", body: "Identity, asset, and policy checks run through licensed providers and Abraxas policy." },
  { n: "02", title: "Credential issued", body: "A portable Passport credential and registry record — scoped to what counterparties need." },
  { n: "03", title: "Reuse everywhere", body: "Relying parties query Abraxas. You consent per request. No document re-upload." },
] as const;

export function HomeHowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="pr-section pr-section-border">
      <span className="pr-label">How it works</span>
      <h2 id="how-heading" className="pr-h2">Three steps. No rebuild per platform.</h2>
      <div className="pr-steps">
        {STEPS.map((step) => (
          <div key={step.n} className="pr-step-card">
            <span className="pr-step-num">{step.n}</span>
            <h3 className="pr-step-title">{step.title}</h3>
            <p className="pr-body">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
