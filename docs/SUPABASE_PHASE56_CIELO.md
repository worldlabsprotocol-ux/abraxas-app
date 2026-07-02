# Cielo Phases 5–6 — no extra Supabase SQL

Phases 5 (guest status portal) and 6 (on-chain receipt + live revenue metrics) use existing tables:

- `stay_requests` — booking lifecycle, payment fields from Phase 2
- `cielo_calendar_blocks` — Protocol Calendar holds

If you already ran `docs/SUPABASE_RUN_ALL_RECENT.sql` and `014_cielo_payment_phase2.sql`, you are done.

## New routes

| Route | Purpose |
|-------|---------|
| `/cielo/status?booking_id=BKG-…` | Guest tracks booking (email + ID) |
| `/cielo/receipt?booking_id=BKG-…` | Public receipt after `captured` |
| `POST /api/cielo/status` | `{ booking_id, email }` lookup |
| `GET /api/cielo/receipt?booking_id=…` | On-chain receipt JSON |

## Full loop (Phases 1–6)

1. Book on flagship → calendar hold
2. Admin confirms → pay email
3. Guest pays (one-click or digest)
4. Mainnet USDC verified → `captured`
5. Guest tracks at `/cielo/status`
6. Receipt at `/cielo/receipt` · homepage metrics update
