-- Fase 8: acompanhamento diário. O paciente escreve apenas o próprio dia corrente; equipe autorizada lê.
create function today_br() returns date language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

create table patient_checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  checkin_date date not null default today_br(),
  water_ml int not null default 0 check (water_ml >= 0 and water_ml % 500 = 0),
  water_goal_ml int not null default 3000 check (water_goal_ml > 0 and water_goal_ml % 500 = 0),
  trained boolean, training_modality text, training_minutes int check (training_minutes between 1 and 600),
  updated_at timestamptz not null default now(),
  unique (patient_id, checkin_date),
  check (trained is not true or (training_modality is not null and training_minutes is not null))
);
create table patient_meal_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  log_date date not null default today_br(),
  meal_type text not null check (meal_type in ('breakfast','lunch','afternoon_snack','dinner','supper')),
  photo_path text,                                  -- bucket privado patient-meal-photos
  feeling_before text check (feeling_before in ('anxious','very_hungry','calm','stressed','not_hungry','other')),
  feeling_after text check (feeling_after in ('satisfied','bloated','guilty','energized','still_hungry','other')),
  logged_at timestamptz not null default now()
);
create index on patient_checkins(patient_id, checkin_date desc);
create index on patient_meal_logs(patient_id, log_date desc);
alter table patient_checkins enable row level security; alter table patient_meal_logs enable row level security;

create policy ck_r on patient_checkins for select using (can_read_patient(patient_id));
create policy ck_i on patient_checkins for insert with check (patient_id = auth.uid() and checkin_date = today_br());
create policy ck_u on patient_checkins for update using (patient_id = auth.uid() and checkin_date = today_br()) with check (patient_id = auth.uid() and checkin_date = today_br());
create policy ml_r on patient_meal_logs for select using (can_read_patient(patient_id));
create policy ml_i on patient_meal_logs for insert with check (patient_id = auth.uid() and log_date = today_br());
create policy ml_u on patient_meal_logs for update using (patient_id = auth.uid() and log_date = today_br());
create trigger ck_audit after insert or update on patient_checkins for each row execute function audit_row();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-meal-photos','patient-meal-photos', false, 5242880, array['image/webp','image/jpeg']) on conflict (id) do update set public = false;
create policy meal_photos_rw on storage.objects for all
  using (bucket_id = 'patient-meal-photos' and can_read_patient(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'patient-meal-photos' and ((storage.foldername(name))[1])::uuid = auth.uid());

-- Pacientes sem registro há mais de 48 h (dashboard do nutricionista); respeita RLS do chamador.
create view patients_without_record with (security_invoker = true) as
select p.id as patient_id, greatest(max(c.updated_at), max(m.logged_at)) as last_record_at
from patients p left join patient_checkins c on c.patient_id = p.id left join patient_meal_logs m on m.patient_id = p.id
where p.active group by p.id
having greatest(max(c.updated_at), max(m.logged_at)) is null or greatest(max(c.updated_at), max(m.logged_at)) < now() - interval '48 hours';
