// FILE: scripts/demo/lib/knownProductionSigningKeyThumbprints.ts
// Defense-in-depth denylist of production signing public-key thumbprints.
//
// Public thumbprints only — never private keys. Update via reviewed PR when production
// signing keys rotate.

export const KNOWN_PRODUCTION_SIGNING_KEY_THUMBPRINTS = Object.freeze([
  // Populate when production public JWK thumbprint is reviewed for denylist use.
] as const satisfies readonly string[]);
