// Build #518 — Integration Studio step framing (what / why / now / next).

export const INTEGRATION_STUDIO_GUIDED_STEPS = [
  {
    id: "outcome",
    title: "Pick an outcome",
    why: "Different products need different integration paths.",
    now: "Choose what you are building (hosted flow, server verify, webhooks, etc.).",
    next: "Select a policy pack that matches your eligibility question.",
  },
  {
    id: "policy",
    title: "Choose a policy pack",
    why: "The pack defines what Abraxas checks and what answer partners receive.",
    now: "Review disclosed results and privacy boundaries for the pack.",
    next: "Create or resume a sandbox application.",
  },
  {
    id: "sandbox",
    title: "Create sandbox",
    why: "Sandbox lets you test without production credentials or live holder data.",
    now: "Name your app and set a return URL for hosted flows.",
    next: "Generate a starter kit and run your first holder test.",
  },
  {
    id: "test",
    title: "Test & hand off",
    why: "Prove the holder journey before requesting production access.",
    now: "Open Launchpad to run a verification and verify receipts on your server.",
    next: "Request production activation when checks pass.",
  },
] as const;
