# Build #564 — Investor milestone (portable revocation, final)

**Milestone:** Independent institutions can establish **authenticated, fresh, rollback-resistant** revocation status for Passport presentations without calling Abraxas during authorization.

**Cryptographic / protocol (proven in tests):**

- Signed portable revocation snapshots with bounded freshness and chained sequences.
- Local issuer-trust binding (receipt signing key ↔ revocation issuer ↔ snapshot keys).
- Relying-party checkpoint store and explicit bootstrap anchors (no silent trust of arbitrary snapshots).
- Strict proof-first partner path; unsigned “active” hints rejected.

**Not claimed:** Production feed operations, global unlinkability against colluding partners, or on-chain deployment.

**Remaining trust:** Partners must configure issuer-trust policy, distribute bootstrap anchors out-of-band, and operate checkpoint storage locally.
