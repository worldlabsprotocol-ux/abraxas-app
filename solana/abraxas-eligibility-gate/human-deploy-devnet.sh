#!/usr/bin/env bash
# Human-operated Solana devnet deploy. Never invoked by CI, Vercel, or API routes.
set -euo pipefail
if [[ "${CONFIRM:-}" != "yes" && "${1:-}" != "--confirm" ]]; then
  echo "confirmation_required" >&2
  exit 2
fi
if [[ -z "${ABRAXAS_GATE_SOLANA_RPC_URL:-}" || -z "${ABRAXAS_GATE_SOLANA_KEYPAIR:-}" ]]; then
  echo "missing_operator_config" >&2
  exit 2
fi
echo "human_broadcast_not_invoked_from_automation"
exit 3
