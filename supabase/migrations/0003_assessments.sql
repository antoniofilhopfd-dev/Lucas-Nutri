-- Fase 3: avaliação física. Toda linha tem patient_id (+ consultation_id) e só é gravável com consulta em rascunho.

create table clinical_calculation_versions (
  formula_id text not null, version text not null,
  name text not null, author text, year int, population text, equation text, reference text not null,
  effective_date date not null,
  review_status text not null check (review_status in ('approved','pending_review')),
  primary key (formula_id, version)
);
alter table clinical_calculation_versions enable row level security;
create policy formulas_read on clinical_calculation_versions for select using (auth.uid() is not null);

create function can_write_consultation(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from consultations c where c.id = cid and c.record_state = 'draft'
                 and (c.nutritionist_id = auth.uid() or is_admin())) $$;
create function can_read_patient(pid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select pid = auth.uid() or is_admin() or exists (select 1 from patients p where p.id = pid and p.nutritionist_id = auth.uid()) $$;

create table anthropometric_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  consultation_id uuid not null references consultations(id),
  assessment_date date not null,
  age_at_assessment numeric(5,2) not null,    -- idade na data da avaliação, preservada
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  height_cm numeric(5,1) not null check (height_cm > 0),
  bmi numeric, waist_hip_ratio numeric, waist_height_ratio numeric,
  classification_source text, classification_version text,
  created_at timestamptz not null default now()
);
create table circumference_measurements (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references anthropometric_assessments(id),
  patient_id uuid not null references patients(id),
  site text not null,                         -- ex.: biceps_relaxed, waist, hip
  side text check (side in ('right','left','center')),
  value_cm numeric(5,1) not null check (value_cm > 0),
  unique (assessment_id, site, side)
);
create table skinfold_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  consultation_id uuid not null references consultations(id),
  protocol text not null, protocol_version text not null, created_at timestamptz not null default now()
);
create table skinfold_measurements (
  id uuid primary key default gen_random_uuid(),
  skinfold_assessment_id uuid not null references skinfold_assessments(id),
  patient_id uuid not null references patients(id),
  site text not null, value_mm numeric(4,1) not null check (value_mm > 0),
  unique (skinfold_assessment_id, site)
);
create table body_composition_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  consultation_id uuid not null references consultations(id),
  skinfold_assessment_id uuid references skinfold_assessments(id),
  protocol text, formula_version text, fat_equation text, fat_equation_version text,
  inputs jsonb not null, outputs jsonb not null,   -- reconstrução exata do cálculo
  created_at timestamptz not null default now()
);
create index on anthropometric_assessments(patient_id, assessment_date desc);
create index on body_composition_results(patient_id, created_at desc);

do $$ declare t text; begin
  foreach t in array array['anthropometric_assessments','circumference_measurements','skinfold_assessments','skinfold_measurements','body_composition_results'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (can_read_patient(patient_id))', t||'_r', t);
    execute format('create trigger %I after insert or update or delete on %I for each row execute function audit_row()', t||'_audit', t);
  end loop;
end $$;
-- escrita: só com consulta em rascunho (tabelas com consultation_id)
do $$ declare t text; begin
  foreach t in array array['anthropometric_assessments','skinfold_assessments','body_composition_results'] loop
    execute format('create policy %I on %I for insert with check (can_write_consultation(consultation_id))', t||'_i', t);
  end loop;
end $$;
-- tabelas filhas herdam a regra da avaliação-mãe
create policy circ_i on circumference_measurements for insert with check (exists (select 1 from anthropometric_assessments a where a.id = assessment_id and can_write_consultation(a.consultation_id)));
create policy skm_i on skinfold_measurements for insert with check (exists (select 1 from skinfold_assessments a where a.id = skinfold_assessment_id and can_write_consultation(a.consultation_id)));
-- sem policies de UPDATE/DELETE: correções após finalização passam por emenda auditada.
