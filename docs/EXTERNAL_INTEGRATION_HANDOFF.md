# External institutional integration handoff

Concise link set for engineering and security teams evaluating Abraxas **without repository access**.

## 1. Developer entry

- [Integration Studio](https://abraxasworld.xyz/developers/integration-studio) — create sandbox application, receive one-time `abx_test_*` credential
- [Partner Launchpad](https://abraxasworld.xyz/developers/launchpad) — configure policy, callbacks, webhooks, test console, production request

## 2. Quickstart

- [Verify with Abraxas quickstart](https://abraxasworld.xyz/docs/VERIFY_WITH_ABRAXAS_QUICKSTART)
- [Partner Flow integrator guide](https://abraxasworld.xyz/docs/partner-flow)
- [Hosted partner handoff](https://abraxasworld.xyz/docs/hosted-partner-flow-handoff)

## 3. Machine-readable API contract

- OpenAPI YAML: [https://abraxasworld.xyz/openapi/partner-flow.openapi.yaml](https://abraxasworld.xyz/openapi/partner-flow.openapi.yaml)
- API docs page: [https://abraxasworld.xyz/docs/partner-flow-api](https://abraxasworld.xyz/docs/partner-flow-api)
- Compatibility manifest: [https://abraxasworld.xyz/api/protocol/compatibility](https://abraxasworld.xyz/api/protocol/compatibility)

## 4. PartnerKit (server-side verification)

- Usage: [PARTNER_KIT.md](./PARTNER_KIT.md)
- **Install:** [PARTNER_KIT_DISTRIBUTION.md](./PARTNER_KIT_DISTRIBUTION.md) — versioned tarball (public npm pending license decision)
- Integration Kit docs: [https://abraxasworld.xyz/docs/integration-kit](https://abraxasworld.xyz/docs/integration-kit)

## 5. Security and privacy architecture

- [External security review package](./EXTERNAL_SECURITY_REVIEW_PACKAGE.md)
- [Reviewer guide](./external-security-review/REVIEWER_GUIDE.md)
- [Enterprise security overview (draft)](./commercial/ENTERPRISE_SECURITY_OVERVIEW_v1.md)
- [Data responsibility matrix](./commercial/DATA_RESPONSIBILITY_MATRIX.md)

**Note:** Independent third-party security review has not been completed; the package supports diligence, not attestation.

## 6. Production process

- [Production review](https://abraxasworld.xyz/docs/production-review) — structured enterprise review (not automatic)
- [Production credentials](https://abraxasworld.xyz/docs/production-credentials) — operator-issued live keys after approval

## 7. Optional design partner track

- [Design partner program](https://abraxasworld.xyz/design-partner) — custom policy collaboration, structured pilot, commercial relationship. **Not required** for standard sandbox integration.

## Trust model (summary)

| Signal | Role |
|--------|------|
| Browser callback / deep link | Completion notification only — not authorization |
| Webhook delivery | Signed notification only — not authorization |
| `GET /api/receipts/{id}/public` | Authoritative signed receipt + live trust fields |
| `verifyForAction` / `permitProtocolAction` | Server-side permit/deny gate |
