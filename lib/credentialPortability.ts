// FILE: lib/credentialPortability.ts
// Example credential claim structure + integrator notes.

export const EXAMPLE_CREDENTIAL_CLAIMS = {
  iss: "did:sui:abraxas-issuer",
  sub: "did:sui:0x…",
  vc: {
    credentialSubject: {
      verification: {
        level: "L3",
        status: "active",
        lastVerified: "2026-06-15",
        refreshDue: "2026-12-15",
      },
      identity: {
        provider: "Veriff",
        assurance: "government_id_liveness",
      },
      asset: {
        id: "ABX-RE-HOSP-001",
        name: "Cielo Sunrise",
        type: "hospitality",
        appraisedValue: {
          amount: 1100000,
          currency: "USD",
          assurance: "L3",
          source: "Blue Ridge Highlands Appraisal",
          asOf: "2025-05-01",
        },
      },
    },
  },
} as const;

export const INTEGRATOR_ENDPOINTS = [
  { method: "POST", path: "/api/credentials/verify", desc: "Verify presented JWT — no re-KYC" },
  { method: "GET", path: "/api/credentials/public-key", desc: "Ed25519 issuer public key" },
  { method: "GET", path: "/api/credentials/verify?wallet=…", desc: "Wallet credential status" },
  { method: "GET", path: "/api/verify/registry?q=…", desc: "Asset + registry lookup" },
  { method: "GET", path: "/api/trust/status?sui=…", desc: "Account trust tier" },
] as const;
