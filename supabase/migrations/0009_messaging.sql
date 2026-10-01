-- Fase 9: chat privado paciente ↔ nutricionista e micro-feedback.
create table messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  sender_id uuid not null default auth.uid(), receiver_id uuid not null,
  kind text not null check (kind in ('text','audio')),
  body text, audio_path text, duration_s numeric,
  sent_at timestamptz not null default now(), read_at timestamptz,
  check ((kind = 'text' and body is not null) or (kind = 'audio' and audio_path is not null)),
  check (sender_id = patient_id or receiver_id = patient_id)
);
create index on messages(patient_id, sent_at desc);
alter table messages enable row level security;
-- participantes apenas: o paciente da conversa e o nutricionista responsável (ou admin)
create policy msg_r on messages for select using (sender_id = auth.uid() or receiver_id = auth.uid() or is_admin());
create policy msg_i on messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from patients p where p.id = patient_id
    and ((p.id = auth.uid() and receiver_id = p.nutritionist_id) or (p.nutritionist_id = auth.uid() and receiver_id = p.id))));
-- marcar como lida: somente o destinatário, somente read_at
create function mark_read(p_ids uuid[]) returns void language sql security definer set search_path = public as $$
  update messages set read_at = now() where id = any(p_ids) and receiver_id = auth.uid() and read_at is null $$;
revoke execute on function mark_read from public, anon; grant execute on function mark_read to authenticated;

create table micro_feedback (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  nutritionist_id uuid not null default auth.uid(),
  target_type text not null check (target_type in ('photo','checkin','meal')), target_id uuid not null,
  kind text not null check (kind in ('text','audio','badge')),
  body text, audio_path text,
  badge text check (badge in ('good_consistency','excellent_hydration','workout_done','good_choice','consistent_week')),
  created_at timestamptz not null default now(),
  check ((kind='text' and body is not null) or (kind='audio' and audio_path is not null) or (kind='badge' and badge is not null))
);
alter table micro_feedback enable row level security;
create policy mf_r on micro_feedback for select using (can_read_patient(patient_id));
create policy mf_i on micro_feedback for insert with check (nutritionist_id = auth.uid() and exists (select 1 from patients p where p.id = patient_id and p.nutritionist_id = auth.uid()));
create trigger msg_audit after insert on messages for each row execute function audit_row();
