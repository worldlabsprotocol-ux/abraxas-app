// FILE: lib/developers/guidedIntegrationJourney.ts
// Human-readable progression for Developer Workspace → Integration Studio (real execution stages).

export const GUIDED_INTEGRATION_JOURNEY = [
  {
    id: "prove_wallet_control",
    step: 1,
    title: "Prove wallet control",
    outcome: "I proved that I control my wallet.",
  },
  {
    id: "create_test_app",
    step: 2,
    title: "Create my test app",
    outcome: "I created a place to experiment safely.",
  },
  {
    id: "request_verification",
    step: 3,
    title: "Request verification",
    outcome: "My app asked Abraxas a real trust question.",
  },
  {
    id: "receive_proof",
    step: 4,
    title: "Receive my first proof",
    outcome: "A signed verification receipt was issued.",
  },
  {
    id: "verify_independently",
    step: 5,
    title: "Verify it independently",
    outcome: "Another system can check my proof without simply trusting Abraxas.",
  },
] as const;

export type GuidedIntegrationJourneyStepId = (typeof GUIDED_INTEGRATION_JOURNEY)[number]["id"];

export function guidedJourneyProgressLabel(currentStep: number, total = GUIDED_INTEGRATION_JOURNEY.length): string {
  const clamped = Math.min(Math.max(1, currentStep), total);
  return `${clamped} of ${total}`;
}

export function guidedJourneyStepById(id: GuidedIntegrationJourneyStepId) {
  return GUIDED_INTEGRATION_JOURNEY.find((s) => s.id === id)!;
}
