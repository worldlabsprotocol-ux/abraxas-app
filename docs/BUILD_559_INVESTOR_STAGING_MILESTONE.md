# Investor milestone — Sovereign staging infrastructure (Build #559)

## What was built

Abraxas now has a **deployment-ready sovereign staging model** (Builds #552–#558): direct PostgreSQL persistence, encrypted evidence custody, Abraxas-controlled signing, encrypted backups, independent restore drills with operator authorization, and strict HTTP smoke certification that does not confuse availability with full protocol completion.

Build #559 adds an **execution orchestrator** that inventories real infrastructure (without exposing secrets), runs observed HTTP boundary checks on a deployed staging URL, runs synthetic lifecycle certification only on isolated databases, and reports tiers separately.

## Why independent infrastructure matters

Relying parties need **cryptographic verification** of scoped decisions without Abraxas or Supabase sitting in the trust path for identity persistence. Sovereign staging proves the protocol can run on Abraxas-operated Postgres and encrypted storage with recoverable state—before any production cutover.

## What was actually verified (this environment)

- **Code and gates:** staging activation, restore safety, HTTP probe invariants, adversarial tests (CI).
- **Agent VM:** disposable PostgreSQL for synthetic certification only—not persistent staging, not a public staging hostname.
- **Not verified here:** full authenticated staging journey on a founder-hosted URL, persistent recovery drill, or human identity review.

## What remains before institutional deployment

- Founder-provisioned **persistent staging** host, database, volumes, and HTTPS API URL.
- **Observed** (not synthetic) HTTP certification on that URL.
- **Recovery drill** on an isolated restore database with operator authorization.
- Operational **human IDV** and production governance (out of scope for automated certification).

## What we are not claiming

- No customers, revenue, partnerships, third-party audits, or production readiness from this milestone.
- Synthetic test identities are **not** genuine human verification.
