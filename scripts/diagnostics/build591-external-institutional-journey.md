# Build #591 — External institutional integration journey

## Integration path (shipped)

1. **Product model** — `/developers/institutional-verification` (SDK contract, trust pins, rejection codes)
2. **Sandbox application** — `/developers/launchpad?template=sandbox_institutional_protocol_access` or Integration Studio institutional pack
3. **Workspace** — `/developers/institutional-integration?application=<id>` (binding, SDK tarball, journey steps)
4. **Hosted verification** — `/partner/verify?app=<slug>`
5. **Receipt + verify** — Partner callback / API + institutional SDK on integrator infrastructure
6. **Evidence** — `GET /api/launchpad/applications/:id/integration-health` → `institutional_activation` + `institutional_first_verified_outcome`
7. **Production** — explicit operator review (no auto-promotion)

## Blockers addressed in #591

- Canonical eight-step navigation across design partner, developers hub, verification docs, and integration workspace
- Partner-safe **first verified outcome** panel sourced from integration events (no fabricated receipts)
- Time-to-first-verify only when `institutional_activation.time_to_first_independent_verify_quality === "measured"`

## External consumer example

- `examples/external-sdk-consumer/` + `npm run test:institutional-sdk`
- Documented failure scenarios in README (wrong policy, replay)

## Adoption metrics limitation

If no `receipt_verification_succeeded` integration event exists for the tenant application, time-to-first-verify remains **unavailable** — not estimated.
