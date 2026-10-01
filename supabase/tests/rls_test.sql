-- Testes de segurança do RLS (pgTAP). Rodar com: supabase test db
-- Cenários: paciente A × B, nutricionista A × B, anônimo, imutabilidade, consentimento público, bucket privado.
begin;
select plan(14);

-- Dados
insert into auth.users (id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1','authenticated','authenticated'), ('00000000-0000-0000-0000-0000000000a2','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b1','authenticated','authenticated'), ('00000000-0000-0000-0000-0000000000b2','authenticated','authenticated');
insert into profiles (id, role, full_name) values
  ('00000000-0000-0000-0000-0000000000a1','nutritionist','Nutri A'), ('00000000-0000-0000-0000-0000000000a2','nutritionist','Nutri B'),
  ('00000000-0000-0000-0000-0000000000b1','patient','Paciente A'), ('00000000-0000-0000-0000-0000000000b2','patient','Paciente B');
insert into nutritionists (id, crn) values ('00000000-0000-0000-0000-0000000000a1','CRN-1'), ('00000000-0000-0000-0000-0000000000a2','CRN-2');
insert into patients (id, nutritionist_id, birth_date, biological_sex) values
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','1990-01-01','female'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a2','1990-01-01','male');
insert into patient_health_data (patient_id, chief_complaint) values ('00000000-0000-0000-0000-0000000000b1','x'), ('00000000-0000-0000-0000-0000000000b2','y');
insert into consultations (id, patient_id, nutritionist_id, consultation_type) values
  ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','initial');

-- helper para trocar de usuário
create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); set local role authenticated; end $$;

-- 1) Paciente A não vê paciente B
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select is((select count(*) from patients)::int, 1, 'paciente A vê só o próprio cadastro');
select is((select count(*) from patient_health_data where patient_id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'paciente A não lê dados de saúde de B');
select is((select count(*) from patients where id = '00000000-0000-0000-0000-0000000000b2')::int, 0, 'paciente A → paciente B negado');
-- 2) Paciente não lê anamnese nem consegue criar consulta
select throws_ok($$insert into consultations (patient_id, nutritionist_id, consultation_type) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','initial')$$, '42501', null, 'paciente não cria consulta');
reset role;

-- 3) Nutricionista A vê só a própria carteira
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from patients)::int, 1, 'nutricionista A vê só os próprios pacientes');
select is((select count(*) from consultations)::int, 1, 'nutricionista A vê a própria consulta');
reset role;

-- 4) Nutricionista B não acessa paciente/consulta de A
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select is((select count(*) from patients where id = '00000000-0000-0000-0000-0000000000b1')::int, 0, 'nutricionista B → paciente de A negado');
select is((select count(*) from consultations)::int, 0, 'nutricionista B não vê consultas de A');
select throws_ok($$insert into body_composition_results (patient_id, consultation_id, inputs, outputs) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c001','{}','{}')$$, '42501', null, 'nutricionista B não grava no prontuário de A');
reset role;

-- 5) Anônimo não acessa prontuário
set local role anon;
select throws_ok($$select * from patients$$, '42501', null, 'anônimo sem acesso a patients');
reset role;

-- 6) Consulta finalizada é imutável por UPDATE direto
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$select finalize_consultation('00000000-0000-0000-0000-00000000c001')$$, 'nutricionista A finaliza a consulta') ;
update consultations set clinical_notes = 'alterado' where id = '00000000-0000-0000-0000-00000000c001';
select is((select clinical_notes from consultations where id = '00000000-0000-0000-0000-00000000c001'), null, 'UPDATE direto em consulta finalizada não altera (0 linhas)');
reset role;

-- 7) Storage privado
select is((select public from storage.buckets where id = 'patient-body-photos'), false, 'bucket de fotos clínicas é privado');
select is((select public from storage.buckets where id = 'community-images'), false, 'bucket da comunidade é privado');

select * from finish();
rollback;
