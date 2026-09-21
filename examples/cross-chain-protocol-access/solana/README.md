See solana/abraxas-eligibility-gate/programs/abraxas-protocol-access

Interface:
  initialize_protocol_access
  activate_protocol_access(subject_hash) — copies Authorization.expires_at into valid_until
  assert_protocol_access(subject_hash) — inactive once Clock >= valid_until

Local ProgramTest only. Consumes a gate Authorization PDA once. No token accounts.
