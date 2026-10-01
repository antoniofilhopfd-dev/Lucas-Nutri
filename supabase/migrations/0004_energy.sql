-- Fase 4: gasto energético e estratégia. Registro reproduzível (inputs/outputs jsonb + versão da equação).
create table energy_calculations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  consultation_id uuid not null references consultations(id),
  equation text not null, equation_version text not null,
  method text not null check (method in ('factorial','detailed')),
  tef numeric(4,3),                         -- configurável, armazenado no cálculo
  inputs jsonb not null, outputs jsonb not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table caloric_strategies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  consultation_id uuid not null references consultations(id),
  energy_calculation_id uuid not null references energy_calculations(id),
  strategy_type text not null check (strategy_type in ('maintenance','percent','absolute')),
  strategy_value numeric, get_kcal numeric not null, vet_kcal numeric not null check (vet_kcal > 0),
  macro_mode text check (macro_mode in ('percent','g_per_kg')),
  macro_inputs jsonb, macro_outputs jsonb,
  created_at timestamptz not null default now()
);
create index on energy_calculations(patient_id, created_at desc);
create index on caloric_strategies(patient_id, created_at desc);
do $$ declare t text; begin
  foreach t in array array['energy_calculations','caloric_strategies'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (can_read_patient(patient_id))', t||'_r', t);
    execute format('create policy %I on %I for insert with check (can_write_consultation(consultation_id))', t||'_i', t);
    execute format('create trigger %I after insert or update or delete on %I for each row execute function audit_row()', t||'_audit', t);
  end loop;
end $$;
-- Sem UPDATE/DELETE: um novo cálculo é uma nova linha; o histórico nunca é recalculado.
