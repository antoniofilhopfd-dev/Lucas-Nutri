-- Fase 5: fotometria. Bucket privado, sem URL pública; acesso por Signed URL após checagem de autorização.

create table image_consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id),
  consent_type text not null check (consent_type in ('clinical_use','public_use')),   -- nunca misturados
  consent_version text not null,
  accepted boolean not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on image_consents(patient_id, consent_type, accepted_at desc);
alter table image_consents enable row level security;
create policy ic_read on image_consents for select using (can_read_patient(patient_id));
create policy ic_insert on image_consents for insert with check (patient_id = auth.uid() or is_admin());
create policy ic_revoke on image_consents for update using (patient_id = auth.uid() or is_admin());
create trigger image_consents_audit after insert or update on image_consents for each row execute function audit_row();

-- consentimento clínico vigente?
create function has_clinical_image_consent(pid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from image_consents where patient_id = pid and consent_type = 'clinical_use' and accepted and revoked_at is null) $$;

create table photometric_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  consultation_id uuid not null references consultations(id),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table body_photos (
  id uuid primary key default gen_random_uuid(),
  photometric_assessment_id uuid not null references photometric_assessments(id),
  patient_id uuid not null references patients(id),
  angle text not null check (angle in ('front','right_side','left_side','back')),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/webp','image/jpeg')),
  file_size int not null check (file_size > 0 and file_size <= 5242880),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (photometric_assessment_id, angle)
);
create index on body_photos(patient_id);
alter table photometric_assessments enable row level security;
alter table body_photos enable row level security;
create policy pa_r on photometric_assessments for select using (can_read_patient(patient_id));
create policy pa_i on photometric_assessments for insert with check (can_write_consultation(consultation_id) and has_clinical_image_consent(patient_id));
create policy bp_r on body_photos for select using (can_read_patient(patient_id));
create policy bp_i on body_photos for insert with check (
  has_clinical_image_consent(patient_id)
  and exists (select 1 from photometric_assessments a where a.id = photometric_assessment_id and can_write_consultation(a.consultation_id)));
create trigger pa_audit after insert or update or delete on photometric_assessments for each row execute function audit_row();
create trigger bp_audit after insert or update or delete on body_photos for each row execute function audit_row();

-- Storage privado. Caminho: {patient_id}/{assessment_id}/{angle}.webp — a 1ª pasta é o paciente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-body-photos', 'patient-body-photos', false, 5242880, array['image/webp','image/jpeg'])
on conflict (id) do update set public = false;

create policy photos_read on storage.objects for select
  using (bucket_id = 'patient-body-photos' and can_read_patient(((storage.foldername(name))[1])::uuid));
create policy photos_insert on storage.objects for insert
  with check (bucket_id = 'patient-body-photos' and has_clinical_image_consent(((storage.foldername(name))[1])::uuid)
    and exists (select 1 from patients p where p.id = ((storage.foldername(name))[1])::uuid and (p.nutritionist_id = auth.uid() or p.id = auth.uid() or is_admin())));
-- sem UPDATE/DELETE direto: substituição gera nova foto na avaliação, removida só por rotina auditada.
