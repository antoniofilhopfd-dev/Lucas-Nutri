-- Fase 11: métricas do dashboard (respeitam RLS do chamador).
create view patient_adherence_7d with (security_invoker = true) as
with planned as (
  select d.patient_id, count(m.id)::numeric as meals_per_day
  from diets d join diet_meals m on m.diet_id = d.id where d.status = 'published' group by d.patient_id),
days as (select p.id as patient_id, generate_series(today_br() - 6, today_br(), '1 day')::date as day from patients p where p.active),
logged as (select patient_id, log_date, count(*)::numeric as n from patient_meal_logs group by 1, 2)
select dy.patient_id,
  round(100 * avg(least(1, coalesce(l.n, 0) / nullif(pl.meals_per_day, 0))), 1) as adherence_pct
from days dy join planned pl on pl.patient_id = dy.patient_id left join logged l on l.patient_id = dy.patient_id and l.log_date = dy.day
group by dy.patient_id;

create function nutritionist_dashboard() returns table (active_patients int, avg_adherence numeric, checkins_today int, no_record_48h int, consultations_today int)
language sql stable set search_path = public as $$
  select (select count(*) from patients where active)::int,
         (select round(avg(adherence_pct), 1) from patient_adherence_7d),
         (select count(*) from patient_checkins where checkin_date = today_br())::int,
         (select count(*) from patients_without_record)::int,
         (select count(*) from consultations where (scheduled_at at time zone 'America/Sao_Paulo')::date = today_br() and status in ('scheduled','in_progress'))::int
$$;
grant execute on function nutritionist_dashboard to authenticated;
