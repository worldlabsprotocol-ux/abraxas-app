// Documented institutional replay reservation semantics (Build #524).

/** Nonces are consumed only when a request reaches the permit path (after trust evaluation). */
export const INSTITUTIONAL_REPLAY_RESERVATION_POLICY = "permit_path_only" as const;

/**
 * Invalid binding, trust denial, and refresh-required outcomes do not consume replay nonces,
 * allowing partners to retry with the same nonce after correcting evidence or refreshing receipts.
 * Concurrent permit attempts with the same scoped nonce remain first-writer-wins via Postgres RPC.
 */
export type InstitutionalReplayReservationPolicy = typeof INSTITUTIONAL_REPLAY_RESERVATION_POLICY;
