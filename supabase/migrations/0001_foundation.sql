-- Fase 1: fundação (papéis, pacientes, consultas, auditoria) com RLS.
create type user_role as enum ('patient','nutritionist','admin');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'patient',
  full_name text not null,
  created_at timestamptz not null default now()
);
create table nutritionists (
  id uuid primary key references profiles(id) on delete cascade,
  crn text not null unique
);
create table patients (
  id uuid primary key references profiles(id) on delete cascade,
  nutritionist_id uuid not null references nutritionists(id),
  birth_date date not null,
  biological_sex text not null check (biological_sex in ('male','female')),
  phone text,
  created_at timestamptz not null default now()
);
create index on patients(nutritionist_id);

create table consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  nutritionist_id uuid not null references nutritionists(id),
  consultation_type text not null check (consultation_type in ('initial','follow_up','reassessment','online')),
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled','no_show')),
  record_state text not null default 'draft' check (record_state in ('draft','finalized','amended')),
  scheduled_at timestamptz, started_at timestamptz, completed_at timestamptz,
  clinical_notes text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on consultations(patient_id, scheduled_at desc);
create index on consultations(nutritionist_id);

create table audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid, patient_id uuid, consultation_id uuid,
  action text not null, entity text not null, entity_id text,
  old_value jsonb, new_value jsonb,
  created_at timestamptz not null default now()
);

-- Helpers (security definer evita recursão de RLS)
create function auth_role() returns user_role language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;
create function is_admin() returns boolean language sql stable as $$ select auth_role() = 'admin' $$;

alter table profiles enable row level security;
alter table nutritionists enable row level security;
alter table patients enable row level security;
alter table consultations enable row level security;
alter table audit_logs enable row level security;

create policy profiles_self on profiles for select using (id = auth.uid() or is_admin()
  or exists (select 1 from patients p where p.id = profiles.id and p.nutritionist_id = auth.uid()));
create policy nutri_self on nutritionists for select using (id = auth.uid() or is_admin());

create policy patients_read on patients for select using (id = auth.uid() or nutritionist_id = auth.uid() or is_admin());
create policy patients_write on patients for all using (nutritionist_id = auth.uid() or is_admin())
  with check (nutritionist_id = auth.uid() or is_admin());

create policy consult_read on consultations for select using (patient_id = auth.uid() or nutritionist_id = auth.uid() or is_admin());
-- Consulta finalizada é imutável por UPDATE direto; alterações devem virar 'amended' via função auditada (fases seguintes).
-- o paciente precisa pertencer à carteira do nutricionista que cria a consulta
create policy consult_insert on consultations for insert with check (
  is_admin() or (nutritionist_id = auth.uid() and exists (select 1 from patients p where p.id = patient_id and p.nutritionist_id = auth.uid())));
create policy consult_update on consultations for update using ((nutritionist_id = auth.uid() or is_admin()) and record_state = 'draft');

create policy audit_read on audit_logs for select using (is_admin());
create policy audit_insert on audit_logs for insert with check (user_id = auth.uid());
