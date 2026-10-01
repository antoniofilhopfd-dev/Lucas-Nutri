-- Fase 6: anamnese. A IA propõe (anamnesis_extractions, 'pending'); só itens confirmados/editados viram dado clínico.
create table anamneses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  consultation_id uuid not null references consultations(id),
  raw_text text, transcript text, audio_storage_path text,
  stt_provider text, extractor_provider text,       -- rastreabilidade do que processou
  created_at timestamptz not null default now()
);
create table anamnesis_items (
  id uuid primary key default gen_random_uuid(),
  anamnesis_id uuid not null references anamneses(id),
  patient_id uuid not null references patients(id),
  category text not null check (category in ('sleep','nutrition','gastro','health')),
  field text not null, value text not null,
  source_kind text not null check (source_kind in ('text','audio','manual')), source_snippet text,
  confidence numeric check (confidence between 0 and 1),
  status text not null default 'pending' check (status in ('pending','confirmed','edited','rejected')),
  decided_by uuid, decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index on anamnesis_items(patient_id, status);
alter table anamneses enable row level security; alter table anamnesis_items enable row level security;
create policy an_r on anamneses for select using (can_read_patient(patient_id) and auth_role() <> 'patient');
create policy an_i on anamneses for insert with check (can_write_consultation(consultation_id));
create policy ai_r on anamnesis_items for select using (can_read_patient(patient_id) and auth_role() <> 'patient');
create policy ai_i on anamnesis_items for insert with check (exists (select 1 from anamneses a where a.id = anamnesis_id and can_write_consultation(a.consultation_id)));
create policy ai_u on anamnesis_items for update using (exists (select 1 from anamneses a where a.id = anamnesis_id and can_write_consultation(a.consultation_id)));
create function stamp_decision() returns trigger language plpgsql as $$
begin if new.status <> old.status then new.decided_by := auth.uid(); new.decided_at := now(); end if; return new; end $$;
create trigger ai_decision before update on anamnesis_items for each row execute function stamp_decision();
create trigger an_audit after insert or update on anamneses for each row execute function audit_row();
create trigger ai_audit after insert or update on anamnesis_items for each row execute function audit_row();
-- Dado clínico = somente confirmados/editados
create view anamnesis_confirmed with (security_invoker = true) as select * from anamnesis_items where status in ('confirmed','edited');
