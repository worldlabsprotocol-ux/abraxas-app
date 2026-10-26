-- Build #854 security correction — subject binding + atomic execution outcomes (disposable/staging only).

begin;

alter table public.wallet_scoped_trust_challenges
  add column if not exists subject_pseudonym_id text;

update public.wallet_scoped_trust_challenges
   set subject_pseudonym_id = coalesce(subject_pseudonym_id, 'legacy_unbound')
 where subject_pseudonym_id is null;

alter table public.wallet_scoped_trust_challenges
  alter column subject_pseudonym_id set not null;

create table if not exists public.wallet_scoped_trust_execution_outcomes (
  authorization_ref text primary key,
  challenge_id      text not null unique references public.wallet_scoped_trust_challenges(id),
  partner_id        text not null references public.partners(partner_id),
  application_id    uuid not null,
  receipt_id        text not null,
  correlation_id    text not null unique,
  decision_result   text not null check (decision_result in ('approved', 'denied', 'indeterminate')),
  finalized_at      timestamptz not null default now()
);

comment on table public.wallet_scoped_trust_execution_outcomes is
  'One finalized signed trust decision per consumed wallet authorization_ref.';

commit;
