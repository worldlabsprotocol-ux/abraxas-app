# Build #565 — Investor milestone (Passport portable trust)

**Outcome:** Abraxas Passport is a usable holder interface for portable trust—not only isolated verification libraries.

**What shipped**

- Holders see approved partner authorizations in Passport and can export a signed, policy-scoped presentation bundle.
- Consent completion points holders to portable export with accurate privacy language.
- Independent relying parties can authorize using locally trusted keys and authenticated revocation (demonstrated synthetically; no Abraxas identity DB at RP decision time).

**What we prove in tests**

- End-to-end: issuance → holder export → independent grant; wrong-audience reuse blocked.
- Security: tampered import, revoked portable snapshot, fail-closed semantics retained from #563/#564.

**What remains**

- Full production cutover of every partner URL to strict offline RP (today: parallel Abraxas-hosted evaluate path remains for operational partners).
- Holder vault automation and cross-device sync beyond JSON export/import validation.
