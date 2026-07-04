// FILE: lib/consumerCopy.ts
// Plain-language strings for end users. Crypto/vendor terms live in /docs for developers.

export const consumerCopy = {
  hero: {
    badge: "Verified ownership for real assets",
    headline: "Real assets deserve real proof.",
    subhead:
      "Browse tokenized real estate, royalties, and yield on Abraxas. Sign in with Google when you're ready to book or invest — no seed phrase, no wallet setup.",
    footnote: "Sign in with Google · no seed phrase · ID check only when a deal requires it",
    cardChip: "Sign in with Google · no seed phrase",
    cardBody: "Real assets. Verified ownership. One account every partner can trust.",
    positioning: "Browse first",
    positioningDetail: "Verify when you transact",
  },
  nav: {
    account: "Account",
    assets: "Assets",
  },
  browseBanner: {
    title: "Browse the full platform — no ID check required",
    body: "Like Coinbase or Binance, you can explore assets, calendars, and deals first. We only ask for identity verification when you pay, invest, or submit an asset.",
  },
  onboarding: {
    title: "What do you want to do?",
    subtitle: "Pick one — no account needed to look around.",
  },
  verificationFlow: {
    step1Title: "Create account",
    step1Body:
      "Sign in with Google. Your Abraxas wallet is ready in seconds — browse assets, save deals, and book stays.",
    step2Title: "Verify identity",
    step2Body:
      "Optional ID check when a deal or protocol requires enhanced trust. Licensed provider — Abraxas stores only the outcome.",
    step3Title: "Get passport",
    step3Body:
      "W3C credential issued to your wallet automatically after approval. On-chain stamps when configured.",
    step4Title: "Reuse anywhere",
    step4Body:
      "Share your verify link or JWT. Partners call our API — you never re-upload documents.",
    trustChips: ["Optional ID check", "Portable proof", "Licensed providers", "Secure by design"],
    intro:
      "Four clear steps: account → identity → passport → reuse. Browse first; verify only when needed.",
  },
  passport: {
    eyebrow: "Your Abraxas account",
    headline: "Sign in. Transact. Verify when you need more.",
    subhead:
      "Sign in with Google to get a wallet in seconds. Browse assets, submit deals, and pay for bookings immediately. Add an optional ID check later for enhanced trust stamps.",
    walletStep: "Step 1 · Sign in with Google",
    walletHint:
      "One click creates your Abraxas wallet. No browser extension, no seed phrase to write down.",
    idVerification: "ID verification (optional)",
    idCheck: "Optional ID check",
    precheck: "Start ID check",
    precheckProvider: "Powered by a licensed identity provider. Abraxas stores only the outcome — never your documents.",
    walkthroughTitle: "Create account → Verify identity → Get passport → Reuse anywhere.",
    walkthroughEyebrow: "Guided walkthrough",
    flowSteps: [
      { subtitle: "Google zkLogin creates your wallet in one click — no seed phrase." },
      { subtitle: "Optional government ID + selfie when a deal or protocol needs enhanced trust." },
      { subtitle: "W3C credential issued automatically after approval — portable proof on Sui." },
      { subtitle: "Share your verify link or JWT. Partners check once — never re-upload your ID." },
    ],
  },
  trustCard: {
    title: "Account status",
    ready: "Ready to use",
    readyEnhanced: "Fully verified",
    readyBody:
      "Your account is active. Browse, book, and pay. Add an ID check anytime for enhanced trust stamps.",
    enhancedBody: "Your account is active and your identity is verified. Full trust tier unlocked.",
    signInBody: "Sign in with Google to create your Abraxas wallet. No seed phrase required.",
    rows: {
      wallet: "Account wallet",
      intent: "Security check",
      identity: "ID verification",
      credential: "Portable proof",
      onChain: "Verified profile",
    },
    upgradeTitle: "Optional: add ID verification",
    upgradeBody:
      "An ID check unlocks enhanced trust stamps and portable proof. It does not block browsing or booking today.",
    upgradeCta: "Start ID check when ready →",
  },
  intent: {
    title: "Confirm it's you",
    body: "Quick security check after sign-in. No payment required. ID verification is not needed for this step.",
    cta: "Confirm account",
    verified: "✓ Account confirmed for this session",
  },
  cielo: {
    bookButton: "Book your stay →",
    payBadge: "Payment",
    payHeadline: (amount: number, asset: string) => `Pay ${amount} ${asset}`,
    payHint: "One tap — we handle the transfer and confirm automatically.",
    signInToPay: "Sign in with Google to pay in one click.",
    walletOptional: "Payment wallet (optional)",
    walletPlaceholder: "Filled automatically after sign-in",
    contactHint: "We confirm within 24 hours and send payment instructions by email.",
    donePay: "Pay now →",
  },
  integrator: {
    eyebrow: "For developers",
    title: "Building on Abraxas?",
    body: "Integrate trust checks into your app. Users consent once — you receive signed proof, never raw documents.",
    cta: "Read the integration docs →",
  },
  packages: {
    intro:
      "Optional trust upgrades — not login gates. Use a free account first. Add ID or asset verification when a deal, lender, or protocol requires it.",
    walletPackage: "Google sign-in, asset browsing, and booking. No ID check required.",
    identityPackage: "Government ID + selfie check. Portable proof and enhanced trust stamps.",
  },
} as const;
