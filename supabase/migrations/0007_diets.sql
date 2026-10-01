-- Fase 7: dieta versionada. Base de alimentos com fonte/licença; paciente só enxerga a versão publicada.
create table food_database (
  id uuid primary key default gen_random_uuid(),
  name text not null, source text not null, source_version text not null, license text not null,
  serving_unit text not null default 'g' check (serving_unit in ('g','ml')),
  calories numeric not null check (calories >= 0), protein numeric not null, carbohydrate numeric not null, fat numeric not null,
  fiber numeric, sodium numeric, micronutrients jsonb,
  unique (name, source, source_version)
);
alter table food_database enable row level security;
create policy food_read on food_database for select using (auth.uid() is not null);
create policy food_write on food_database for all using (is_admin()) with check (is_admin());

create table diets (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  consultation_id uuid not null references consultations(id),
  version int not null default 1,
  parent_id uuid references diets(id),
  status text not null default 'draft' check (status in ('draft','reviewed','finalized','published','superseded')),
  notes text, vet_kcal numeric,
  created_by uuid not null default auth.uid(),
  published_at timestamptz, created_at timestamptz not null default now(),
  unique (patient_id, version)
);
create unique index one_published_per_patient on diets(patient_id) where status = 'published';
create table diet_meals (
  id uuid primary key default gen_random_uuid(),
  diet_id uuid not null references diets(id) on delete cascade,
  name text not null, meal_time time, position int not null default 0, notes text
);
create table diet_foods (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references diet_meals(id) on delete cascade,
  food_id uuid not null references food_database(id),
  quantity numeric not null check (quantity >= 0), household_measure text, notes text,
  substitution_for uuid references diet_foods(id)      -- substituições apontam para o item original
);
create index on diets(patient_id, status); create index on diet_meals(diet_id); create index on diet_foods(meal_id);

create function diet_owner_ok(did uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from diets d join patients p on p.id = d.patient_id where d.id = did and (p.nutritionist_id = auth.uid() or is_admin())) $$;
create function diet_editable(did uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from diets d where d.id = did and d.status in ('draft','reviewed')) and diet_owner_ok(did) $$;
create function diet_visible(did uuid) returns boolean language sql stable security definer set search_path = public as $$
  select diet_owner_ok(did) or exists (select 1 from diets d where d.id = did and d.patient_id = auth.uid() and d.status = 'published') $$;

alter table diets enable row level security; alter table diet_meals enable row level security; alter table diet_foods enable row level security;
create policy diets_r on diets for select using (diet_owner_ok(id) or (patient_id = auth.uid() and status = 'published'));
create policy diets_i on diets for insert with check (can_write_consultation(consultation_id) and status = 'draft');
create policy diets_u on diets for update using (diet_owner_ok(id)) with check (diet_owner_ok(id));
create policy meals_r on diet_meals for select using (diet_visible(diet_id));
create policy meals_w on diet_meals for all using (diet_editable(diet_id)) with check (diet_editable(diet_id));
create policy foods_r on diet_foods for select using (exists (select 1 from diet_meals m where m.id = meal_id and diet_visible(m.diet_id)));
create policy foods_w on diet_foods for all using (exists (select 1 from diet_meals m where m.id = meal_id and diet_editable(m.diet_id)))
  with check (exists (select 1 from diet_meals m where m.id = meal_id and diet_editable(m.diet_id)));

-- Transições válidas e imutabilidade do conteúdo após finalizar
create function diets_guard() returns trigger language plpgsql as $$
begin
  if old.status = new.status then
    if old.status in ('finalized','published','superseded') and (new.notes is distinct from old.notes or new.vet_kcal is distinct from old.vet_kcal) then
      raise exception 'dieta % é imutável; crie nova versão', old.status; end if;
    return new; end if;
  if not ((old.status,new.status) in (('draft','reviewed'),('reviewed','draft'),('reviewed','finalized'),('finalized','published'),('published','superseded'))) then
    raise exception 'transição inválida: % → %', old.status, new.status; end if;
  if new.status = 'published' then new.published_at := now(); end if;
  return new;
end $$;
create trigger diets_guard_t before update on diets for each row execute function diets_guard();
create trigger diets_audit after insert or update on diets for each row execute function audit_row();

-- Publicar: aposenta a versão publicada anterior e publica a nova, atomicamente.
create function publish_diet(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare d diets;
begin
  select * into d from diets where id = p_id and status = 'finalized' and diet_owner_ok(id);
  if not found then raise exception 'dieta não pode ser publicada'; end if;
  update diets set status = 'superseded' where patient_id = d.patient_id and status = 'published';
  update diets set status = 'published' where id = p_id;
end $$;
revoke execute on function publish_diet from public, anon; grant execute on function publish_diet to authenticated;
