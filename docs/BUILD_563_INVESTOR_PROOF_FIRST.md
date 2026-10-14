# Build #563 — Investor milestone (proof-first)

**What became independently verifiable**

Partners can authorize using a **holder-presented, Ed25519-signed decision receipt** and a **local verification key registry** — without calling Abraxas APIs or reading Abraxas identity databases. Replay protection is enforced on the **partner’s side**.

**What personal data no longer needs to be shared for that path**

Government images, biometrics, and raw IDV payloads are **not part** of the holder presentation bundle. Partners receive policy-scoped claim references and signed eligibility outcomes — not document custody.

**What we are not claiming**

- Not full zero-knowledge identity.
- Not removal of all centralized services (wallet login, issuance, optional evidence retention remain).
- Not production deployment or mainnet registry activation in this build.

**Why it matters for institutional adoption**

Institutions can integrate against a **cryptographic trust decision** with explicit DENY/BLOCKED semantics, auditable phases, and custody boundaries — reducing counterparty risk that verification depends on Abraxas retaining sensitive evidence or live API availability at transaction time.
