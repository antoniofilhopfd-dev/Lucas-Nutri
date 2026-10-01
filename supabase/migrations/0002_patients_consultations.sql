-- Fase 2: cadastro do paciente, dados de saúde segregados, consentimentos, auditoria e imutabilidade de consultas.

alter table patients
  add column preferred_name text,
  add column gender_identity text,        -- opcional; nunca usado em fórmulas
  add column sexual_orientation text,     -- opcional; nunca usado em fórmulas
  add column ethnicity text,              -- opcional; nunca usado em fórmulas
  add column occupation text,
  add column email text,
  add column whatsapp text,
  add column address jsonb,               -- opcional (minimização)
  add column practices_sports boolean not null default false,
  add column modalities text[] not null default '{}',
  add column primary_modality text,
  add column weekly_frequency smallint check (weekly_frequency between 0 and 14),
  add column usual_training_time text,
  add column primary_goal text check (primary_goal in ('weight_loss','hypertrophy','performance','recomposition','maintenance','health','other')),
  add column secondary_goals text[] not null default '{}',
  add column active boolean not null default true;

-- Dados de saúde em tabela própria (política mais restrita que o cadastro geral)
create table patient_health_data (
  patient_id uuid primary key references patients(id) on delete cascade,
  chief_complaint text, clinical_history text, reported_conditions text[] not null default '{}',
  family_history text, medications text, supplements text,
  allergies text[] not null default '{}', intolerances text[] not null default '{}',
  relevant_exams text,
  updated_at timestamptz not null default now()
);
alter table patient_health_data enable row level security;
create policy health_read on patient_health_data for select
  using (patient_id = auth.uid() or is_admin()
    or exists (select 1 from patients p where p.id = patient_id and p.nutritionist_id = auth.uid()));
create policy health_write on patient_health_data for all
  using (is_admin() or exists (select 1 from patients p where p.id = patient_id and p.nutritionist_id = auth.uid()))
  with check (is_admin() or exists (select 1 from patients p where p.id = patient_id and p.nutritionist_id = auth.uid()));

-- Consentimentos independentes por finalidade
create table consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  purpose text not null check (purpose in ('care_data','clinical_images','public_images','communication','terms_of_use')),
  version text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on consents(patient_id, purpose);
alter table consents enable row level security;
create policy consents_read on consents for select
  using (patient_id = auth.uid() or is_admin()
    or exists (select 1 from patients p where p.id = patient_id and p.nutritionist_id = auth.uid()));
create policy consents_insert on consents for insert with check (patient_id = auth.uid() or is_admin());
create policy consents_revoke on consents for update using (patient_id = auth.uid() or is_admin());

-- Auditoria automática (INSERT/UPDATE/DELETE) sem registrar texto clínico livre em logs externos
create function audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid; cid uuid;
begin
  if tg_table_name = 'consultations' then pid := coalesce(new.patient_id, old.patient_id); cid := coalesce(new.id, old.id);
  elsif tg_table_name = 'patients' then pid := coalesce(new.id, old.id);
  else pid := coalesce(new.patient_id, old.patient_id); end if;
  insert into audit_logs(user_id, patient_id, consultation_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), pid, cid, lower(tg_op), tg_table_name,
          coalesce(new.id::text, new.patient_id::text, old.id::text, old.patient_id::text),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger audit_patients after insert or update or delete on patients for each row execute function audit_row();
create trigger audit_health after insert or update or delete on patient_health_data for each row execute function audit_row();
create trigger audit_consultations after insert or update or delete on consultations for each row execute function audit_row();
create trigger audit_consents after insert or update on consents for each row execute function audit_row();

-- Consulta: updated_at + version automáticos; nunca excluir fisicamente (sem policy de DELETE).
create function consultation_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.version := old.version + 1; return new; end $$;
create trigger consultations_touch before update on consultations for each row execute function consultation_touch();

-- Transições controladas: finalizar e emendar passam por funções (RLS bloqueia UPDATE direto após finalizada).
create function finalize_consultation(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update consultations set record_state='finalized', status='completed', completed_at=now()
  where id = p_id and record_state='draft' and (nutritionist_id = auth.uid() or is_admin());
  if not found then raise exception 'consulta não pode ser finalizada'; end if;
end $$;

create table consultation_amendments (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id),
  amended_by uuid not null,
  reason text not null check (length(trim(reason)) >= 5),
  previous_version int not null,
  previous_snapshot jsonb not null,   -- preserva o valor original
  created_at timestamptz not null default now()
);
alter table consultation_amendments enable row level security;
create policy amend_read on consultation_amendments for select
  using (is_admin() or exists (select 1 from consultations c where c.id = consultation_id and c.nutritionist_id = auth.uid()));

create function amend_consultation(p_id uuid, p_reason text, p_notes text) returns void
language plpgsql security definer set search_path = public as $$
declare c consultations;
begin
  select * into c from consultations where id = p_id and record_state in ('finalized','amended')
    and (nutritionist_id = auth.uid() or is_admin());
  if not found then raise exception 'consulta não pode ser emendada'; end if;
  insert into consultation_amendments(consultation_id, amended_by, reason, previous_version, previous_snapshot)
  values (p_id, auth.uid(), p_reason, c.version, to_jsonb(c));
  update consultations set clinical_notes = p_notes, record_state = 'amended' where id = p_id;
end $$;
revoke execute on function finalize_consultation, amend_consultation from public, anon;
grant execute on function finalize_consultation, amend_consultation to authenticated;
