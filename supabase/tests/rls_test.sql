-- Testes de segurança (RLS/RBAC/imutabilidade) em SQL puro. Falha com EXCEPTION no primeiro erro.
-- Local:  psql -d bn -f supabase/tests/shim.sql && for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d bn -f $f; done
--         psql -v ON_ERROR_STOP=1 -d bn -f supabase/tests/rls_test.sql
begin;
create function pg_temp.ok(descr text, cond boolean) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FALHOU: %', descr; end if; raise notice 'ok  - %', descr; end $$;
create function pg_temp.affects_one(descr text, stmt text) returns void language plpgsql as $$
declare n int;
begin execute stmt; get diagnostics n = row_count; if n <> 1 then raise exception 'FALHOU: % (linhas: %)', descr, n; end if; raise notice 'ok  - %', descr; end $$;
create function pg_temp.lives(descr text, stmt text) returns void language plpgsql as $$
begin execute stmt; raise notice 'ok  - %', descr; exception when others then raise exception 'FALHOU: % (%)', descr, sqlerrm; end $$;
create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); execute 'set local role authenticated'; end $$;
create function pg_temp.denied(descr text, stmt text) returns void language plpgsql as $$
declare n int;
begin
  begin execute stmt; get diagnostics n = row_count; if n > 0 then raise exception 'FALHOU (permitido): %', descr; end if;
  exception when insufficient_privilege or check_violation or raise_exception or foreign_key_violation or not_null_violation then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  raise notice 'ok  - negado: %', descr;
end $$;

-- ===== Dados (como superusuário)
\set NA '00000000-0000-0000-0000-0000000000a1'
\set NB '00000000-0000-0000-0000-0000000000a2'
\set PA '00000000-0000-0000-0000-0000000000b1'
\set PB '00000000-0000-0000-0000-0000000000b2'
\set AD '00000000-0000-0000-0000-0000000000ff'
\set CA '00000000-0000-0000-0000-00000000c001'
insert into auth.users (id, aud, role) values (:'NA','authenticated','authenticated'),(:'NB','authenticated','authenticated'),(:'PA','authenticated','authenticated'),(:'PB','authenticated','authenticated'),(:'AD','authenticated','authenticated');
insert into profiles (id, role, full_name) values (:'NA','nutritionist','Nutri A'),(:'NB','nutritionist','Nutri B'),(:'PA','patient','Paciente Alfa Silva'),(:'PB','patient','Paciente Beta Souza'),(:'AD','admin','Admin');
insert into nutritionists (id, crn) values (:'NA','CRN-1'),(:'NB','CRN-2');
insert into patients (id, nutritionist_id, birth_date, biological_sex, preferred_name) values (:'PA',:'NA','1990-01-01','female','Alfa'),(:'PB',:'NB','1990-01-01','male',null);
insert into patient_health_data (patient_id, chief_complaint) values (:'PA','queixa A'),(:'PB','queixa B');
insert into consultations (id, patient_id, nutritionist_id, consultation_type) values (:'CA',:'PA',:'NA','initial');
insert into image_consents (patient_id, consent_type, consent_version, accepted) values (:'PA','clinical_use','1.0',true);
insert into messages (patient_id, sender_id, receiver_id, kind, body) values (:'PA',:'PA',:'NA','text','oi');
insert into community_posts (community_id, author_id, kind, body) values (:'NA',:'PA','tip','dica de A'),(:'NB',:'PB','tip','dica de B');

