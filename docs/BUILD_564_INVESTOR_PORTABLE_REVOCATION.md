# Build #564 — Investor milestone (portable revocation)

**Milestone:** Partners can determine whether a Passport presentation is **currently authorized** using holder-presented credentials, packaged issuer keys, and a **cryptographically signed revocation snapshot** — without calling Abraxas APIs or accessing underlying identity records.

**What shipped (cryptographic / protocol):**

- Versioned, signed revocation status artifact with freshness, expiry, and rollback detection.
- Privacy-preserving status identifiers (no PII in the feed).
- Strict integration with independent relying-party verification — fabricated “active” hints no longer authorize.

**What is not claimed:**

- Production revocation feed operations, CDN distribution, or 24/7 monitoring.
- On-chain deployment or mainnet commitments (design allows optional anchors only).

**Trust dependencies remaining:** Partners must obtain fresh signed snapshots from an authorized distribution path they trust (mirrors, email bundles, chain anchors, etc.) and maintain their own replay controls.
