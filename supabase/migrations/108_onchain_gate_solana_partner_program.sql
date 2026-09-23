-- DEMO-first: persist the partner program observed in Solana GateConfig.
-- No existing Solana deployment is promoted by this migration. Legacy rows
-- remain null and the issuance path rejects them until re-registered.
alter table public.onchain_gate_deployments
  add column if not exists partner_program_id text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'onchain_gate_partner_program_shape'
      and conrelid = 'public.onchain_gate_deployments'::regclass
  ) then
    alter table public.onchain_gate_deployments
      add constraint onchain_gate_partner_program_shape
      check (
        (gate_type = 'evm' and partner_program_id is null)
        or (gate_type = 'solana' and (partner_program_id is null or length(partner_program_id) between 32 and 44))
      );
  end if;
end $$;

comment on column public.onchain_gate_deployments.partner_program_id is
  'Solana partner consumer program ID, checked against the decoded GateConfig and included in the config digest. Null legacy rows cannot issue.';