-- ===== Paciente A
select pg_temp.as_user(:'PA');
select pg_temp.ok('paciente A vê só o próprio cadastro', (select count(*) from patients) = 1);
select pg_temp.ok('paciente A não vê paciente B', (select count(*) from patients where id = :'PB') = 0);
select pg_temp.ok('paciente A não vê saúde de B', (select count(*) from patient_health_data where patient_id = :'PB') = 0);
select pg_temp.ok('paciente A vê a própria consulta', (select count(*) from consultations) = 1);
select pg_temp.ok('paciente A não lê perfil de outros', (select count(*) from profiles where id = :'PB') = 0);
select pg_temp.denied('paciente cria consulta', format($$insert into consultations (patient_id, nutritionist_id, consultation_type) values (%L,%L,'initial')$$, :'PA', :'NA'));
select pg_temp.denied('paciente envia msg a nutricionista de B', format($$insert into messages (patient_id, sender_id, receiver_id, kind, body) values (%L,%L,%L,'text','x')$$, :'PA', :'PA', :'NB'));
select pg_temp.denied('paciente se passa por outro remetente', format($$insert into messages (patient_id, sender_id, receiver_id, kind, body) values (%L,%L,%L,'text','x')$$, :'PA', :'PB', :'NA'));
select pg_temp.affects_one('paciente A envia msg ao próprio nutricionista', $q$insert into messages (patient_id, sender_id, receiver_id, kind, body) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','text','dúvida')$q$);
select pg_temp.denied('paciente grava check-in de ontem', format($$insert into patient_checkins (patient_id, checkin_date) values (%L, today_br() - 1)$$, :'PA'));
select pg_temp.denied('paciente grava check-in de B', format($$insert into patient_checkins (patient_id) values (%L)$$, :'PB'));
select pg_temp.affects_one('paciente grava o próprio check-in de hoje', $q$insert into patient_checkins (patient_id, water_ml) values ('00000000-0000-0000-0000-0000000000b1', 500)$q$);
select pg_temp.denied('paciente cria publicação oficial', format($$insert into community_posts (community_id, author_id, kind, body) values (%L,%L,'official','x')$$, :'NA', :'PA'));
select pg_temp.denied('paciente publica em comunidade alheia', format($$insert into community_posts (community_id, author_id, kind, body) values (%L,%L,'tip','x')$$, :'NB', :'PA'));
select pg_temp.denied('paciente publica foto sem consentimento público', format($$insert into community_posts (community_id, author_id, kind, body, image_path) values (%L,%L,'meal','x','community-images/p/1.webp')$$, :'NA', :'PA'));
select pg_temp.ok('paciente A vê só posts da comunidade do seu nutricionista', (select count(*) from community_posts) = 1);
reset role;

-- ===== Consentimento público libera foto; clínico nunca basta
insert into image_consents (patient_id, consent_type, consent_version, accepted) values (:'PA','public_use','1.0',true);
select pg_temp.as_user(:'PA');
select pg_temp.affects_one('com consentimento público a foto é aceita', $q$insert into community_posts (community_id, author_id, kind, body, image_path) values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','meal','prato','community-images/p/1.webp')$q$);
select pg_temp.denied('foto clínica não pode ir ao feed', format($$insert into community_posts (community_id, author_id, kind, body, image_path) values (%L,%L,'meal','x','patient-body-photos/p/a/front.webp')$$, :'NA', :'PA'));
reset role;

-- ===== Nutricionista A
select pg_temp.as_user(:'NA');
select pg_temp.ok('nutri A vê só a própria carteira', (select count(*) from patients) = 1);
select pg_temp.ok('nutri A lê saúde do próprio paciente', (select count(*) from patient_health_data) = 1);
select pg_temp.ok('nutri A recebe a mensagem', (select count(*) from messages where receiver_id = :'NA') = 2);
select pg_temp.affects_one('nutri A grava avaliação em consulta rascunho', $q$insert into anthropometric_assessments (patient_id, consultation_id, assessment_date, age_at_assessment, weight_kg, height_cm) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c001', current_date, 35, 66.9, 168)$q$);
select pg_temp.affects_one('nutri A oculta post (moderação)', $q$update community_posts set status='hidden' where body = 'dica de A'$q$);
select pg_temp.denied('nutri A edita post da comunidade de B', format($$update community_posts set status='hidden' where community_id = %L$$, :'NB'));
reset role;

-- ===== Nutricionista B (acesso cruzado)
select pg_temp.as_user(:'NB');
select pg_temp.ok('nutri B não vê paciente de A', (select count(*) from patients where id = :'PA') = 0);
select pg_temp.ok('nutri B não vê consultas de A', (select count(*) from consultations) = 0);
select pg_temp.ok('nutri B não vê avaliações de A', (select count(*) from anthropometric_assessments) = 0);
select pg_temp.ok('nutri B não lê mensagens de A', (select count(*) from messages) = 0);
select pg_temp.ok('nutri B não vê saúde de A', (select count(*) from patient_health_data where patient_id = :'PA') = 0);
select pg_temp.denied('nutri B grava no prontuário de A', format($$insert into body_composition_results (patient_id, consultation_id, inputs, outputs) values (%L,%L,'{}','{}')$$, :'PA', :'CA'));
select pg_temp.denied('nutri B cria consulta para paciente de A', format($$insert into consultations (patient_id, nutritionist_id, consultation_type) values (%L,%L,'initial')$$, :'PA', :'NB'));
select pg_temp.denied('nutri B envia mensagem ao paciente de A', format($$insert into messages (patient_id, sender_id, receiver_id, kind, body) values (%L,%L,%L,'text','x')$$, :'PA', :'NB', :'PA'));
select pg_temp.denied('nutri B não vê foto/consentimento de A', format($$update image_consents set revoked_at = now() where patient_id = %L$$, :'PA'));
reset role;

-- ===== Anônimo
do $$ begin
  set local role anon; perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  if (select count(*) from patients) <> 0 then raise exception 'FALHOU: anônimo viu pacientes'; end if;
  if (select count(*) from consultations) <> 0 then raise exception 'FALHOU: anônimo viu consultas'; end if;
  reset role; raise notice 'ok  - anônimo não vê nenhum prontuário';
end $$;

-- ===== Imutabilidade
select pg_temp.as_user(:'NA');
select pg_temp.lives('nutri A finaliza a consulta', $q$select finalize_consultation('00000000-0000-0000-0000-00000000c001')$q$);
reset role;
select pg_temp.as_user(:'NA');
select pg_temp.denied('UPDATE direto em consulta finalizada', format($$update consultations set clinical_notes='x' where id=%L$$, :'CA'));
select pg_temp.denied('nova avaliação em consulta finalizada', format($$insert into anthropometric_assessments (patient_id, consultation_id, assessment_date, age_at_assessment, weight_kg, height_cm) values (%L,%L,current_date,35,60,170)$$, :'PA', :'CA'));
select pg_temp.lives('emenda preserva o original', $q$select amend_consultation('00000000-0000-0000-0000-00000000c001', 'erro de digitação', 'nota corrigida')$q$);
reset role;
select pg_temp.ok('snapshot original guardado na emenda', (select count(*) from consultation_amendments where consultation_id = :'CA' and previous_snapshot ->> 'record_state' = 'finalized') = 1);
select pg_temp.ok('auditoria registrou as ações', (select count(*) from audit_logs where entity = 'consultations') >= 3);

-- ===== Dieta: paciente só vê a publicada; imutável depois
insert into food_database (id, name, source, source_version, license, calories, protein, carbohydrate, fat) values ('00000000-0000-0000-0000-00000000f001','Alimento teste','teste','1','teste',100,10,10,1);
insert into consultations (id, patient_id, nutritionist_id, consultation_type) values ('00000000-0000-0000-0000-00000000c002',:'PA',:'NA','follow_up');
select pg_temp.as_user(:'NA');
select pg_temp.affects_one('nutri cria dieta rascunho', $q$insert into diets (id, patient_id, consultation_id) values ('00000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000c002')$q$);
reset role;
select pg_temp.as_user(:'PA');
select pg_temp.ok('paciente não vê dieta em rascunho', (select count(*) from diets) = 0);
reset role;
select pg_temp.as_user(:'NA');
update diets set status='reviewed' where id='00000000-0000-0000-0000-00000000d001';
update diets set status='finalized' where id='00000000-0000-0000-0000-00000000d001';
select pg_temp.denied('pular transição finalizada → rascunho', $$update diets set status='draft' where id='00000000-0000-0000-0000-00000000d001'$$);
select pg_temp.lives('publica a dieta', $q$select publish_diet('00000000-0000-0000-0000-00000000d001')$q$);
reset role;
select pg_temp.as_user(:'PA');
select pg_temp.ok('paciente vê a dieta publicada', (select count(*) from diets) = 1);
reset role;
select pg_temp.as_user(:'PB');
select pg_temp.ok('paciente B não vê a dieta de A', (select count(*) from diets) = 0);
reset role;
select pg_temp.as_user(:'NA');
select pg_temp.denied('editar notas de dieta publicada', $$update diets set notes='x' where id='00000000-0000-0000-0000-00000000d001'$$);
reset role;

-- ===== Storage privado
select pg_temp.ok('bucket de fotos clínicas é privado', (select public from storage.buckets where id = 'patient-body-photos') = false);
select pg_temp.ok('bucket de refeições é privado', (select public from storage.buckets where id = 'patient-meal-photos') = false);
select pg_temp.ok('bucket da comunidade é privado', (select public from storage.buckets where id = 'community-images') = false);

-- ===== Admin
select pg_temp.as_user(:'AD');
select pg_temp.ok('admin vê todos os pacientes', (select count(*) from patients) = 2);
reset role;

rollback;
