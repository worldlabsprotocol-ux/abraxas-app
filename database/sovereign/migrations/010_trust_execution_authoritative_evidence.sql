-- Build #854 authoritative evidence bindings (disposable/staging sovereign PG only).

begin;

create table if not exists public.wallet_scoped_trust_authoritative_evidence (
  partner_id            text not null references public.partners(partner_id),
  application_id        uuid not null,
  policy_id             text not null,
  policy_version        int  not null,
  subject_pseudonym_id  text not null,
  source_credential_id  text not null references public.sovereign_evidence_sources(source_credential_id),
  claim_id              text not null references public.sovereign_claim_status(claim_id),
  primary key (partner_id, application_id, subject_pseudonym_id, claim_id),
  foreign key (policy_id, policy_version) references public.partner_policies(id, version)
);

comment on table public.wallet_scoped_trust_authoritative_evidence is
  'Pre-authorized sovereign evidence bindings for wallet-scoped trust execution.';

commit;
